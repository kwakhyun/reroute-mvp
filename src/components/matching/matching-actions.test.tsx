// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { confirmMatchAction, recalculateAction } from "@/app/actions/matching";
import type { MatchingActionState } from "@/lib/matching-action-state";
import { MatchingActions } from "./matching-actions";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/analytics/view-tracker", () => ({ trackEvent: vi.fn() }));
vi.mock("@/app/actions/matching", () => ({ recalculateAction: vi.fn(), confirmMatchAction: vi.fn() }));
vi.mock("@phosphor-icons/react", () => ({ ArrowRight: () => null, CheckCircle: () => null, Info: () => null, WarningCircle: () => null, X: () => null }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const result = {
  planId: "plan-before",
  projectVersion: 2,
  cashRecovery: 123,
  costSavings: 10,
  netImpact: 133,
  reuseRate: 80,
  pickupRounds: 3,
  criteriaPassed: true,
  allocations: [],
};
const props = {
  projectId: "project-test",
  bidCount: 2,
  criteria: { minimumCashRecovery: 123, minimumReuseRate: 80, maximumPickupRounds: 3 },
  result,
  canRecalculate: true,
  canConfirm: true,
  confirmed: false,
};

describe("MatchingActions", () => {
  it.each(["button", "close", "escape"])("keeps the refreshed plan available after successful recalculation is dismissed with %s", async (dismiss) => {
    const user = userEvent.setup();
    vi.mocked(recalculateAction).mockResolvedValueOnce({ status: "success", message: "새 조건으로 저장했습니다." });
    const { rerender } = render(<MatchingActions {...props} />);
    await user.click(screen.getByRole("button", { name: "조건 다시 계산" }));

    // A valid integer from a CSV total must be submittable, even if it is not a multiple of ten.
    expect(screen.getByLabelText("최소 매각 금액")).toBeValid();
    await user.click(screen.getByRole("button", { name: "새 조건으로 계산" }));
    expect(await screen.findByText("새 배분안을 계산했습니다.")).toBeInTheDocument();
    expect(vi.mocked(recalculateAction).mock.calls[0][1].get("minimumCashRecovery")).toBe("123");

    // Server Action revalidation supplies the latest RSC props before the dialog is dismissed.
    rerender(<MatchingActions {...props} result={{ ...result, planId: "plan-after", projectVersion: 3, cashRecovery: 234 }} />);
    if (dismiss === "button") await user.click(screen.getByRole("button", { name: "결과 확인" }));
    if (dismiss === "close") await user.click(screen.getByRole("button", { name: "닫기" }));
    if (dismiss === "escape") fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("새 조건으로 저장했습니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "배분안 확정" }));
    expect(screen.getByText("234만 원")).toBeInTheDocument();
    const confirmation = screen.getByRole("dialog");
    expect(confirmation.querySelector('input[name="planId"]')).toHaveValue("plan-after");
    expect(confirmation.querySelector('input[name="expectedVersion"]')).toHaveValue("3");
  });

  it("keeps a pending recalculation open for close, cancel, and Escape until its result arrives", async () => {
    const user = userEvent.setup();
    let resolveAction!: (state: MatchingActionState) => void;
    vi.mocked(recalculateAction).mockImplementationOnce(() => new Promise((resolve) => { resolveAction = resolve; }));
    render(<MatchingActions {...props} />);
    await user.click(screen.getByRole("button", { name: "조건 다시 계산" }));
    await user.click(screen.getByRole("button", { name: "새 조건으로 계산" }));
    expect(screen.getByRole("button", { name: "닫기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "닫기" }));
    await user.click(screen.getByRole("button", { name: "취소" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.getByRole("button", { name: "계산 중…" })).toBeInTheDocument();

    await act(async () => resolveAction({ status: "success", message: "새 배분안을 저장했습니다." }));
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("preserves edited criteria after a server error and lets the user retry them", async () => {
    const user = userEvent.setup();
    vi.mocked(recalculateAction).mockResolvedValue({ status: "error", message: "다시 시도해 주세요." });
    render(<MatchingActions {...props} />);
    await user.click(screen.getByRole("button", { name: "조건 다시 계산" }));
    for (const [label, value] of [["최소 매각 금액", "234"], ["최소 재사용률", "90.5"], ["최대 수거 횟수", "2"]]) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), value);
    }
    await user.click(screen.getByRole("button", { name: "새 조건으로 계산" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도해 주세요.");
    expect(screen.getByLabelText("최소 매각 금액")).toHaveValue(234);
    expect(screen.getByLabelText("최소 재사용률")).toHaveValue(90.5);
    expect(screen.getByLabelText("최대 수거 횟수")).toHaveValue(2);
    await user.click(screen.getByRole("button", { name: "새 조건으로 계산" }));
    await waitFor(() => expect(recalculateAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(recalculateAction).mock.calls[1][1].get("minimumCashRecovery")).toBe("234");
  });

  it("submits the plan and version the user reviewed even when newer props arrive", async () => {
    const user = userEvent.setup();
    vi.mocked(confirmMatchAction).mockResolvedValueOnce({ status: "error", message: "최신 배분안을 확인해 주세요." });
    const { rerender } = render(<MatchingActions {...props} />);
    await user.click(screen.getByRole("button", { name: "배분안 확정" }));
    rerender(<MatchingActions {...props} result={{ ...result, planId: "plan-after", projectVersion: 3 }} />);
    await user.click(screen.getByRole("button", { name: "확정하고 수거 일정 만들기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("최신 배분안을 확인해 주세요.");
    const request = vi.mocked(confirmMatchAction).mock.calls[0][1];
    expect(request.get("planId")).toBe("plan-before");
    expect(request.get("expectedVersion")).toBe("2");
    await user.click(screen.getByRole("button", { name: "최신 배분안 확인" }));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
