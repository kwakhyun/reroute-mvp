import { z } from "zod";

const nullableText = z.string().trim().max(120).transform((value) => value || null);
const expectedUpdatedAt = z.iso.datetime({ offset: true }).transform((value) => new Date(value).getTime());

export const pickupOperationInputSchema = z
  .object({
    projectId: z.string().min(1),
    operationId: z.string().min(1),
    expectedUpdatedAt,
    status: z.enum(["PLANNED", "READY", "IN_TRANSIT", "INSPECTED", "FAILED"]),
    address: nullableText,
    timeWindow: nullableText,
    vehicleLabel: nullableText,
    operatorName: nullableText,
  })
  .superRefine((value, context) => {
    if (!(["READY", "IN_TRANSIT", "INSPECTED"] as const).includes(value.status as "READY" | "IN_TRANSIT" | "INSPECTED")) return;

    const requiredFields = [
      ["address", value.address, "준비 완료 이후에는 수거지를 입력해 주세요."],
      ["timeWindow", value.timeWindow, "준비 완료 이후에는 수거 시간대를 입력해 주세요."],
      ["vehicleLabel", value.vehicleLabel, "준비 완료 이후에는 차량을 입력해 주세요."],
      ["operatorName", value.operatorName, "준비 완료 이후에는 담당자를 입력해 주세요."],
    ] as const;

    for (const [field, fieldValue, message] of requiredFields) {
      if (!fieldValue) context.addIssue({ code: "custom", path: [field], message });
    }
  });

export const settlementInputSchema = z
  .object({
    projectId: z.string().min(1),
    settlementId: z.string().min(1),
    expectedUpdatedAt,
    status: z.enum(["NOT_CONNECTED", "PENDING", "FUNDED", "RELEASED", "FAILED"]),
    providerReference: nullableText,
  })
  .superRefine((value, context) => {
    if (["FUNDED", "RELEASED"].includes(value.status) && !value.providerReference) {
      context.addIssue({ code: "custom", path: ["providerReference"], message: "입금 확인 이후에는 결제사 확인 번호가 필요합니다." });
    }
  });
