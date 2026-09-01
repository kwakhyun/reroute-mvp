import { describe, expect, it } from "vitest";
import {
  assertOperationVersion,
  assertPickupTransition,
  assertReleaseReady,
  assertSettlementTransition,
  OperationConflictError,
  OperationTransitionError,
} from "./operation-policy";

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

  it("rejects a stale operation version before an update can overwrite newer data", () => {
    expect(() => assertOperationVersion(1_725_192_000_000, new Date(1_725_192_000_000))).not.toThrow();
    expect(() => assertOperationVersion(1_725_192_000_000, new Date(1_725_192_000_001))).toThrow(OperationConflictError);
  });
});
