"use client";

import { DownloadSimple, FileCsv, Plus } from "@phosphor-icons/react";
import { useActionState } from "react";
import { createProjectAction } from "@/app/actions/projects";
import { initialProjectActionState } from "@/lib/project-action-state";
import { MAX_PROJECT_CASH_RECOVERY } from "@/lib/domain-constraints";

type OrganizationOption = { id: string; name: string; role: "VIEWER" | "MANAGER" | "APPROVER" };

export function ProjectCreateForm({ organizations }: { organizations: OrganizationOption[] }) {
  const [state, action, pending] = useActionState(createProjectAction, initialProjectActionState);
  const writable = organizations.filter((organization) => organization.role !== "VIEWER");

  if (writable.length === 0) {
    return <div className="notice-banner"><span><strong>프로젝트 생성 권한이 없습니다.</strong> 조직 승인자에게 매니저 권한을 요청해 주세요.</span></div>;
  }

  return (
    <form action={action} className="card project-create-form">
      <div className="form-section-heading">
        <span>1</span>
        <div><h2>프로젝트 정보</h2><p>회수 대상과 의사결정 기준을 입력합니다.</p></div>
      </div>
      <div className="form-grid">
        <label><span>조직</span><select defaultValue={writable[0].id} name="organizationId" required>{writable.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
        <label><span>프로젝트명</span><input maxLength={80} name="name" placeholder="예: 판교 오피스 이전" required /></label>
        <label><span>위치</span><input maxLength={120} name="location" placeholder="예: 경기 성남시 분당구" required /></label>
        <label><span>자산 묶음 설명 <small>선택</small></span><input maxLength={120} name="batchLabel" placeholder="입력하지 않으면 자산 수량으로 자동 작성됩니다" /></label>
        <label><span>최소 현금 회수액</span><div className="unit-input"><input defaultValue="0" max={MAX_PROJECT_CASH_RECOVERY} min="0" name="minimumCashRecovery" required step="10" type="number" /><b>만 원</b></div><small>자산 CSV의 회수 기준액 합계보다 낮으면 합계가 자동 적용됩니다.</small></label>
        <label><span>최소 재사용률</span><div className="unit-input"><input defaultValue="70" max="100" min="0" name="minimumReuseRate" required step="0.1" type="number" /><b>%</b></div></label>
        <label><span>최대 수거 횟수</span><div className="unit-input"><input defaultValue="3" max="30" min="1" name="maximumPickupRounds" required type="number" /><b>회</b></div></label>
      </div>

      <div className="form-section-heading form-section-divider">
        <span>2</span>
        <div><h2>자산 CSV</h2><p>자산군은 최대 500개, 파일은 1MB까지 한 번에 가져올 수 있습니다. 이미지 경로는 템플릿에 안내된 네 가지 중에서 선택합니다.</p></div>
      </div>
      <label className="file-drop-field">
        <FileCsv aria-hidden="true" size={30} />
        <strong>자산 CSV 파일 선택</strong>
        <span>필수 열 7개를 포함한 UTF-8 CSV</span>
        <input accept=".csv,text/csv" name="assetFile" required type="file" />
      </label>
      <a className="template-download" download href="/templates/asset-groups-template.csv"><DownloadSimple aria-hidden="true" size={17} /> CSV 템플릿 다운로드</a>
      {state.status === "error" ? <p className="form-error" role="alert">{state.message}</p> : null}
      <div className="form-submit-row">
        <button className="button button-primary" disabled={pending} type="submit"><Plus aria-hidden="true" size={18} /> {pending ? "프로젝트 생성 중…" : "프로젝트 생성"}</button>
      </div>
    </form>
  );
}
