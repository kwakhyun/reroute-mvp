"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MatchingActionState } from "@/lib/matching-action-state";
import { MAX_PROJECT_CASH_RECOVERY } from "@/lib/domain-constraints";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { requireProjectAccess } from "@/server/auth/project-access";
import { logger } from "@/server/observability/logger";
import { getRequestIpHash } from "@/server/security/request";
import { MatchingMutationError } from "@/server/services/matching-error";
import { confirmMatchPlan, recalculateMatchPlan } from "@/server/services/matching-mutations";

const recalculateSchema = z.object({
  projectId: z.string().min(1),
  minimumCashRecovery: z.coerce.number().int().min(0).max(MAX_PROJECT_CASH_RECOVERY),
  minimumReuseRate: z.coerce.number().min(0).max(100),
  maximumPickupRounds: z.coerce.number().int().min(1).max(30),
});

const confirmSchema = z.object({
  projectId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export async function recalculateAction(
  _state: MatchingActionState,
  formData: FormData,
): Promise<MatchingActionState> {
  const parsed = recalculateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "조건 값을 다시 확인해 주세요." };
  }

  try {
    const [access, ipHash] = await Promise.all([
      requireProjectAccess(parsed.data.projectId, ["MANAGER", "APPROVER"]),
      getRequestIpHash(),
    ]);
    const result = await recalculateMatchPlan(
      parsed.data.projectId,
      {
        minimumCashRecovery: parsed.data.minimumCashRecovery,
        minimumReuseRate: parsed.data.minimumReuseRate,
        maximumPickupRounds: parsed.data.maximumPickupRounds,
      },
      { id: access.user.id, ipHash },
    );
    return {
      status: "success",
      message: result.criteriaPassed
        ? `자산 항목별 최소 매각 금액을 반영해 매각 대금 ${result.effectiveMinimumCashRecovery.toLocaleString("ko-KR")}만 원 이상을 충족하는 배분안을 계산했습니다.`
        : `매각 대금 ${result.effectiveMinimumCashRecovery.toLocaleString("ko-KR")}만 원 이상을 기준으로 가장 적합한 배분안을 찾았지만, 일부 조건은 충족하지 못했습니다.`,
    };
  } catch (error) {
    if (error instanceof MatchingMutationError || error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }
    await logger.error("match_plan_recalculation_failed", {
      projectId: parsed.data.projectId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error", message: "배분안을 다시 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function confirmMatchAction(
  _state: MatchingActionState,
  formData: FormData,
): Promise<MatchingActionState> {
  const parsed = confirmSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "확정 요청이 올바르지 않습니다." };
  }

  try {
    const [access, ipHash] = await Promise.all([
      requireProjectAccess(parsed.data.projectId, ["APPROVER"]),
      getRequestIpHash(),
    ]);
    await confirmMatchPlan(parsed.data.projectId, parsed.data.idempotencyKey, { id: access.user.id, ipHash });
    revalidatePath(`/projects/${parsed.data.projectId}/matching`);
    return { status: "success", message: "배분안이 확정되었습니다. 이제 수거 일정을 등록할 수 있습니다." };
  } catch (error) {
    if (error instanceof MatchingMutationError || error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }
    await logger.error("match_plan_confirmation_failed", {
      projectId: parsed.data.projectId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error", message: "배분안을 확정하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
