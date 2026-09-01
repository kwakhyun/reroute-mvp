"use server";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BID_IMPORT_MAX_BYTES,
  BidImportError,
  parseBidCsv,
} from "@/lib/bid-import";
import type { BidImportActionState } from "@/lib/bid-import-action-state";
import { toSeoulDateKey } from "@/lib/date";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { requireProjectAccess } from "@/server/auth/project-access";
import { db } from "@/server/db/client";
import {
  analyticsEvents,
  assetGroups,
  auditLogs,
  bids,
  matchAllocations,
  matchPlans,
  partners,
  projects,
} from "@/server/db/schema";
import { logger } from "@/server/observability/logger";
import { getRequestIpHash } from "@/server/security/request";

const importSchema = z.object({ projectId: z.string().min(1) });

function partnerId(projectId: string, reference: string) {
  return `partner-import-${createHash("sha256").update(`${projectId}:\0${reference}`).digest("hex").slice(0, 24)}`;
}

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

export async function importBidsAction(
  _state: BidImportActionState,
  formData: FormData,
): Promise<BidImportActionState> {
  const parsed = importSchema.safeParse(Object.fromEntries(formData));
  const file = formData.get("bidFile");
  if (!parsed.success) return { status: "error", message: "프로젝트 정보를 확인해 주세요." };
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "입찰 CSV 파일을 선택해 주세요." };
  }
  if (file.size > BID_IMPORT_MAX_BYTES) {
    return { status: "error", message: "입찰 CSV는 5MB 이하여야 합니다." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { status: "error", message: "CSV 형식의 파일만 가져올 수 있습니다." };
  }

  let imported;
  try {
    imported = parseBidCsv(await file.text());
  } catch (error) {
    if (error instanceof BidImportError) return { status: "error", message: error.message };
    return { status: "error", message: "CSV 파일을 읽지 못했습니다." };
  }

  try {
    const [access, ipHash] = await Promise.all([
      requireProjectAccess(parsed.data.projectId, ["APPROVER"]),
      getRequestIpHash(),
    ]);
    if (access.project.status === "CONFIRMED") {
      return { status: "error", message: "확정된 프로젝트의 입찰은 바꿀 수 없습니다." };
    }

    const assets = await db
      .select({
        id: assetGroups.id,
        name: assetGroups.name,
        quantity: assetGroups.quantity,
        displayOrder: assetGroups.displayOrder,
      })
      .from(assetGroups)
      .where(eq(assetGroups.projectId, parsed.data.projectId));
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const covered = new Set<string>();
    const assetPartnerPairs = new Set<string>();
    const partnerEvidence = new Map<string, (typeof imported)[number]>();

    for (const row of imported) {
      const asset = assetById.get(row.assetGroupId);
      if (!asset || asset.name !== row.assetGroupName || asset.quantity !== row.quantity) {
        return {
          status: "error",
          message: `자산군 ${row.assetGroupName}의 ID, 이름, 전체 수량이 현재 프로젝트와 일치하지 않습니다.`,
        };
      }
      if (/^REPLACE(?:_|:)/i.test(row.verificationReference) || /^REPLACE(?:_|:)/i.test(row.partnerName)) {
        return { status: "error", message: "템플릿의 수요처와 검증 근거 예시를 실제 확인값으로 바꿔 주세요." };
      }
      if (row.verificationExpiresAt && toSeoulDateKey(row.verificationExpiresAt) < toSeoulDateKey(new Date())) {
        return { status: "error", message: `${row.partnerName}의 검증 근거가 만료되었습니다.` };
      }
      const pair = `${row.assetGroupId}:${row.verificationReference}`;
      if (assetPartnerPairs.has(pair)) {
        return { status: "error", message: `${row.assetGroupName}에 ${row.partnerName} 입찰이 중복되었습니다.` };
      }
      assetPartnerPairs.add(pair);
      covered.add(row.assetGroupId);

      const existingEvidence = partnerEvidence.get(row.verificationReference);
      if (
        existingEvidence &&
        (existingEvidence.partnerName !== row.partnerName || existingEvidence.partnerType !== row.partnerType)
      ) {
        return { status: "error", message: `검증 근거 ${row.verificationReference}가 서로 다른 수요처에 사용되었습니다.` };
      }
      partnerEvidence.set(row.verificationReference, row);
    }

    if (covered.size !== assets.length) {
      const missing = assets.filter((asset) => !covered.has(asset.id)).map((asset) => asset.name);
      return { status: "error", message: `모든 자산군에 하나 이상의 입찰이 필요합니다. 누락: ${missing.join(", ")}` };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      const projectUpdate = await tx
        .update(projects)
        .set({ status: "DRAFT", version: sql`${projects.version} + 1`, updatedAt: now })
        .where(
          and(
            eq(projects.id, parsed.data.projectId),
            eq(projects.version, access.project.version),
            ne(projects.status, "CONFIRMED"),
          ),
        )
        .returning({ id: projects.id });
      if (projectUpdate.length !== 1) throw new Error("PROJECT_VERSION_CONFLICT");

      const drafts = await tx
        .select({ id: matchPlans.id })
        .from(matchPlans)
        .where(and(eq(matchPlans.projectId, parsed.data.projectId), eq(matchPlans.status, "DRAFT")));
      const draftIds = drafts.map((draft) => draft.id);
      if (draftIds.length > 0) {
        await tx.delete(matchAllocations).where(inArray(matchAllocations.matchPlanId, draftIds));
        await tx.delete(matchPlans).where(and(inArray(matchPlans.id, draftIds), eq(matchPlans.status, "DRAFT")));
      }
      await tx.delete(bids).where(eq(bids.projectId, parsed.data.projectId));

      const partnerValues = [...partnerEvidence.entries()].map(([reference, row]) => ({
        id: partnerId(parsed.data.projectId, reference),
        name: row.partnerName,
        type: row.partnerType,
        verificationLabel: row.verificationLabel,
        verificationReference: reference,
        verifiedAt: now,
        verifiedBy: access.user.id,
        verificationExpiresAt: row.verificationExpiresAt,
        isVerified: true,
      }));
      await tx.insert(partners).values(partnerValues).onConflictDoNothing();
      for (const partner of partnerValues) {
        await tx
          .update(partners)
          .set({
            name: partner.name,
            type: partner.type,
            verificationLabel: partner.verificationLabel,
            verificationReference: partner.verificationReference,
            verifiedAt: partner.verifiedAt,
            verifiedBy: partner.verifiedBy,
            verificationExpiresAt: partner.verificationExpiresAt,
            isVerified: true,
          })
          .where(eq(partners.id, partner.id));
      }

      const bidValues = imported.map((row) => ({
        id: randomUUID(),
        projectId: parsed.data.projectId,
        assetGroupId: row.assetGroupId,
        partnerId: partnerId(parsed.data.projectId, row.verificationReference),
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
      for (const batch of chunks(bidValues, 200)) await tx.insert(bids).values(batch);

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: access.user.id,
        action: "BIDS_IMPORTED",
        entityType: "PROJECT",
        entityId: parsed.data.projectId,
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
        projectId: parsed.data.projectId,
        name: "bids_imported",
        propertiesJson: JSON.stringify({ bidCount: imported.length, assetGroupCount: covered.size }),
      });
    });

    revalidatePath(`/projects/${parsed.data.projectId}/bids`);
    revalidatePath(`/projects/${parsed.data.projectId}/matching`);
    return { status: "success", message: `입찰 ${imported.length.toLocaleString("ko-KR")}건을 검증 근거와 함께 가져왔습니다. 이제 매칭안을 계산할 수 있습니다.` };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof Error && error.message.includes("PROJECT_VERSION_CONFLICT")) {
      return { status: "error", message: "프로젝트가 다른 사용자에 의해 변경되었습니다. 새로고침 후 다시 시도해 주세요." };
    }
    await logger.error("bid_import_failed", {
      projectId: parsed.data.projectId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error", message: "입찰을 가져오지 못했습니다. 원본 데이터는 변경되지 않았습니다." };
  }
}
