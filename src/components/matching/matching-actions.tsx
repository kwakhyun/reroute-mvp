"use client";

import { ArrowRight, CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  confirmMatchAction,
  recalculateAction,
} from "@/app/actions/matching";
import { trackEvent } from "@/components/analytics/view-tracker";
import { Modal } from "@/components/ui/modal";
import { formatNumber } from "@/lib/format";
import { MAX_PROJECT_CASH_RECOVERY } from "@/lib/domain-constraints";
import { initialMatchingActionState } from "@/lib/matching-action-state";

type MatchingResult = {
  cashRecovery: number;
  costSavings: number;
  netImpact: number;
  reuseRate: number;
  pickupRounds: number;
  criteriaPassed: boolean;
  allocations: Array<{
    id: string;
    assetGroupName: string;
    partnerName: string;
    quantity: number;
  }>;
};

type MatchingActionsProps = {
  projectId: string;
  bidCount: number;
  criteria: {
    minimumCashRecovery: number;
    minimumReuseRate: number;
    maximumPickupRounds: number;
  };
  result: MatchingResult | null;
  canRecalculate: boolean;
  canConfirm: boolean;
  confirmed: boolean;
};

type DialogCompletion = (message: string) => void;

function RecalculationDialog({
  projectId,
  criteria,
  bidCount,
  onClose,
  onCompleted,
}: Pick<MatchingActionsProps, "projectId" | "criteria" | "bidCount"> & { onClose: () => void; onCompleted: DialogCompletion }) {
  const [state, action, pending] = useActionState(recalculateAction, initialMatchingActionState);

  return (
    <Modal
      description={`회수 목표와 운영 조건을 바꾸면 검증을 마친 입찰 ${bidCount}건을 다시 평가합니다.`}
      onClose={onClose}
      open
      title="매칭 조건 다시 계산"
    >
      {state.status === "success" ? (
        <div className="modal-result">
          <CheckCircle aria-hidden="true" size={34} weight="fill" />
          <strong>새 매칭안을 계산했습니다.</strong>
          <p>{state.message}</p>
          <button className="button button-primary" onClick={() => onCompleted(state.message ?? "매칭안을 다시 계산했습니다.")} type="button">결과 확인</button>
        </div>
      ) : (
        <form action={action} className="modal-form">
          <input name="projectId" type="hidden" value={projectId} />
          <label htmlFor="minimumCashRecovery">최소 현금 회수액</label>
          <div className="unit-input">
            <input defaultValue={criteria.minimumCashRecovery} id="minimumCashRecovery" max={MAX_PROJECT_CASH_RECOVERY} min="0" name="minimumCashRecovery" required step="10" type="number" />
            <span>만 원</span>
          </div>
          <label htmlFor="minimumReuseRate">최소 재사용률</label>
          <div className="unit-input">
            <input defaultValue={criteria.minimumReuseRate} id="minimumReuseRate" max="100" min="0" name="minimumReuseRate" required step="0.1" type="number" />
            <span>%</span>
          </div>
          <label htmlFor="maximumPickupRounds">최대 수거 횟수</label>
          <div className="unit-input">
            <input defaultValue={criteria.maximumPickupRounds} id="maximumPickupRounds" max="30" min="1" name="maximumPickupRounds" required step="1" type="number" />
            <span>회</span>
          </div>
          {state.status === "error" ? <p className="form-error" role="alert">{state.message}</p> : null}
          <div className="modal-actions">
            <button className="button button-ghost" onClick={onClose} type="button">취소</button>
            <button className="button button-primary" disabled={pending} type="submit">
              {pending ? "계산 중…" : "새 조건으로 계산"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ConfirmationDialog({
  projectId,
  result,
  idempotencyKey,
  onClose,
  onCompleted,
}: { projectId: string; result: MatchingResult } & {
  idempotencyKey: string;
  onClose: () => void;
  onCompleted: DialogCompletion;
}) {
  const [state, action, pending] = useActionState(confirmMatchAction, initialMatchingActionState);

  return (
    <Modal
      description="확정하면 자산 배정과 금액을 더 이상 바꿀 수 없으며, 결과가 수거 운영으로 넘어갑니다."
      onClose={onClose}
      open
      size="small"
      title="이 매칭안을 확정할까요?"
    >
      {state.status === "success" ? (
        <div className="modal-result">
          <CheckCircle aria-hidden="true" size={34} weight="fill" />
          <strong>매칭안이 확정되었습니다.</strong>
          <p>{state.message}</p>
          <button className="button button-primary" onClick={() => onCompleted(state.message ?? "매칭안이 확정되었습니다.")} type="button">확정 결과 보기</button>
        </div>
      ) : (
        <>
          <div className="confirm-summary">
            <div><span>현금 회수</span><strong>{formatNumber(result.cashRecovery)}만 원</strong></div>
            <div><span>비용 절감</span><strong>{formatNumber(result.costSavings)}만 원</strong></div>
            <div><span>순경제효과</span><strong>{formatNumber(result.netImpact)}만 원</strong></div>
            <div><span>재사용률</span><strong>{result.reuseRate.toFixed(1)}%</strong></div>
          </div>
          <div className="confirm-allocation-summary">
            <strong>자산군 배정 {result.allocations.length}건</strong>
            <ul>
              {result.allocations.map((allocation) => (
                <li key={allocation.id}>
                  <span>{allocation.assetGroupName}</span>
                  <b>{allocation.partnerName}</b>
                  <em>{formatNumber(allocation.quantity)}개</em>
                </li>
              ))}
            </ul>
          </div>
          <p className="confirm-notice"><Info aria-hidden="true" size={18} /> 확정 후에는 외부 결제사의 정산 상태를 별도로 확인합니다. 이 단계에서는 입금을 자동으로 처리하지 않습니다.</p>
          <form action={action}>
            <input name="projectId" type="hidden" value={projectId} />
            <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
            {state.status === "error" ? <p className="form-error" role="alert">{state.message}</p> : null}
            <div className="modal-actions">
              <button className="button button-ghost" onClick={onClose} type="button">취소</button>
              <button className="button button-primary" disabled={pending || !idempotencyKey} type="submit">
                {pending ? "확정 중…" : "확정하고 수거 운영으로 넘기기"}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

export function MatchingActions(props: MatchingActionsProps) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<"recalculate" | "confirm" | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const completeDialog = (message: string) => {
    setFeedback({ type: "success", message });
    setActiveDialog(null);
    router.refresh();
  };

  const openRecalculation = () => {
    setFeedback(null);
    setActiveDialog("recalculate");
    trackEvent("recalculation_opened", props.projectId);
  };

  const openConfirmation = () => {
    setFeedback(null);
    setIdempotencyKey(globalThis.crypto.randomUUID());
    setActiveDialog("confirm");
    trackEvent("confirmation_opened", props.projectId);
  };

  return (
    <>
      <div className="action-area">
        <div className="action-feedback" aria-live="polite">
          {feedback ? (
            <span className={feedback.type === "success" ? "feedback-success" : "feedback-error"}>
              {feedback.type === "success" ? <CheckCircle aria-hidden="true" size={19} /> : <WarningCircle aria-hidden="true" size={19} />}
              {feedback.message}
            </span>
          ) : null}
        </div>
        <div className="action-buttons">
          <Link className="button button-secondary" href={`/projects/${props.projectId}/bids`}>
            입찰 {props.bidCount}건 보기
          </Link>
          <button className="button button-secondary" disabled={!props.canRecalculate || props.confirmed} onClick={openRecalculation} type="button">
            조건 다시 계산
          </button>
          {props.confirmed ? (
            <Link className="button button-primary primary-action" href={`/projects/${props.projectId}/pickups`}>
              수거 운영 보기 <ArrowRight aria-hidden="true" size={18} />
            </Link>
          ) : (
            <button
              className="button button-primary primary-action"
              disabled={!props.canConfirm || !props.result?.criteriaPassed}
              onClick={openConfirmation}
              title={!props.canConfirm ? "확정 권한이 필요합니다." : undefined}
              type="button"
            >
              {props.canConfirm ? "매칭안 확정" : "확정 권한 요청"}
            </button>
          )}
        </div>
      </div>

      {activeDialog === "recalculate" ? (
        <RecalculationDialog bidCount={props.bidCount} criteria={props.criteria} onClose={() => setActiveDialog(null)} onCompleted={completeDialog} projectId={props.projectId} />
      ) : null}
      {activeDialog === "confirm" && props.result ? (
        <ConfirmationDialog idempotencyKey={idempotencyKey} onClose={() => setActiveDialog(null)} onCompleted={completeDialog} projectId={props.projectId} result={props.result} />
      ) : null}
    </>
  );
}
