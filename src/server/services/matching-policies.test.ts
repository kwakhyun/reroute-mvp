import { describe, expect, it } from "vitest";
import { MatchingMutationError } from "./matching-error";
import {
  hasCompleteVerifiedCoverage,
  isPartnerEvidenceCurrent,
  replayConfirmationReceipt,
} from "./matching-policies";

describe("partner evidence policy", () => {
  const current = {
    isVerified: true,
    verificationReference: "evidence-123",
    verifiedAt: new Date("2026-08-01T00:00:00+09:00"),
    verificationExpiresAt: new Date("2026-09-01T00:00:00+09:00"),
  };

  it("keeps evidence valid through the expiry date in Seoul", () => {
    expect(isPartnerEvidenceCurrent(current, new Date("2026-09-01T23:59:59+09:00"))).toBe(true);
  });

  it("rejects expired, revoked, or incomplete evidence", () => {
    expect(isPartnerEvidenceCurrent(current, new Date("2026-09-02T00:00:00+09:00"))).toBe(false);
    expect(isPartnerEvidenceCurrent({ ...current, isVerified: false })).toBe(false);
    expect(isPartnerEvidenceCurrent({ ...current, verificationReference: null })).toBe(false);
    expect(isPartnerEvidenceCurrent({ ...current, verifiedAt: null })).toBe(false);
  });
});

describe("confirmation idempotency", () => {
  const receipt = { userId: "user-1", action: "CONFIRM_MATCH_PLAN", resultJson: JSON.stringify({ projectId: "project-1", planId: "plan-1", status: "CONFIRMED" }) };

  it("replays the same actor and project result", () => {
    expect(replayConfirmationReceipt(receipt, "user-1", "project-1", "plan-1")).toEqual({ projectId: "project-1", planId: "plan-1", status: "CONFIRMED" });
  });

  it("rejects cross-user and cross-project key reuse", () => {
    expect(() => replayConfirmationReceipt(receipt, "user-2", "project-1", "plan-1")).toThrow(MatchingMutationError);
    expect(() => replayConfirmationReceipt(receipt, "user-1", "project-2", "plan-1")).toThrow("다른 작업");
  });
});

describe("confirmation allocation policy", () => {
  const expected = [{ id: "chairs", quantity: 10 }, { id: "tables", quantity: 5 }];
  const valid = [{ assetGroupId: "chairs", quantity: 10, isPartnerVerified: true }, { assetGroupId: "tables", quantity: 5, isPartnerVerified: true }];

  it("accepts exactly one verified allocation per expected group", () => {
    expect(hasCompleteVerifiedCoverage(expected, valid)).toBe(true);
  });

  it("rejects a missing, duplicate, quantity-mismatched, or unverified allocation", () => {
    expect(hasCompleteVerifiedCoverage(expected, valid.slice(0, 1))).toBe(false);
    expect(hasCompleteVerifiedCoverage(expected, [valid[0], valid[0]])).toBe(false);
    expect(hasCompleteVerifiedCoverage(expected, [{ ...valid[0], quantity: 9 }, valid[1]])).toBe(false);
    expect(hasCompleteVerifiedCoverage(expected, [{ ...valid[0], isPartnerVerified: false }, valid[1]])).toBe(false);
  });
});
