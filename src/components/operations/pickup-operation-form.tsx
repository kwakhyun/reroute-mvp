"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { useActionState } from "react";
import { updatePickupOperationAction } from "@/app/actions/operations";
import { initialOperationActionState } from "@/lib/operation-action-state";

type PickupOperationFormProps = {
  operation: {
    id: string;
    status: "PLANNED" | "READY" | "IN_TRANSIT" | "INSPECTED" | "FAILED";
    address: string | null;
    timeWindow: string | null;
    vehicleLabel: string | null;
    operatorName: string | null;
  };
  projectId: string;
};

export function PickupOperationForm({ operation, projectId }: PickupOperationFormProps) {
  const [state, action, pending] = useActionState(updatePickupOperationAction, initialOperationActionState);
  const options = {
    PLANNED: [["PLANNED", "계획"], ["READY", "준비 완료"], ["FAILED", "확인 필요"]],
    READY: [["READY", "준비 완료"], ["PLANNED", "계획"], ["IN_TRANSIT", "수거 중"], ["FAILED", "확인 필요"]],
    IN_TRANSIT: [["IN_TRANSIT", "수거 중"], ["INSPECTED", "검수 완료"], ["FAILED", "확인 필요"]],
    INSPECTED: [["INSPECTED", "검수 완료"]],
    FAILED: [["FAILED", "확인 필요"], ["PLANNED", "계획"], ["READY", "준비 완료"]],
  }[operation.status] as Array<[string, string]>;
  return (
    <form action={action} className="operation-form">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="operationId" type="hidden" value={operation.id} />
      <label><span>상태</span><select defaultValue={operation.status} name="status">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>수거지</span><input defaultValue={operation.address ?? ""} maxLength={120} name="address" placeholder="미입력" /></label>
      <label><span>시간대</span><input defaultValue={operation.timeWindow ?? ""} maxLength={120} name="timeWindow" placeholder="예: 09:00–11:00" /></label>
      <label><span>차량</span><input defaultValue={operation.vehicleLabel ?? ""} maxLength={120} name="vehicleLabel" placeholder="미배정" /></label>
      <label><span>담당자</span><input defaultValue={operation.operatorName ?? ""} maxLength={120} name="operatorName" placeholder="미지정" /></label>
      <button className="button button-secondary operation-save" disabled={pending} type="submit"><FloppyDisk aria-hidden="true" size={17} /> {pending ? "저장 중…" : "운영 정보 저장"}</button>
      {state.status !== "idle" ? <p className={state.status === "error" ? "form-error" : "form-success"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  );
}
