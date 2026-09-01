"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationActionState } from "@/lib/operation-action-state";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { requireProjectAccess } from "@/server/auth/project-access";
import { db } from "@/server/db/client";
import { auditLogs, matchPlans, pickupOperations, settlements } from "@/server/db/schema";
import { logger } from "@/server/observability/logger";
import { getRequestIpHash } from "@/server/security/request";
import { assertPickupTransition, assertReleaseReady, assertSettlementTransition, OperationTransitionError } from "@/server/services/operation-policy";

const nullableText = z.string().trim().max(120).transform((value) => value || null);
const pickupSchema = z.object({
  projectId: z.string().min(1),
  operationId: z.string().min(1),
  status: z.enum(["PLANNED", "READY", "IN_TRANSIT", "INSPECTED", "FAILED"]),
  address: nullableText,
  timeWindow: nullableText,
  vehicleLabel: nullableText,
  operatorName: nullableText,
});

const settlementSchema = z
  .object({
    projectId: z.string().min(1),
    settlementId: z.string().min(1),
    status: z.enum(["NOT_CONNECTED", "PENDING", "FUNDED", "RELEASED", "FAILED"]),
    providerReference: nullableText,
  })
  .superRefine((value, context) => {
    if (["FUNDED", "RELEASED"].includes(value.status) && !value.providerReference) {
      context.addIssue({ code: "custom", path: ["providerReference"], message: "입금 이후 상태에는 결제사 참조값이 필요합니다." });
    }
  });

function knownActionError(error: unknown): error is AuthenticationError | AuthorizationError | OperationTransitionError {
  return error instanceof AuthenticationError || error instanceof AuthorizationError || error instanceof OperationTransitionError;
}

export async function updatePickupOperationAction(
  _state: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const parsed = pickupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "운영 상태와 입력값을 확인해 주세요." };

  try {
    const [access, ipHash] = await Promise.all([
      requireProjectAccess(parsed.data.projectId, ["MANAGER", "APPROVER"]),
      getRequestIpHash(),
    ]);
    const now = new Date();
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: pickupOperations.status })
        .from(pickupOperations)
        .where(and(eq(pickupOperations.id, parsed.data.operationId), eq(pickupOperations.projectId, parsed.data.projectId)))
        .limit(1);
      if (!current) throw new AuthorizationError("수거 회차를 찾을 수 없습니다.");
      assertPickupTransition(current.status, parsed.data.status);
      const updated = await tx
        .update(pickupOperations)
        .set({
          status: parsed.data.status,
          address: parsed.data.address,
          timeWindow: parsed.data.timeWindow,
          vehicleLabel: parsed.data.vehicleLabel,
          operatorName: parsed.data.operatorName,
          updatedAt: now,
        })
        .where(and(eq(pickupOperations.id, parsed.data.operationId), eq(pickupOperations.projectId, parsed.data.projectId), eq(pickupOperations.status, current.status)))
        .returning({ id: pickupOperations.id });
      if (updated.length !== 1) throw new AuthorizationError("수거 회차를 찾을 수 없습니다.");
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: access.user.id,
        action: "PICKUP_OPERATION_UPDATED",
        entityType: "PROJECT",
        entityId: parsed.data.projectId,
        ipHash,
        metadataJson: JSON.stringify({ operationId: parsed.data.operationId, status: parsed.data.status }),
      });
    });
    revalidatePath(`/projects/${parsed.data.projectId}/pickups`);
    revalidatePath(`/projects/${parsed.data.projectId}/settlements`);
    return { status: "success", message: "수거 운영 상태를 저장했습니다." };
  } catch (error) {
    if (knownActionError(error)) return { status: "error", message: error.message };
    await logger.error("pickup_operation_update_failed", { projectId: parsed.data.projectId, errorName: error instanceof Error ? error.name : "UnknownError" });
    return { status: "error", message: "수거 운영 상태를 저장하지 못했습니다." };
  }
}

export async function updateSettlementAction(
  _state: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const parsed = settlementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "정산 상태를 확인해 주세요." };

  try {
    const [access, ipHash] = await Promise.all([
      requireProjectAccess(parsed.data.projectId, ["APPROVER"]),
      getRequestIpHash(),
    ]);
    const now = new Date();
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: settlements.status })
        .from(settlements)
        .where(and(eq(settlements.id, parsed.data.settlementId), eq(settlements.projectId, parsed.data.projectId)))
        .limit(1);
      if (!current) throw new AuthorizationError("정산 건을 찾을 수 없습니다.");
      assertSettlementTransition(current.status, parsed.data.status);
      if (parsed.data.status === "RELEASED") {
        const [plan, pickupRows] = await Promise.all([
          tx
            .select({ pickupRounds: matchPlans.pickupRounds })
            .from(matchPlans)
            .where(and(eq(matchPlans.projectId, parsed.data.projectId), eq(matchPlans.status, "CONFIRMED")))
            .limit(1),
          tx
            .select({ status: pickupOperations.status })
            .from(pickupOperations)
            .where(eq(pickupOperations.projectId, parsed.data.projectId)),
        ]);
        if (!plan[0]) throw new OperationTransitionError("확정된 매칭안을 찾을 수 없습니다.");
        assertReleaseReady(plan[0].pickupRounds, pickupRows.map((row) => row.status));
      }
      const updated = await tx
        .update(settlements)
        .set({ status: parsed.data.status, providerReference: parsed.data.providerReference, updatedAt: now })
        .where(and(eq(settlements.id, parsed.data.settlementId), eq(settlements.projectId, parsed.data.projectId), eq(settlements.status, current.status)))
        .returning({ id: settlements.id });
      if (updated.length !== 1) throw new AuthorizationError("정산 건을 찾을 수 없습니다.");
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        actorUserId: access.user.id,
        action: "SETTLEMENT_STATUS_UPDATED",
        entityType: "PROJECT",
        entityId: parsed.data.projectId,
        ipHash,
        metadataJson: JSON.stringify({ settlementId: parsed.data.settlementId, status: parsed.data.status }),
      });
    });
    revalidatePath(`/projects/${parsed.data.projectId}/settlements`);
    return { status: "success", message: "외부 정산 확인 상태를 저장했습니다." };
  } catch (error) {
    if (knownActionError(error)) return { status: "error", message: error.message };
    await logger.error("settlement_update_failed", { projectId: parsed.data.projectId, errorName: error instanceof Error ? error.name : "UnknownError" });
    return { status: "error", message: "정산 상태를 저장하지 못했습니다." };
  }
}
