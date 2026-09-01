"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { useActionState } from "react";
import { updateSettlementAction } from "@/app/actions/operations";
import { initialOperationActionState } from "@/lib/operation-action-state";

type SettlementStatusFormProps = {
  projectId: string;
  settlement: {
    id: string;
    status: "NOT_CONNECTED" | "PENDING" | "FUNDED" | "RELEASED" | "FAILED";
    providerReference: string | null;
  };
};

export function SettlementStatusForm({ projectId, settlement }: SettlementStatusFormProps) {
  const [state, action, pending] = useActionState(updateSettlementAction, initialOperationActionState);
  const options = {
    NOT_CONNECTED: [["NOT_CONNECTED", "결제사 미연동"], ["PENDING", "입금 확인 중"], ["FAILED", "확인 실패"]],
    PENDING: [["PENDING", "입금 확인 중"], ["NOT_CONNECTED", "결제사 미연동"], ["FUNDED", "입금 확인"], ["FAILED", "확인 실패"]],
    FUNDED: [["FUNDED", "입금 확인"], ["RELEASED", "지급 확인"], ["FAILED", "확인 실패"]],
    RELEASED: [["RELEASED", "지급 확인"]],
    FAILED: [["FAILED", "확인 실패"], ["NOT_CONNECTED", "결제사 미연동"], ["PENDING", "입금 확인 중"]],
  }[settlement.status] as Array<[string, string]>;
  return (
    <form action={action} className="card settlement-control">
      <div><span className="eyebrow">MANUAL VERIFICATION</span><h2>외부 정산 상태 확인</h2><p>결제사 대시보드에서 확인한 결과만 기록합니다. 이 화면은 자금을 이동하지 않습니다.</p></div>
      <input name="projectId" type="hidden" value={projectId} />
      <input name="settlementId" type="hidden" value={settlement.id} />
      <label><span>확인 상태</span><select defaultValue={settlement.status} name="status">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>결제사 참조값</span><input defaultValue={settlement.providerReference ?? ""} maxLength={120} name="providerReference" placeholder="입금 이후 상태에서 필수" /></label>
      <button className="button button-secondary" disabled={pending} type="submit"><FloppyDisk aria-hidden="true" size={17} /> {pending ? "저장 중…" : "확인 결과 저장"}</button>
      {state.status !== "idle" ? <p className={state.status === "error" ? "form-error" : "form-success"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  );
}
