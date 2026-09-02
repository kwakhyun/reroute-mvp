"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { updateSettlementAction } from "@/app/actions/operations";
import { initialOperationActionState } from "@/lib/operation-action-state";

type SettlementStatusFormProps = {
  projectId: string;
  settlement: {
    id: string;
    status: "NOT_CONNECTED" | "PENDING" | "FUNDED" | "RELEASED" | "FAILED";
    providerReference: string | null;
  };
  version: string;
};

export function SettlementStatusForm({ projectId, settlement, version }: SettlementStatusFormProps) {
  const [state, action, pending] = useActionState(updateSettlementAction, initialOperationActionState);
  const messageId = `settlement-message-${settlement.id}`;

  return (
    <form action={action} className="card settlement-control">
      <div><span className="eyebrow">수동 확인</span><h2>결제사 처리 상태 기록</h2><p>결제사 관리 화면에서 직접 확인한 입금과 지급 결과만 기록합니다.</p></div>
      <input name="projectId" type="hidden" value={projectId} />
      <input name="settlementId" type="hidden" value={settlement.id} />
      <SettlementStatusFields key={version} pending={pending} settlement={settlement} version={version} />
      {state.status !== "idle" ? <p className={state.status === "error" ? "form-error" : "form-success"} id={messageId} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  );
}

function SettlementStatusFields({ pending, settlement, version }: Pick<SettlementStatusFormProps, "settlement" | "version"> & { pending: boolean }) {
  const [status, setStatus] = useState(settlement.status);
  const options = {
    NOT_CONNECTED: [["NOT_CONNECTED", "결제사 미연동"], ["PENDING", "입금 확인 중"], ["FAILED", "확인 실패"]],
    PENDING: [["PENDING", "입금 확인 중"], ["NOT_CONNECTED", "결제사 미연동"], ["FUNDED", "입금 확인"], ["FAILED", "확인 실패"]],
    FUNDED: [["FUNDED", "입금 확인"], ["RELEASED", "지급 확인"], ["FAILED", "확인 실패"]],
    RELEASED: [["RELEASED", "지급 확인"]],
    FAILED: [["FAILED", "확인 실패"], ["NOT_CONNECTED", "결제사 미연동"], ["PENDING", "입금 확인 중"]],
  }[settlement.status] as Array<[string, string]>;
  const providerReferenceRequired = status === "FUNDED" || status === "RELEASED";

  return (
    <>
      <input name="expectedUpdatedAt" type="hidden" value={version} />
      <label><span>확인 상태</span><select name="status" onChange={(event) => setStatus(event.target.value as typeof settlement.status)} value={status}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>결제사 확인 번호</span><input defaultValue={settlement.providerReference ?? ""} maxLength={120} name="providerReference" placeholder="입금 확인 이후에는 필수입니다" required={providerReferenceRequired} /></label>
      <button className="button button-secondary" disabled={pending} type="submit"><FloppyDisk aria-hidden="true" size={17} /> {pending ? "저장 중…" : "확인 결과 저장"}</button>
    </>
  );
}
