import { describe, expect, it } from "vitest";
import { assertPickupTransition, assertReleaseReady, assertSettlementTransition, OperationTransitionError } from "./operation-policy";

describe("operation state transitions", () => {
  it("allows forward operational transitions and rejects skipped states", () => {
    expect(() => assertPickupTransition("PLANNED", "READY")).not.toThrow();
    expect(() => assertPickupTransition("PLANNED", "INSPECTED")).toThrow(OperationTransitionError);
    expect(() => assertSettlementTransition("PENDING", "FUNDED")).not.toThrow();
    expect(() => assertSettlementTransition("NOT_CONNECTED", "RELEASED")).toThrow(OperationTransitionError);
  });

  it("requires every expected pickup round to be inspected before release", () => {
    expect(() => assertReleaseReady(2, ["INSPECTED", "INSPECTED"])).not.toThrow();
    expect(() => assertReleaseReady(2, ["INSPECTED", "READY"])).toThrow("모든 수거 회차");
  });
});
