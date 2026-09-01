import { MatchingMutationError } from "./matching-error";
import { toSeoulDateKey } from "@/lib/date";

type ConfirmationReceipt = {
  userId: string;
  action: string;
  resultJson: string;
};

export type ConfirmationResult = { projectId: string; planId: string; status: "CONFIRMED" };

type PartnerEvidence = {
  isVerified: boolean;
  verificationReference: string | null;
  verifiedAt: Date | null;
  verificationExpiresAt: Date | null;
};

export function isPartnerEvidenceCurrent(evidence: PartnerEvidence, now = new Date()) {
  return Boolean(
    evidence.isVerified &&
      evidence.verificationReference?.trim() &&
      evidence.verifiedAt &&
      !Number.isNaN(evidence.verifiedAt.getTime()) &&
      (!evidence.verificationExpiresAt ||
        toSeoulDateKey(evidence.verificationExpiresAt) >= toSeoulDateKey(now)),
  );
}

export function replayConfirmationReceipt(
  receipt: ConfirmationReceipt | null | undefined,
  actorUserId: string,
  projectId: string,
): ConfirmationResult | null {
  if (!receipt) return null;
  let result: ConfirmationResult;
  try {
    result = JSON.parse(receipt.resultJson) as ConfirmationResult;
  } catch {
    throw new MatchingMutationError("요청 처리 기록이 손상되었습니다.");
  }
  if (
    receipt.userId !== actorUserId ||
    receipt.action !== "CONFIRM_MATCH_PLAN" ||
    result.projectId !== projectId ||
    result.status !== "CONFIRMED" ||
    !result.planId
  ) {
    throw new MatchingMutationError("이 요청 식별자는 이미 다른 작업에 사용되었습니다.");
  }
  return result;
}

export function hasCompleteVerifiedCoverage(
  expectedGroups: Array<{ id: string; quantity: number }>,
  allocations: Array<{ assetGroupId: string; quantity: number; isPartnerVerified: boolean }>,
) {
  const expectedById = new Map(expectedGroups.map((group) => [group.id, group.quantity]));
  const coveredGroups = new Set(allocations.map((row) => row.assetGroupId));
  return (
    expectedGroups.length > 0 &&
    allocations.length === expectedGroups.length &&
    coveredGroups.size === expectedGroups.length &&
    allocations.every((row) => row.isPartnerVerified && expectedById.get(row.assetGroupId) === row.quantity)
  );
}
