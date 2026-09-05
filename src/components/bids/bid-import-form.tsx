"use client";

import { TableScroll } from "@/components/ui/table-scroll";
import { ArrowClockwise, DownloadSimple, FileCsv } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { importBidsAction } from "@/app/actions/bids";
import { initialBidImportActionState, type BidImportActionState } from "@/lib/bid-import-action-state";
import { formatNumber } from "@/lib/format";

export function BidImportForm({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [actionState, action, pending] = useActionState(async (previous: { result: BidImportActionState; file: File | null }, formData: FormData) => {
    if (!file) return { file, result: { status: "error" as const, message: "입찰 CSV 파일을 선택해 주세요." } };
    formData.set("bidFile", file);
    try {
      return { file, result: await importBidsAction(previous.result, formData) };
    } catch {
      return { file, result: { status: "error" as const, message: "서버 응답을 확인하지 못했습니다. 현재 입찰 목록을 확인하고 다시 미리보기를 실행해 주세요." } };
    }
  }, { result: initialBidImportActionState, file: null as File | null });
  const state = actionState.file === file ? actionState.result : initialBidImportActionState;
  const preview = state.status === "preview" ? state.preview : null;

  return (
    <section className="card bid-import-card" aria-labelledby="bid-import-title">
      <div>
        <span className="section-icon"><FileCsv aria-hidden="true" size={24} /></span>
        <div>
          <h2 id="bid-import-title">입찰 일괄 가져오기</h2>
          <p>CSV를 먼저 검증하고 교체 내용을 확인합니다. 각 자산의 전체 수량을 인수할 입찰을 하나 이상 포함하고, 같은 확인 자료의 내용과 만료일을 일치시켜 주세요. 금액이 없으면 빈칸 대신 0을 입력합니다.</p>
        </div>
      </div>
      <label className="compact-file-field">
        <span>입찰 CSV 선택</span>
        <input accept=".csv,text/csv" disabled={pending} name="bidFile" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <form action={action} aria-busy={pending}>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="previewToken" type="hidden" value={preview?.token ?? ""} />
        {preview ? (
          <section className="bid-import-preview" aria-label="입찰 교체 미리보기">
            <h3>입찰 교체 미리보기</h3>
            <p>{file?.name}</p>
            <dl className="bid-import-summary">
              <div><dt>입찰 교체</dt><dd>기존 {formatNumber(preview.existingBidCount)}건 → 새 {formatNumber(preview.incomingBidCount)}건</dd></div>
              <div><dt>자산 / 인수처</dt><dd>{formatNumber(preview.assetGroupCount)}개 / {formatNumber(preview.partnerCount)}곳</dd></div>
              <div><dt>삭제될 배분안 초안</dt><dd>{formatNumber(preview.invalidatedDraftCount)}개</dd></div>
              <div><dt>예상 입찰 조합</dt><dd>{preview.combinationCount === null ? "계산 상한 초과" : `${formatNumber(preview.combinationCount)}개`} / 최대 {formatNumber(preview.combinationLimit)}개</dd></div>
            </dl>
            <p role="status" className={preview.canImport && preview.criteriaPassed ? "form-success" : "form-error"}>{preview.message}</p>
            <TableScroll label="가져올 입찰 미리보기 표">
              <table>
                <thead><tr><th scope="col">자산 항목</th><th scope="col">인수처</th><th scope="col">수량</th><th scope="col">매각 대금</th></tr></thead>
                <tbody>{preview.rows.map((row, index) => <tr key={index}><td>{row.assetGroupName}</td><td>{row.partnerName}</td><td>{formatNumber(row.quantity)}개</td><td>{formatNumber(row.cashRecovery)}만 원</td></tr>)}</tbody>
              </table>
            </TableScroll>
            <p>전체 {formatNumber(preview.incomingBidCount)}건 중 처음 {preview.rows.length}건을 표시합니다. 교체하면 기존 입찰과 배분안 초안이 삭제됩니다.</p>
          </section>
        ) : null}
        <div className="bid-import-actions">
          <a className="button button-secondary" download href={`/api/v1/projects/${projectId}/bids/template`}>
            <DownloadSimple aria-hidden="true" size={17} /> 입찰 CSV 템플릿
          </a>
          <button className="button button-secondary" disabled={pending || !file} name="intent" value="preview" type="submit">
            <ArrowClockwise aria-hidden="true" size={17} /> {pending ? "처리 중…" : preview ? "미리보기 다시 확인" : "CSV 검증 및 미리보기"}
          </button>
          {preview ? <button className="button button-primary" disabled={pending || !preview.canImport} name="intent" value="commit" type="submit">{pending ? "처리 중…" : "확인한 내용으로 입찰 교체"}</button> : null}
        </div>
        {state.status === "success" || state.status === "error" ? (
          <p className={state.status === "success" ? "form-success" : "form-error"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>
        ) : null}
      </form>
    </section>
  );
}
