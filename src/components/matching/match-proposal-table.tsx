import { formatKoreanDate, formatNumber } from "@/lib/format";
import { toSeoulDateKey } from "@/lib/date";
import type { PartnerType } from "@/server/db/schema";
import { PartnerMark } from "./partner-mark";

type Allocation = {
  id: string;
  assetGroupId: string;
  assetGroupName: string;
  assetDisplayOrder: number;
  quantity: number;
  cashRecovery: number;
  costSavings: number;
  performanceLabel: string;
  performanceRate: number;
  pickupDate: string;
  partnerName: string;
  partnerType: PartnerType;
  verificationLabel: string;
  verificationReference: string | null;
  verifiedAt: string | null;
  verificationExpiresAt: string | null;
  isVerified: boolean;
};

type MatchProposalTableProps = {
  allocations: Allocation[];
  totalQuantity: number;
  cashRecovery: number;
  costSavings: number;
  reuseRate: number;
  pickupRounds: number;
  confirmed: boolean;
};

const partnerOrder: Record<PartnerType, number> = {
  BUSINESS: 1,
  EMPLOYEE: 2,
  NONPROFIT: 3,
  RECYCLER: 4,
};

export function MatchProposalTable(props: MatchProposalTableProps) {
  const allocations = props.allocations.toSorted(
    (left, right) => left.assetDisplayOrder - right.assetDisplayOrder || partnerOrder[left.partnerType] - partnerOrder[right.partnerType],
  );

  return (
    <section className="card data-card proposal-card" aria-labelledby="proposal-title">
      <div className="proposal-heading">
        <h2 id="proposal-title">{props.confirmed ? "확정 배분안" : "추천 배분안"} (총 {formatNumber(props.totalQuantity)}개)</h2>
        {props.confirmed ? <span className="status-badge status-confirmed">수거 일정 등록 가능</span> : null}
      </div>
      <p aria-hidden="true" className="table-scroll-hint">표를 좌우로 밀어 전체 항목을 확인하세요.</p>
      <div aria-label="자산 배분안 표" className="table-scroll" role="region" tabIndex={0}>
        <table className="proposal-table">
          <colgroup>
            <col className="proposal-col-asset" />
            <col className="proposal-col-partner" />
            <col className="proposal-col-quantity" />
            <col className="proposal-col-cash" />
            <col className="proposal-col-savings" />
            <col className="proposal-col-performance" />
            <col className="proposal-col-pickup" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">자산 항목</th>
              <th scope="col">인수처</th>
              <th scope="col">수량</th>
              <th scope="col">매각 대금</th>
              <th scope="col">비용 절감액</th>
              <th scope="col">성과 지표</th>
              <th scope="col">수거 일정</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td><strong>{allocation.assetGroupName}</strong></td>
                <td>
                  <div className="partner-cell">
                    <PartnerMark type={allocation.partnerType} />
                    <div>
                      <strong>{allocation.partnerName}</strong>
                      <span className={`verification-badge ${allocation.isVerified ? `verification-${allocation.partnerType.toLowerCase()}` : "verification-pending"}`}>
                        {allocation.isVerified ? `${allocation.verificationLabel} 완료` : "인수처 확인 후 다시 계산하세요"}
                      </span>
                      {allocation.isVerified && allocation.verificationReference ? (
                        <small className="verification-evidence">확인 자료: {allocation.verificationReference}</small>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="numeric-cell">{formatNumber(allocation.quantity)}개</td>
                <td className="numeric-cell">{allocation.cashRecovery ? `${formatNumber(allocation.cashRecovery)}만 원` : "—"}</td>
                <td className="numeric-cell">{allocation.costSavings ? `${formatNumber(allocation.costSavings)}만 원` : "—"}</td>
                <td className="metric-cell">
                  <small>{allocation.performanceLabel}</small>
                  <strong>{allocation.performanceRate.toFixed(allocation.performanceRate % 1 === 0 ? 0 : 1)}%</strong>
                </td>
                <td>
                  <time className="pickup-date" dateTime={toSeoulDateKey(allocation.pickupDate)}>
                    {formatKoreanDate(allocation.pickupDate)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">합계</th>
              <td>자산 항목 {allocations.length}개 배정</td>
              <td className="numeric-cell">{formatNumber(props.totalQuantity)}개</td>
              <td className="numeric-cell total-accent">{formatNumber(props.cashRecovery)}만 원</td>
              <td className="numeric-cell total-accent">{formatNumber(props.costSavings)}만 원</td>
              <td className="metric-cell total-accent">
                <small>재사용률</small>
                <strong>{props.reuseRate.toFixed(1)}%</strong>
              </td>
              <td className="numeric-cell">수거 {props.pickupRounds}회</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
