import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import type { ImportedBidRow } from "@/lib/bid-import";
import type { BidImportActionState } from "@/lib/bid-import-action-state";
import { requireProjectAccess } from "@/server/auth/project-access";
import { db } from "@/server/db/client";
import { analyticsEvents, assetGroups, auditLogs, bids, matchAllocations, matchPlans, partners, projects } from "@/server/db/schema";
import { createBidImportPreviewToken, verifyBidImportPreviewToken } from "./bid-import-preview";
import { countMatchCombinations, MAX_MATCH_COMBINATIONS, MatchingTimeoutError, recommendMatchPlan } from "./matching-engine";
import { validateBidImport } from "./bid-import-validation";

function partnerId(projectId: string, reference: string) {
  return `partner-import-${createHash("sha256").update(`${projectId}:\0${reference}`).digest("hex").slice(0, 24)}`;
}

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

type ImportRequest = {
  projectId: string;
  intent: "preview" | "commit";
  previewToken: string;
  imported: ImportedBidRow[];
  fileHash: string;
  ipHash: string;
};

export async function importProjectBids({ projectId, intent, previewToken, imported, fileHash, ipHash }: ImportRequest): Promise<BidImportActionState> {
  const access = await requireProjectAccess(projectId, ["APPROVER"]);
  if (access.project.status === "CONFIRMED") {
    return { status: "error", message: "확정된 프로젝트의 입찰은 바꿀 수 없습니다." };
  }

  const previewContext = { userId: access.user.id, projectId: projectId, version: access.project.version, fileHash };
  if (intent === "commit" && !verifyBidImportPreviewToken(previewToken, previewContext)) {
    return { status: "error", message: "파일이나 프로젝트가 변경되었거나 미리보기가 만료되었습니다. 다시 미리보기를 확인해 주세요." };
  }

  const assets = await db
    .select({
      id: assetGroups.id,
      name: assetGroups.name,
      quantity: assetGroups.quantity,
      displayOrder: assetGroups.displayOrder,
      minimumRecovery: assetGroups.minimumRecovery,
    })
    .from(assetGroups)
    .where(eq(assetGroups.projectId, projectId));
  const { assetById, covered, partnerEvidence } = validateBidImport(imported, assets);

  const candidates = imported.map((row, index) => ({
    ...row,
    id: `import-${index}`,
    partnerId: partnerId(projectId, row.verificationReference),
    isPartnerVerified: true,
  }));
  const combinationCount = countMatchCombinations(candidates, assets, access.project.assetCount);
  let canImport = Number.isSafeInteger(combinationCount) && combinationCount <= MAX_MATCH_COMBINATIONS;
  let criteriaPassed: boolean | null = null;
  let previewMessage = "계산 가능한 입찰입니다. 교체할 내용을 확인해 주세요.";
  if (canImport) {
    try {
      criteriaPassed = recommendMatchPlan(candidates, access.project, assets).criteriaPassed;
      if (!criteriaPassed) previewMessage = "계산은 가능하지만 현재 확정 조건을 모두 충족하는 조합은 없습니다. 가져온 뒤 조건을 조정하거나 입찰 내용을 보완해 주세요.";
    } catch (error) {
      if (!(error instanceof MatchingTimeoutError)) throw error;
      canImport = false;
      previewMessage = "계산 시간이 허용 범위를 초과했습니다. 자산별 입찰 후보를 줄인 뒤 다시 확인해 주세요.";
    }
  } else {
    previewMessage = `입찰 조합이 ${MAX_MATCH_COMBINATIONS.toLocaleString("ko-KR")}개를 초과합니다. 자산별 후보를 줄인 CSV로 다시 확인해 주세요. 기존 입찰과 배분안은 유지됩니다.`;
  }
  if (intent === "preview") {
    const [[existing], drafts] = await Promise.all([
      db.select({ count: count() }).from(bids).where(eq(bids.projectId, projectId)),
      db.select({ id: matchPlans.id }).from(matchPlans).where(and(eq(matchPlans.projectId, projectId), eq(matchPlans.status, "DRAFT"))),
    ]);
    return { status: "preview", preview: {
      existingBidCount: existing?.count ?? 0,
      incomingBidCount: imported.length,
      partnerCount: partnerEvidence.size,
      assetGroupCount: covered.size,
      invalidatedDraftCount: drafts.length,
      combinationCount: Number.isSafeInteger(combinationCount) ? combinationCount : null,
      combinationLimit: MAX_MATCH_COMBINATIONS,
      canImport,
      criteriaPassed,
      message: previewMessage,
      token: canImport ? createBidImportPreviewToken(previewContext) : "",
      rows: imported.slice(0, 10).map(({ assetGroupName, partnerName, cashRecovery, quantity }) => ({ assetGroupName, partnerName, cashRecovery, quantity })),
    } };
  }
  if (!canImport) return { status: "error", message: previewMessage };

  const now = new Date();
  await db.transaction(async (tx) => {
    const projectUpdate = await tx
      .update(projects)
      .set({ status: "DRAFT", version: sql`${projects.version} + 1`, updatedAt: now })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.version, access.project.version),
          ne(projects.status, "CONFIRMED"),
        ),
      )
      .returning({ id: projects.id });
    if (projectUpdate.length !== 1) throw new Error("PROJECT_VERSION_CONFLICT");

    const drafts = await tx
      .select({ id: matchPlans.id })
      .from(matchPlans)
      .where(and(eq(matchPlans.projectId, projectId), eq(matchPlans.status, "DRAFT")));
    const draftIds = drafts.map((draft) => draft.id);
    if (draftIds.length > 0) {
      await tx.delete(matchAllocations).where(inArray(matchAllocations.matchPlanId, draftIds));
      await tx.delete(matchPlans).where(and(inArray(matchPlans.id, draftIds), eq(matchPlans.status, "DRAFT")));
    }
    await tx.delete(bids).where(eq(bids.projectId, projectId));

    const partnerValues = [...partnerEvidence.entries()].map(([reference, row]) => ({
      id: partnerId(projectId, reference),
      name: row.partnerName,
      type: row.partnerType,
      verificationLabel: row.verificationLabel,
      verificationReference: reference,
      verifiedAt: now,
      verifiedBy: access.user.id,
      verificationExpiresAt: row.verificationExpiresAt,
      isVerified: true,
    }));
    // Bound each statement; update existing evidence without one request per partner.
    for (const batch of chunks(partnerValues, 50)) {
      await tx.insert(partners).values(batch).onConflictDoUpdate({
        target: partners.id,
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          verificationLabel: sql`excluded.verification_label`,
          verificationReference: sql`excluded.verification_reference`,
          verifiedAt: sql`excluded.verified_at`,
          verifiedBy: sql`excluded.verified_by`,
          verificationExpiresAt: sql`excluded.verification_expires_at`,
          isVerified: sql`excluded.is_verified`,
        },
      });
    }

    const bidValues = imported.map((row) => ({
      id: randomUUID(),
      projectId: projectId,
      assetGroupId: row.assetGroupId,
      partnerId: partnerId(projectId, row.verificationReference),
      slot: `G${assetById.get(row.assetGroupId)?.displayOrder ?? 0}`,
      quantity: row.quantity,
      cashRecovery: row.cashRecovery,
      costSavings: row.costSavings,
      reuseQuantity: row.reuseQuantity,
      performanceLabel: row.performanceLabel,
      performanceRate: row.performanceRate,
      pickupDate: row.pickupDate,
      submittedAt: now,
    }));
    for (const batch of chunks(bidValues, 50)) await tx.insert(bids).values(batch);

    await tx.insert(auditLogs).values({
      id: randomUUID(),
      actorUserId: access.user.id,
      action: "BIDS_IMPORTED",
      entityType: "PROJECT",
      entityId: projectId,
      ipHash,
      metadataJson: JSON.stringify({
        bidCount: imported.length,
        partnerCount: partnerValues.length,
        assetGroupCount: covered.size,
        draftInvalidated: draftIds.length > 0,
      }),
    });
    await tx.insert(analyticsEvents).values({
      id: randomUUID(),
      userId: access.user.id,
      projectId: projectId,
      name: "bids_imported",
      propertiesJson: JSON.stringify({ bidCount: imported.length, assetGroupCount: covered.size }),
    });
  });

  return { status: "success", message: `확인 자료가 포함된 인수처 입찰 ${imported.length.toLocaleString("ko-KR")}건을 가져왔습니다. 이제 배분안을 계산할 수 있습니다.` };
}
