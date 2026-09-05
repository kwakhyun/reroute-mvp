import { TableScroll } from "@/components/ui/table-scroll";
import { CheckCircle, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { ContentHeader } from "@/components/app/content-header";
import { BidImportForm } from "@/components/bids/bid-import-form";
import { PartnerMark } from "@/components/matching/partner-mark";
import { formatKoreanDate, formatNumber } from "@/lib/format";
import { getProjectBidPage, BID_PAGE_SIZE } from "@/server/services/project-bids";
import { projectPageData } from "../project-page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "입찰" };

export default async function BidsPage({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string; asset?: string; selected?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const asset = typeof query.asset === "string" ? query.asset : "";
  const selectedOnly = query.selected === "true";
  const dashboard = await projectPageData(getProjectBidPage(projectId, { page: Number(query.page), assetGroupId: asset, selectedOnly }));
  const bidRows = dashboard.rows;
  const pageHref = (page: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (asset) params.set("asset", asset);
    if (selectedOnly) params.set("selected", "true");
    return `/projects/${projectId}/bids?${params}`;
  };

  return (
    <div className="section-page">
      <ViewTracker event="bids_opened" projectId={projectId} />
      <ContentHeader
        action={
          <a className="button button-secondary" download href={`/api/v1/projects/${projectId}/bids/export`}>
            <DownloadSimple aria-hidden="true" size={18} /> CSV 내보내기
          </a>
        }
        backHref={`/projects/${projectId}/matching`}
        description="인수처별 매각 대금, 비용 절감액, 확인 상태와 수거 가능일을 비교합니다. 사업자 정보와 처리 자격이 확인되지 않은 인수처는 배분 대상에서 제외됩니다."
        eyebrow={dashboard.project.name}
        title={`인수처 입찰 ${formatNumber(dashboard.total)}건`}
      />
      {dashboard.membershipRole === "APPROVER" && dashboard.project.status !== "CONFIRMED" ? (
        <details className="bid-import-disclosure">
          <summary>CSV로 입찰 가져오기</summary>
          <BidImportForm projectId={projectId} />
        </details>
      ) : null}
      <form className="bid-filters" method="get" action={`/projects/${projectId}/bids`} aria-label="입찰 필터">
        <label>자산 항목
          <select name="asset" defaultValue={asset} key={asset}>
            <option value="">전체 자산</option>
            {dashboard.assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="bid-filter-checkbox"><input type="checkbox" name="selected" value="true" defaultChecked={selectedOnly} key={String(selectedOnly)} /> 배분안 포함만 보기</label>
        <button type="submit" className="button button-secondary">필터 적용</button>
        {asset || selectedOnly ? <Link className="button button-ghost" href={`/projects/${projectId}/bids`}>필터 초기화</Link> : null}
      </form>
      <section className="card full-table-card" aria-label="입찰 목록">
        <TableScroll label="입찰 비교 표">
          <table className="bids-table">
            <thead>
              <tr>
                <th scope="col">배분안</th>
                <th scope="col">인수처</th>
                <th scope="col">자산 항목</th>
                <th scope="col">수량</th>
                <th scope="col">매각 대금</th>
                <th scope="col">비용 절감액</th>
                <th scope="col">성과</th>
                <th scope="col">수거 가능일</th>
              </tr>
            </thead>
            <tbody>
              {bidRows.length === 0 ? <tr><td colSpan={8}>표시할 입찰이 없습니다. 필터를 조정하거나 입찰 CSV를 가져와 주세요.</td></tr> : null}
              {bidRows.map((bid) => {
                const isSelected = bid.isSelected;
                return (
                  <tr className={isSelected ? "bid-selected" : undefined} key={bid.id}>
                    <td>{isSelected ? <span className="selected-mark"><CheckCircle aria-hidden="true" size={18} weight="fill" /> 포함</span> : <span className="muted-dash">—</span>}</td>
                    <td>
                      <div className="partner-cell">
                        <PartnerMark type={bid.partnerType} />
                        <div><strong>{bid.partnerName}</strong><span className={`verification-badge ${bid.isVerified ? `verification-${bid.partnerType.toLowerCase()}` : "verification-pending"}`}>{bid.isVerified ? `${bid.verificationLabel} 완료` : "인수처 확인 필요, 배분 제외"}</span>{bid.isVerified && bid.verificationReference ? <small className="verification-evidence">확인 자료: {bid.verificationReference}</small> : null}</div>
                      </div>
                    </td>
                    <td>{bid.assetGroupName}</td>
                    <td className="numeric-cell">{bid.quantity}개</td>
                    <td className="numeric-cell">{bid.cashRecovery ? `${formatNumber(bid.cashRecovery)}만 원` : "—"}</td>
                    <td className="numeric-cell">{bid.costSavings ? `${formatNumber(bid.costSavings)}만 원` : "—"}</td>
                    <td className="metric-cell"><small>{bid.performanceLabel}</small><strong>{bid.performanceRate}%</strong></td>
                    <td className="numeric-cell">{formatKoreanDate(bid.pickupDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </section>
      <nav className="bid-pagination" aria-label="입찰 페이지">
        <p>총 {formatNumber(dashboard.total)}건, {dashboard.total ? formatNumber((dashboard.page - 1) * BID_PAGE_SIZE + 1) : 0}–{formatNumber(Math.min(dashboard.page * BID_PAGE_SIZE, dashboard.total))}건 표시</p>
        <span aria-current="page">{dashboard.page} / {dashboard.pageCount} 페이지</span>
        {dashboard.page > 1 ? <Link className="button button-secondary" href={pageHref(dashboard.page - 1)}>이전 페이지</Link> : null}
        {dashboard.page < dashboard.pageCount ? <Link className="button button-secondary" href={pageHref(dashboard.page + 1)}>다음 페이지</Link> : null}
      </nav>
    </div>
  );
}
