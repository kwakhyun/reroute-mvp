import { describe, expect, it } from "vitest";
import { pickupOperationInputSchema, settlementInputSchema } from "./operation-input";

const basePickup = {
  projectId: "project-1",
  operationId: "pickup-1",
  expectedUpdatedAt: "2024-09-01T12:00:00.000Z",
  address: "",
  timeWindow: "",
  vehicleLabel: "",
  operatorName: "",
};

describe("pickup operation input", () => {
  it("allows a planned pickup before operational details are assigned", () => {
    expect(pickupOperationInputSchema.safeParse({ ...basePickup, status: "PLANNED" }).success).toBe(true);
  });

  it.each([
    ["address", "준비 완료 이후에는 수거지를 입력해 주세요."],
    ["timeWindow", "준비 완료 이후에는 수거 시간대를 입력해 주세요."],
    ["vehicleLabel", "준비 완료 이후에는 차량을 입력해 주세요."],
    ["operatorName", "준비 완료 이후에는 담당자를 입력해 주세요."],
  ] as const)("requires %s from the ready state", (field, message) => {
    const result = pickupOperationInputSchema.safeParse({
      ...basePickup,
      status: "READY",
      address: "서울시 성동구 아차산로 17",
      timeWindow: "09:00–11:00",
      vehicleLabel: "서울 12가 3456",
      operatorName: "김운영",
      [field]: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe(message);
  });

  it("accepts a ready pickup with every operational detail", () => {
    expect(pickupOperationInputSchema.safeParse({
      ...basePickup,
      status: "READY",
      address: "서울시 성동구 아차산로 17",
      timeWindow: "09:00–11:00",
      vehicleLabel: "서울 12가 3456",
      operatorName: "김운영",
    }).success).toBe(true);
  });
});

describe("settlement input", () => {
  const baseSettlement = {
    projectId: "project-1",
    settlementId: "settlement-1",
    expectedUpdatedAt: "2024-09-01T12:00:00.000Z",
  };

  it("requires a provider reference after funding is confirmed", () => {
    const result = settlementInputSchema.safeParse({ ...baseSettlement, status: "FUNDED", providerReference: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toContain("결제사 확인 번호");
  });

  it("allows a pending settlement without a provider reference", () => {
    expect(settlementInputSchema.safeParse({ ...baseSettlement, status: "PENDING", providerReference: "" }).success).toBe(true);
  });
});
