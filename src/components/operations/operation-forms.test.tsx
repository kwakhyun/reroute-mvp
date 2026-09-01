// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PickupOperationForm } from "./pickup-operation-form";
import { SettlementStatusForm } from "./settlement-status-form";

vi.mock("@/app/actions/operations", () => ({
  updatePickupOperationAction: vi.fn(),
  updateSettlementAction: vi.fn(),
}));

describe("operation forms", () => {
  it("synchronizes pickup controls when a saved server version arrives", async () => {
    const user = userEvent.setup();
    const operation = {
      id: "pickup-1",
      status: "PLANNED" as const,
      address: null,
      timeWindow: null,
      vehicleLabel: null,
      operatorName: null,
    };
    const { rerender } = render(<PickupOperationForm operation={operation} projectId="project-1" version="2024-09-01T12:00:00.000Z" />);
    await user.selectOptions(screen.getByLabelText("상태"), "READY");
    expect(screen.getByLabelText("상태")).toHaveValue("READY");

    rerender(<PickupOperationForm
      operation={{
        ...operation,
        status: "READY",
        address: "서울시 성동구 아차산로 17",
        timeWindow: "09:00–11:00",
        vehicleLabel: "서울 12가 3456",
        operatorName: "김운영",
      }}
      projectId="project-1"
      version="2024-09-01T12:00:01.000Z"
    />);

    expect(screen.getByLabelText("상태")).toHaveValue("READY");
    expect(screen.getByLabelText("수거지")).toHaveValue("서울시 성동구 아차산로 17");
  });

  it("synchronizes the settlement selector with the refreshed summary state", async () => {
    const user = userEvent.setup();
    const settlement = { id: "settlement-1", status: "NOT_CONNECTED" as const, providerReference: null };
    const { rerender } = render(<SettlementStatusForm projectId="project-1" settlement={settlement} version="2024-09-01T12:00:00.000Z" />);
    await user.selectOptions(screen.getByLabelText("확인 상태"), "PENDING");

    rerender(<SettlementStatusForm
      projectId="project-1"
      settlement={{ ...settlement, status: "PENDING" }}
      version="2024-09-01T12:00:01.000Z"
    />);

    expect(screen.getByLabelText("확인 상태")).toHaveValue("PENDING");
  });
});
