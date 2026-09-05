import { CheckCircle, CurrencyKrw, LockKey, Receipt, Truck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { ProjectPreparation } from "@/components/app/project-preparation";
import { ContentHeader } from "@/components/app/content-header";
import { SettlementStatusForm } from "@/components/operations/settlement-status-form";
import { formatNumber } from "@/lib/format";
import { getProjectPlanSummary, getPickupOperations, getSettlement } from "@/server/services/dashboard";
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
    getProjectPlanSummary(projectId),
    getSettlement(projectId),
    getPickupOperations(projectId),
  ]));
  if (!dashboard.plan) return <ProjectPreparation projectId={projectId} projectName={dashboard.project.name} title="정산" />;
  const confirmed = dashboard.plan.status === "CONFIRMED";
  const escrowConfirmed = settlement?.status === "FUNDED" || settlement?.status === "RELEASED";
  const inspectionsComplete = confirmed && operations.length === dashboard.plan.pickupRounds && operations.every((operation) => operation.status === "INSPECTED");
  const released = settlement?.status === "RELEASED";
  const steps = [
    { title: "배분안 확정", body: confirmed ? "인수처와 거래 금액을 확정했습니다." : "승인자가 배분안을 확정해야 합니다.", icon: CheckCircle, complete: confirmed },
    { title: "외부 입금 확인", body: escrowConfirmed ? `결제사 확인 번호 ${settlement?.providerReference}로 ${formatNumber(dashboard.plan.cashRecovery)}만 원의 입금을 확인했습니다.` : "아직 결제사에서 입금 여부를 확인하지 않았습니다. 이 서비스는 자금을 보관하지 않습니다.", icon: LockKey, complete: escrowConfirmed },
    { title: "수거와 검수 완료", body: inspectionsComplete ? `${dashboard.plan.pickupRounds}회차 검수가 모두 완료되었습니다.` : "각 수거 회차의 검수 완료 기록이 필요합니다.", icon: Truck, complete: inspectionsComplete },
    { title: "지급 확인", body: released ? "결제사에서 지급 완료를 확인했습니다." : "검수가 끝나면 결제사의 지급 결과를 확인합니다.", icon: CurrencyKrw, complete: released },
  ];

  return (
    <div className="section-page">
      <ContentHeader backHref={`/projects/${projectId}/matching`} description="외부 결제사에서 확인한 입금과 지급 상태를 기록합니다." eyebrow={dashboard.project.name} title="정산" />
      <div className="notice-banner settlement-disclosure"><WarningCircle aria-hidden="true" size={20} /><span><strong>자금은 외부 결제사가 처리합니다.</strong> 이 서비스는 결제사에서 확인한 상태만 기록하며, 자금을 보관하거나 이체하지 않습니다.</span></div>
      <div className="settlement-summary">
        <div className="card settlement-value"><span><Receipt aria-hidden="true" size={19} /> 예상 매각 대금</span><strong>{formatNumber(dashboard.plan.cashRecovery)}만 원</strong></div>
        <div className="card settlement-value"><span>폐기비와 운반비 절감액</span><strong>{formatNumber(dashboard.plan.costSavings)}만 원</strong></div>
        <div className="card settlement-value settlement-total"><span>결제사 확인 상태</span><strong className="settlement-state-label">{settlement ? settlementLabels[settlement.status] : confirmed ? "확인 상태 없음" : "확정 전"}</strong></div>
      </div>
      <section className="card settlement-flow" aria-labelledby="settlement-flow-title">
        <h2 id="settlement-flow-title">정산 진행 단계</h2>
        <ol>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li className={step.complete ? "settlement-step-complete" : ""} key={step.title}>
                <span className="settlement-step-icon"><Icon aria-hidden="true" size={23} /></span>
                <div><small>{index + 1}단계</small><strong>{step.title}</strong><p>{step.body}</p></div>
                <b>{step.complete ? "확인 완료" : "미확인"}</b>
              </li>
            );
          })}
        </ol>
      </section>
      {settlement && dashboard.membershipRole === "APPROVER" ? <SettlementStatusForm projectId={projectId} settlement={settlement} version={settlement.updatedAt} /> : null}
    </div>
  );
}
