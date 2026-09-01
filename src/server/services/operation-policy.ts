import type { PickupStatus, SettlementStatus } from "@/server/db/schema";

export class OperationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationTransitionError";
  }
}

const pickupTransitions: Record<PickupStatus, readonly PickupStatus[]> = {
  PLANNED: ["PLANNED", "READY", "FAILED"],
  READY: ["READY", "PLANNED", "IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["IN_TRANSIT", "INSPECTED", "FAILED"],
  INSPECTED: ["INSPECTED"],
  FAILED: ["FAILED", "PLANNED", "READY"],
};

const settlementTransitions: Record<SettlementStatus, readonly SettlementStatus[]> = {
  NOT_CONNECTED: ["NOT_CONNECTED", "PENDING", "FAILED"],
  PENDING: ["PENDING", "NOT_CONNECTED", "FUNDED", "FAILED"],
  FUNDED: ["FUNDED", "RELEASED", "FAILED"],
  RELEASED: ["RELEASED"],
  FAILED: ["FAILED", "NOT_CONNECTED", "PENDING"],
};

export function assertPickupTransition(from: PickupStatus, to: PickupStatus) {
  if (!pickupTransitions[from].includes(to)) throw new OperationTransitionError("현재 수거 상태에서 선택한 상태로 바로 변경할 수 없습니다.");
}

export function assertSettlementTransition(from: SettlementStatus, to: SettlementStatus) {
  if (!settlementTransitions[from].includes(to)) throw new OperationTransitionError("현재 정산 상태에서 선택한 상태로 바로 변경할 수 없습니다.");
}

export function assertReleaseReady(expectedRounds: number, pickupStatuses: PickupStatus[]) {
  if (pickupStatuses.length !== expectedRounds || pickupStatuses.some((status) => status !== "INSPECTED")) {
    throw new OperationTransitionError("모든 수거 회차의 검수가 완료되어야 지급 완료를 기록할 수 있습니다.");
  }
}
