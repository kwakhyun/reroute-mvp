"use client";

import { ArrowClockwise, DownloadSimple, FileCsv } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { importBidsAction } from "@/app/actions/bids";
import { initialBidImportActionState } from "@/lib/bid-import-action-state";

export function BidImportForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(importBidsAction, initialBidImportActionState);

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <section className="card bid-import-card" aria-labelledby="bid-import-title">
      <div>
        <span className="section-icon"><FileCsv aria-hidden="true" size={24} /></span>
        <div>
          <h2 id="bid-import-title">입찰 일괄 가져오기</h2>
          <p>기존 입찰 목록을 새 CSV 내용으로 교체합니다. 수요처별 검증 근거를 입력하고, 각 자산군의 전체 수량을 인수하는 제안을 하나 이상 포함해 주세요.</p>
        </div>
      </div>
      <form action={action}>
        <input name="projectId" type="hidden" value={projectId} />
        <label className="compact-file-field">
          <span>입찰 CSV 선택</span>
          <input accept=".csv,text/csv" name="bidFile" required type="file" />
        </label>
        <div className="bid-import-actions">
          <a className="button button-secondary" download href={`/api/v1/projects/${projectId}/bids/template`}>
            <DownloadSimple aria-hidden="true" size={17} /> 현재 자산 템플릿
          </a>
          <button className="button button-primary" disabled={pending} type="submit">
            <ArrowClockwise aria-hidden="true" size={17} /> {pending ? "검증하는 중…" : "검증하고 가져오기"}
          </button>
        </div>
      </form>
      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
