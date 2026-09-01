"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
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
  version: string;
};

function PickupOperationFields({ operation, pending, version }: Pick<PickupOperationFormProps, "operation" | "version"> & { pending: boolean }) {
  const [status, setStatus] = useState(operation.status);
  const options = {
    PLANNED: [["PLANNED", "계획"], ["READY", "준비 완료"], ["FAILED", "확인 필요"]],
    READY: [["READY", "준비 완료"], ["PLANNED", "계획"], ["IN_TRANSIT", "수거 중"], ["FAILED", "확인 필요"]],
    IN_TRANSIT: [["IN_TRANSIT", "수거 중"], ["INSPECTED", "검수 완료"], ["FAILED", "확인 필요"]],
    INSPECTED: [["INSPECTED", "검수 완료"]],
    FAILED: [["FAILED", "확인 필요"], ["PLANNED", "계획"], ["READY", "준비 완료"]],
  }[operation.status] as Array<[string, string]>;
  const detailsRequired = status === "READY" || status === "IN_TRANSIT" || status === "INSPECTED";

  return (
    <>
      <input name="expectedUpdatedAt" type="hidden" value={version} />
      <label><span>상태</span><select name="status" onChange={(event) => setStatus(event.target.value as typeof operation.status)} value={status}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>수거지</span><input defaultValue={operation.address ?? ""} maxLength={120} name="address" placeholder="예: 서울시 성동구 아차산로 17" required={detailsRequired} /></label>
      <label><span>시간대</span><input defaultValue={operation.timeWindow ?? ""} maxLength={120} name="timeWindow" placeholder="예: 09:00–11:00" required={detailsRequired} /></label>
      <label><span>차량</span><input defaultValue={operation.vehicleLabel ?? ""} maxLength={120} name="vehicleLabel" placeholder="예: 서울 12가 3456" required={detailsRequired} /></label>
      <label><span>담당자</span><input defaultValue={operation.operatorName ?? ""} maxLength={120} name="operatorName" placeholder="예: 김운영" required={detailsRequired} /></label>
      <button className="button button-secondary operation-save" disabled={pending} type="submit"><FloppyDisk aria-hidden="true" size={17} /> {pending ? "저장 중…" : "운영 정보 저장"}</button>
    </>
  );
}

export function PickupOperationForm({ operation, projectId, version }: PickupOperationFormProps) {
  const [state, action, pending] = useActionState(updatePickupOperationAction, initialOperationActionState);
  const messageId = `pickup-operation-message-${operation.id}`;

  return (
    <form action={action} className="operation-form">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="operationId" type="hidden" value={operation.id} />
      <PickupOperationFields key={version} operation={operation} pending={pending} version={version} />
      {state.status !== "idle" ? <p className={state.status === "error" ? "form-error" : "form-success"} id={messageId} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  );
}
