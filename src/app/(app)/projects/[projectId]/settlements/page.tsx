import { CheckCircle, CurrencyKrw, LockKey, Receipt, Truck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/app/content-header";
import { SettlementStatusForm } from "@/components/operations/settlement-status-form";
import { formatNumber } from "@/lib/format";
import { getMatchingDashboard, getPickupOperations, getSettlement } from "@/server/services/dashboard";
import { projectPageData } from "../project-page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "정산" };

const settlementLabels = {
  NOT_CONNECTED: "결제사 미연동",
  PENDING: "입금 확인 중",
  FUNDED: "입금 확인",
  RELEASED: "지급 확인",
  FAILED: "확인 실패",
} as const;

export default async function SettlementsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [dashboard, settlement, operations] = await projectPageData(Promise.all([
    getMatchingDashboard(projectId),
    getSettlement(projectId),
    getPickupOperations(projectId),
  ]));
  if (!dashboard || !dashboard.plan) notFound();
  const confirmed = dashboard.plan.status === "CONFIRMED";
  const escrowConfirmed = settlement?.status === "FUNDED" || settlement?.status === "RELEASED";
  const inspectionsComplete = confirmed && operations.length === dashboard.plan.pickupRounds && operations.every((operation) => operation.status === "INSPECTED");
  const released = settlement?.status === "RELEASED";
  const steps = [
    { title: "매칭안 확정", body: confirmed ? "거래 대상과 금액이 확정되었습니다." : "승인자가 매칭안을 확정해야 합니다.", icon: CheckCircle, complete: confirmed },
    { title: "외부 입금 확인", body: escrowConfirmed ? `결제사 참조값 ${settlement?.providerReference}로 ${formatNumber(dashboard.plan.cashRecovery)}만 원 입금을 확인했습니다.` : "결제사 연동 또는 수동 대조 전입니다. 이 서비스가 자금을 보관하고 있지 않습니다.", icon: LockKey, complete: escrowConfirmed },
    { title: "수거와 검수 완료", body: inspectionsComplete ? `${dashboard.plan.pickupRounds}회차 검수가 모두 완료되었습니다.` : "각 수거 회차의 검수 완료 기록이 필요합니다.", icon: Truck, complete: inspectionsComplete },
    { title: "지급 확인", body: released ? "결제사에서 지급 완료를 확인했습니다." : "검수 완료 후 결제사 지급 결과를 대조합니다.", icon: CurrencyKrw, complete: released },
  ];

  return (
    <div className="section-page">
      <ContentHeader backHref={`/projects/${projectId}/matching`} description="이 화면은 외부 결제사의 상태를 기록하고 대조합니다. 자금 보관이나 이체를 직접 수행하지 않습니다." eyebrow={dashboard.project.name} title="정산" />
      <div className="notice-banner settlement-disclosure"><WarningCircle aria-hidden="true" size={20} /><span><strong>외부 정산 연동 고지</strong> 현재 MVP는 결제사 상태를 수동 기록하는 단계이며 에스크로 기능을 제공하지 않습니다.</span></div>
      <div className="settlement-summary">
        <div className="card settlement-value"><span><Receipt aria-hidden="true" size={19} /> 현금 회수 예정</span><strong>{formatNumber(dashboard.plan.cashRecovery)}만 원</strong></div>
        <div className="card settlement-value"><span>비용 절감</span><strong>{formatNumber(dashboard.plan.costSavings)}만 원</strong></div>
        <div className="card settlement-value settlement-total"><span>외부 확인 상태</span><strong className="settlement-state-label">{settlement ? settlementLabels[settlement.status] : confirmed ? "상태 레코드 없음" : "확정 전"}</strong></div>
      </div>
      <section className="card settlement-flow" aria-labelledby="settlement-flow-title">
        <h2 id="settlement-flow-title">정산 진행 단계</h2>
        <ol>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li className={step.complete ? "settlement-step-complete" : ""} key={step.title}>
                <span className="settlement-step-icon"><Icon aria-hidden="true" size={23} /></span>
                <div><small>STEP {index + 1}</small><strong>{step.title}</strong><p>{step.body}</p></div>
                <b>{step.complete ? "확인 완료" : "미확인"}</b>
              </li>
            );
          })}
        </ol>
      </section>
      {settlement && dashboard.membershipRole === "APPROVER" ? <SettlementStatusForm projectId={projectId} settlement={settlement} /> : null}
    </div>
  );
}
