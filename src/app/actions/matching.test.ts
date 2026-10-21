import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { initialMatchingActionState } from "@/lib/matching-action-state";
import { MatchingMutationError } from "@/server/services/matching-error";
import { recalculateMatchPlan } from "@/server/services/matching-mutations";
import { recalculateAction } from "./matching";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/project-access", () => ({ requireProjectAccess: vi.fn(async () => ({ user: { id: "approver-a" } })) }));
vi.mock("@/server/security/request", () => ({ getRequestIpHash: vi.fn(async () => "test-ip") }));
vi.mock("@/server/observability/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/server/services/matching-mutations", () => ({ recalculateMatchPlan: vi.fn(), confirmMatchPlan: vi.fn() }));

function request(minimumCashRecovery = "123") {
  const data = new FormData();
  data.set("projectId", "project-test");
  data.set("minimumCashRecovery", minimumCashRecovery);
  data.set("minimumReuseRate", "80");
  data.set("maximumPickupRounds", "3");
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("recalculateAction", () => {
  it.each([true, false])("refreshes the current results immediately after saving a plan (criteriaPassed=%s)", async (criteriaPassed) => {
    vi.mocked(recalculateMatchPlan).mockImplementationOnce(async () => {
      // The old page stays intact until the mutation has succeeded.
      expect(revalidatePath).not.toHaveBeenCalled();
      return { criteriaPassed, effectiveMinimumCashRecovery: 123 } as Awaited<ReturnType<typeof recalculateMatchPlan>>;
    });

    expect(await recalculateAction(initialMatchingActionState, request())).toMatchObject({ status: "success" });
    expect(recalculateMatchPlan).toHaveBeenCalledWith("project-test", {
      minimumCashRecovery: 123,
      minimumReuseRate: 80,
      maximumPickupRounds: 3,
    }, { id: "approver-a", ipHash: "test-ip" });
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/projects/project-test/matching");
  });

  it("does not refresh the result after a rejected mutation", async () => {
    vi.mocked(recalculateMatchPlan).mockRejectedValueOnce(new MatchingMutationError("확정한 배분안은 바꿀 수 없습니다."));
    expect(await recalculateAction(initialMatchingActionState, request())).toMatchObject({ status: "error" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects fractional cash amounts before calling the mutation", async () => {
    expect(await recalculateAction(initialMatchingActionState, request("123.5"))).toMatchObject({ status: "error" });
    expect(recalculateMatchPlan).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
