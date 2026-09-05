import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { toSeoulDateKey } from "@/lib/date";
import { db } from "@/server/db/client";
import {
  analyticsEvents,
  assetGroups,
  auditLogs,
  bids,
  matchAllocations,
  matchPlans,
  mutationReceipts,
  partners,
  pickupOperations,
  projects,
  settlements,
} from "@/server/db/schema";
import { MatchingMutationError } from "./matching-error";
import {
  MatchingCapacityError,
  MatchingIntegrityError,
  MatchingTimeoutError,
  recommendMatchPlan,
} from "./matching-engine";
import {
  hasCompleteVerifiedCoverage,
  isPartnerEvidenceCurrent,
  replayConfirmationReceipt,
} from "./matching-policies";

export type RecalculationInput = {
  minimumCashRecovery: number;
  minimumReuseRate: number;
  maximumPickupRounds: number;
};

function isDatabaseConflict(error: unknown) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /SQLITE_BUSY|SQLITE_CONSTRAINT|transaction.*conflict|database is locked/i.test(message);
}

export async function recalculateMatchPlan(
  projectId: string,
  input: RecalculationInput,
  actor: { id: string; ipHash: string },
  database = db,
) {
  const [project] = await database.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    throw new MatchingMutationError("프로젝트를 찾을 수 없습니다.");
  }
  if (project.status === "CONFIRMED") {
    throw new MatchingMutationError("확정된 프로젝트는 조건을 다시 계산할 수 없습니다.");
  }

  const [candidateRows, expectedGroups] = await Promise.all([
    database
      .select({
        bid: bids,
        isVerified: partners.isVerified,
        verificationReference: partners.verificationReference,
        verifiedAt: partners.verifiedAt,
        verificationExpiresAt: partners.verificationExpiresAt,
      })
      .from(bids)
      .innerJoin(partners, eq(bids.partnerId, partners.id))
      .where(eq(bids.projectId, projectId)),
    database
      .select({ id: assetGroups.id, quantity: assetGroups.quantity, minimumRecovery: assetGroups.minimumRecovery })
      .from(assetGroups)
      .where(eq(assetGroups.projectId, projectId)),
  ]);

  const assetRecoveryFloor = expectedGroups.reduce((sum, group) => sum + group.minimumRecovery, 0);
  const effectiveMinimumCashRecovery = Math.max(input.minimumCashRecovery, assetRecoveryFloor);

  let recommendation;
  try {
    recommendation = recommendMatchPlan(
      candidateRows.map(({ bid, ...evidence }) => ({
        id: bid.id,
        assetGroupId: bid.assetGroupId,
        partnerId: bid.partnerId,
        isPartnerVerified: isPartnerEvidenceCurrent(evidence),
        quantity: bid.quantity,
        cashRecovery: bid.cashRecovery,
        costSavings: bid.costSavings,
        reuseQuantity: bid.reuseQuantity,
        performanceLabel: bid.performanceLabel,
        performanceRate: bid.performanceRate,
        pickupDate: bid.pickupDate,
      })),
      {
        assetCount: project.assetCount,
        ...input,
        minimumCashRecovery: effectiveMinimumCashRecovery,
      },
      expectedGroups,
    );
  } catch (error) {
    if (error instanceof MatchingCapacityError || error instanceof MatchingTimeoutError) {
      throw new MatchingMutationError("입찰 조합이 너무 많아 동기 계산 범위를 초과했습니다. 자산 항목별 후보를 줄인 뒤 다시 시도해 주세요.");
    }
    if (error instanceof MatchingIntegrityError) {
      throw new MatchingMutationError("각 자산 항목의 전체 수량을 인수할 수 있고 확인도 끝난 입찰이 있는지 살펴봐 주세요.");
    }
    throw error;
  }

  const planId = randomUUID();
  const now = new Date();

  try {
    await database.transaction(async (tx) => {
      const projectUpdate = await tx
        .update(projects)
        .set({
          minimumCashRecovery: effectiveMinimumCashRecovery,
          minimumReuseRate: input.minimumReuseRate,
          maximumPickupRounds: input.maximumPickupRounds,
          status: "MATCHING",
          version: sql`${projects.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.version, project.version),
            ne(projects.status, "CONFIRMED"),
          ),
        )
        .returning({ id: projects.id });
      if (projectUpdate.length !== 1) {
        throw new MatchingMutationError("다른 사용자가 프로젝트를 변경했습니다. 최신 화면에서 다시 계산해 주세요.");
      }

      const currentDrafts = await tx
        .select({ id: matchPlans.id })
        .from(matchPlans)
        .where(and(eq(matchPlans.projectId, projectId), eq(matchPlans.status, "DRAFT")));
      const draftIds = currentDrafts.map((draft) => draft.id);
      if (draftIds.length > 0) {
        await tx.delete(matchAllocations).where(inArray(matchAllocations.matchPlanId, draftIds));
        await tx
          .delete(matchPlans)
          .where(and(inArray(matchPlans.id, draftIds), eq(matchPlans.status, "DRAFT")));
      }

      await tx.insert(matchPlans).values({
        id: planId,
        projectId,
        status: "DRAFT",
        cashRecovery: recommendation.cashRecovery,
        costSavings: recommendation.costSavings,
        netImpact: recommendation.netImpact,
        reuseQuantity: recommendation.reuseQuantity,
        reuseRate: recommendation.reuseRate,
        pickupRounds: recommendation.pickupRounds,
        criteriaPassed: recommendation.criteriaPassed,
      });

      await tx.insert(matchAllocations).values(
        recommendation.bids.map((bid) => ({
          id: randomUUID(),
          matchPlanId: planId,
          bidId: bid.id,
          partnerId: bid.partnerId,
          quantity: bid.quantity,
          cashRecovery: bid.cashRecovery,
          costSavings: bid.costSavings,
          performanceLabel: bid.performanceLabel,
          performanceRate: bid.performanceRate,
          pickupDate: bid.pickupDate,
        })),
      );

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: actor.id,
        action: "MATCH_PLAN_RECALCULATED",
        entityType: "PROJECT",
        entityId: projectId,
        ipHash: actor.ipHash,
        metadataJson: JSON.stringify({
          ...input,
          effectiveMinimumCashRecovery,
          assetRecoveryFloor,
          planId,
          criteriaPassed: recommendation.criteriaPassed,
        }),
      });

      await tx.insert(analyticsEvents).values({
        id: randomUUID(),
        userId: actor.id,
        projectId,
        name: "match_plan_recalculated",
        propertiesJson: JSON.stringify({ criteriaPassed: recommendation.criteriaPassed }),
      });
    });
  } catch (error) {
    if (error instanceof MatchingMutationError) throw error;
    if (isDatabaseConflict(error)) {
      throw new MatchingMutationError("프로젝트가 동시에 변경되었습니다. 최신 화면에서 다시 시도해 주세요.", { cause: error });
    }
    throw error;
  }

  return {
    planId,
    criteriaPassed: recommendation.criteriaPassed,
    cashRecovery: recommendation.cashRecovery,
    costSavings: recommendation.costSavings,
    reuseRate: recommendation.reuseRate,
    pickupRounds: recommendation.pickupRounds,
    effectiveMinimumCashRecovery,
  };
}

export async function confirmMatchPlan(
  projectId: string,
  idempotencyKey: string,
  actor: { id: string; ipHash: string },
  expected: { planId: string; version: number },
  database = db,
) {
  const [existingReceipt] = await database
    .select()
    .from(mutationReceipts)
    .where(eq(mutationReceipts.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existingReceipt) {
    return replayConfirmationReceipt(existingReceipt, actor.id, projectId, expected.planId)!;
  }

  const [project] = await database.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new MatchingMutationError("프로젝트를 찾을 수 없습니다.");

  const [plan] = await database
    .select()
    .from(matchPlans)
    .where(and(eq(matchPlans.projectId, projectId), eq(matchPlans.id, expected.planId)))
    .limit(1);

  if (plan?.status === "CONFIRMED") {
    return { projectId, planId: plan.id, status: "CONFIRMED" as const };
  }
  if (!plan || project.version !== expected.version || project.status === "CONFIRMED") {
    throw new MatchingMutationError("검토한 배분안이 변경되었습니다. 최신 배분안을 확인한 뒤 다시 확정해 주세요.");
  }
  if (!plan.criteriaPassed) {
    throw new MatchingMutationError("확정 기준을 충족한 배분안만 확정할 수 있습니다.");
  }

  const [expectedGroups, allocationRows] = await Promise.all([
    database
      .select({ id: assetGroups.id, quantity: assetGroups.quantity })
      .from(assetGroups)
      .where(eq(assetGroups.projectId, projectId)),
    database
      .select({
        assetGroupId: bids.assetGroupId,
        quantity: matchAllocations.quantity,
        isVerified: partners.isVerified,
        verificationReference: partners.verificationReference,
        verifiedAt: partners.verifiedAt,
        verificationExpiresAt: partners.verificationExpiresAt,
        pickupDate: matchAllocations.pickupDate,
      })
      .from(matchAllocations)
      .innerJoin(bids, eq(matchAllocations.bidId, bids.id))
      .innerJoin(partners, eq(matchAllocations.partnerId, partners.id))
      .where(and(eq(matchAllocations.matchPlanId, plan.id), eq(bids.projectId, projectId))),
  ]);
  const allocationIsComplete = hasCompleteVerifiedCoverage(
    expectedGroups,
    allocationRows.map((row) => ({
      assetGroupId: row.assetGroupId,
      quantity: row.quantity,
      isPartnerVerified: isPartnerEvidenceCurrent(row),
    })),
  );
  if (!allocationIsComplete) {
    throw new MatchingMutationError("모든 자산 항목이 확인을 마친 인수처에 배정된 배분안만 확정할 수 있습니다.");
  }

  const now = new Date();
  const result = { projectId, planId: plan.id, status: "CONFIRMED" as const };

  try {
    await database.transaction(async (tx) => {
      const updated = await tx
      .update(matchPlans)
      .set({ status: "CONFIRMED", confirmedAt: now, confirmedBy: actor.id })
      .where(and(eq(matchPlans.id, plan.id), eq(matchPlans.status, "DRAFT")))
      .returning({ id: matchPlans.id });

      if (updated.length !== 1) {
        throw new MatchingMutationError("다른 사용자가 먼저 배분안을 변경하거나 확정했습니다.");
      }

      const projectUpdate = await tx
        .update(projects)
        .set({ status: "CONFIRMED", version: sql`${projects.version} + 1`, updatedAt: now })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.version, project.version),
            ne(projects.status, "CONFIRMED"),
          ),
        )
        .returning({ id: projects.id });
      if (projectUpdate.length !== 1) {
        throw new MatchingMutationError("다른 사용자가 프로젝트를 변경했습니다. 최신 배분안을 확인해 주세요.");
      }

    await tx.insert(mutationReceipts).values({
      id: randomUUID(),
      idempotencyKey,
      userId: actor.id,
      action: "CONFIRM_MATCH_PLAN",
      resultJson: JSON.stringify(result),
    });

    await tx.insert(auditLogs).values({
      id: randomUUID(),
      actorUserId: actor.id,
      action: "MATCH_PLAN_CONFIRMED",
      entityType: "PROJECT",
      entityId: projectId,
      ipHash: actor.ipHash,
      metadataJson: JSON.stringify({ planId: plan.id }),
    });

    await tx.insert(analyticsEvents).values({
      id: randomUUID(),
      userId: actor.id,
      projectId,
      name: "match_plan_confirmed",
      propertiesJson: JSON.stringify({ planId: plan.id }),
    });

      const pickupDates = [...new Map(
        allocationRows.map((row) => [toSeoulDateKey(row.pickupDate), row.pickupDate]),
      ).values()];
      await tx
      .insert(pickupOperations)
      .values(
        pickupDates.map((pickupDate) => ({
          id: randomUUID(),
          projectId,
          pickupDate,
          status: "PLANNED" as const,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing();
      await tx
      .insert(settlements)
      .values({
        id: randomUUID(),
        projectId,
        status: "NOT_CONNECTED",
        amount: plan.cashRecovery,
        updatedAt: now,
      })
      .onConflictDoNothing();
    });
  } catch (error) {
    const [receiptAfterConflict] = await database
      .select()
      .from(mutationReceipts)
      .where(eq(mutationReceipts.idempotencyKey, idempotencyKey))
      .limit(1);
    if (receiptAfterConflict) {
      return replayConfirmationReceipt(receiptAfterConflict, actor.id, projectId, expected.planId)!;
    }
    if (error instanceof MatchingMutationError) throw error;
    if (isDatabaseConflict(error)) {
      throw new MatchingMutationError("배분안이 동시에 변경되었습니다. 최신 화면에서 다시 확인해 주세요.", { cause: error });
    }
    throw error;
  }

  return result;
}
