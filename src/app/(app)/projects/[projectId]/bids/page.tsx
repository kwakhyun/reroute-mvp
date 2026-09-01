import { CheckCircle, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { ContentHeader } from "@/components/app/content-header";
import { BidImportForm } from "@/components/bids/bid-import-form";
import { PartnerMark } from "@/components/matching/partner-mark";
import { formatKoreanDate, formatNumber } from "@/lib/format";
import { getMatchingDashboard, getProjectBids } from "@/server/services/dashboard";
import { projectPageData } from "../project-page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "입찰" };

export default async function BidsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [dashboard, bidRows] = await projectPageData(Promise.all([getMatchingDashboard(projectId), getProjectBids(projectId)]));
  if (!dashboard) notFound();
  const selected = new Set(dashboard.allocations.map((allocation) => allocation.bidId));

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
        description="입찰별 현금 회수액, 비용 절감액, 검증 상태와 수거 가능일을 비교합니다. 검증을 마치지 않은 수요처는 매칭에서 제외됩니다."
        eyebrow={dashboard.project.name}
        title={`입찰 ${bidRows.length}건`}
      />
      {dashboard.membershipRole === "APPROVER" && dashboard.project.status !== "CONFIRMED" ? (
        <BidImportForm projectId={projectId} />
      ) : null}
      <section className="card full-table-card" aria-label="입찰 목록">
        <p aria-hidden="true" className="table-scroll-hint">표를 좌우로 밀어 전체 항목을 확인하세요.</p>
        <div aria-label="입찰 비교 표" className="table-scroll" role="region" tabIndex={0}>
          <table className="bids-table">
            <thead>
              <tr>
                <th scope="col">추천</th>
                <th scope="col">수요처</th>
                <th scope="col">자산군</th>
                <th scope="col">수량</th>
                <th scope="col">현금 회수</th>
                <th scope="col">비용 절감</th>
                <th scope="col">성과</th>
                <th scope="col">수거 가능일</th>
              </tr>
            </thead>
            <tbody>
              {bidRows.map((bid) => {
                const isSelected = selected.has(bid.id);
                return (
                  <tr className={isSelected ? "bid-selected" : undefined} key={bid.id}>
                    <td>{isSelected ? <span className="selected-mark"><CheckCircle aria-hidden="true" size={18} weight="fill" /> 선택</span> : <span className="muted-dash">—</span>}</td>
                    <td>
                      <div className="partner-cell">
                        <PartnerMark type={bid.partnerType} />
                        <div><strong>{bid.partnerName}</strong><span className={`verification-badge ${bid.isVerified ? `verification-${bid.partnerType.toLowerCase()}` : "verification-pending"}`}>{bid.isVerified ? `검증 완료: ${bid.verificationLabel}` : "검증 전, 매칭 제외"}</span>{bid.isVerified && bid.verificationReference ? <small className="verification-evidence">검증 근거: {bid.verificationReference}</small> : null}</div>
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
        </div>
      </section>
    </div>
  );
}
