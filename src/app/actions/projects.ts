"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ASSET_IMPORT_MAX_BYTES, AssetImportError, parseAssetCsv } from "@/lib/asset-import";
import { MAX_PROJECT_CASH_RECOVERY } from "@/lib/domain-constraints";
import type { ProjectActionState } from "@/lib/project-action-state";
import { assertMembershipRole } from "@/server/auth/access-policy";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { assetGroups, auditLogs, organizationMemberships, projects } from "@/server/db/schema";
import { logger } from "@/server/observability/logger";
import { getRequestIpHash } from "@/server/security/request";

const projectSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  batchLabel: z.string().trim().max(120).optional(),
  minimumCashRecovery: z.coerce.number().int().min(0).max(MAX_PROJECT_CASH_RECOVERY),
  minimumReuseRate: z.coerce.number().min(0).max(100),
  maximumPickupRounds: z.coerce.number().int().min(1).max(30),
});

export async function createProjectAction(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  const assetFile = formData.get("assetFile");
  if (!parsed.success) return { status: "error", message: "프로젝트 조건을 다시 확인해 주세요." };
  if (!(assetFile instanceof File) || assetFile.size === 0) return { status: "error", message: "자산 CSV 파일을 선택해 주세요." };
  if (assetFile.size > ASSET_IMPORT_MAX_BYTES) return { status: "error", message: "CSV 파일은 1MB 이하여야 합니다." };
  if (!assetFile.name.toLowerCase().endsWith(".csv")) return { status: "error", message: "CSV 형식의 파일만 가져올 수 있습니다." };

  let importedAssets;
  let createdProjectId = "";
  try {
    importedAssets = parseAssetCsv(await assetFile.text());
  } catch (error) {
    if (error instanceof AssetImportError) return { status: "error", message: error.message };
    return { status: "error", message: "CSV 파일을 읽지 못했습니다." };
  }

  try {
    const [user, ipHash] = await Promise.all([requireUser(), getRequestIpHash()]);
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, parsed.data.organizationId),
          eq(organizationMemberships.userId, user.id),
        ),
      )
      .limit(1);
    if (!membership) throw new AuthorizationError("조직에 접근할 수 없습니다.");
    assertMembershipRole(membership.role, ["MANAGER", "APPROVER"]);

    const projectId = `project-${randomUUID()}`;
    const assetCount = importedAssets.reduce((sum, asset) => sum + asset.quantity, 0);
    const assetRecoveryFloor = importedAssets.reduce((sum, asset) => sum + asset.minimumRecovery, 0);
    const effectiveMinimumCashRecovery = Math.max(parsed.data.minimumCashRecovery, assetRecoveryFloor);
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: projectId,
        organizationId: membership.organizationId,
        name: parsed.data.name,
        batchLabel: parsed.data.batchLabel || `${assetCount.toLocaleString("ko-KR")}개 자산`,
        location: parsed.data.location,
        status: "DRAFT",
        assetCount,
        minimumCashRecovery: effectiveMinimumCashRecovery,
        minimumReuseRate: parsed.data.minimumReuseRate,
        maximumPickupRounds: parsed.data.maximumPickupRounds,
        updatedAt: now,
      });
      await tx.insert(assetGroups).values(
        importedAssets.map((asset, index) => ({
          id: randomUUID(),
          projectId,
          displayOrder: index + 1,
          ...asset,
        })),
      );
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: user.id,
        action: "PROJECT_CREATED",
        entityType: "PROJECT",
        entityId: projectId,
        ipHash,
        metadataJson: JSON.stringify({
          assetGroupCount: importedAssets.length,
          assetCount,
          requestedMinimumCashRecovery: parsed.data.minimumCashRecovery,
          assetRecoveryFloor,
          effectiveMinimumCashRecovery,
        }),
      });
    });
    createdProjectId = projectId;
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }
    await logger.error("project_creation_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return { status: "error", message: "프로젝트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  redirect(`/projects/${createdProjectId}/matching`);
}
