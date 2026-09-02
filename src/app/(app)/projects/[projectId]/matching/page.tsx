import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { AssetBatchTable } from "@/components/matching/asset-batch-table";
import { DecisionCriteria } from "@/components/matching/decision-criteria";
import { KpiSummary } from "@/components/matching/kpi-summary";
import { MatchProposalTable } from "@/components/matching/match-proposal-table";
import { MatchingActions } from "@/components/matching/matching-actions";
import { ProjectHeader } from "@/components/matching/project-header";
import { TrustStrip } from "@/components/matching/trust-strip";
import { getMatchingDashboard } from "@/server/services/dashboard";
import { projectPageData } from "../project-page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "추천 배분안" };

export default async function MatchingPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const dashboard = await projectPageData(getMatchingDashboard(projectId));
  if (!dashboard) {
    notFound();
  }

  const { project, plan } = dashboard;
  if (!plan) {
    const canRecalculate = dashboard.membershipRole === "MANAGER" || dashboard.membershipRole === "APPROVER";
    return (
      <div className="dashboard-page">
        <ProjectHeader batchLabel={project.batchLabel} name={project.name} status={project.status} updatedAt={project.updatedAt} />
        <div className="content-empty-state">
          <h2>아직 계산된 배분안이 없습니다.</h2>
          <p>{dashboard.bidCount > 0 ? "모든 자산 항목에 사업자 정보와 처리 자격이 확인된 인수처의 입찰이 있는지 살펴본 뒤 배분안을 계산해 주세요." : "자산 목록은 준비되었습니다. 사업자 정보와 처리 자격이 확인된 인수처의 입찰을 가져오면 배분안을 계산할 수 있습니다."}</p>
          <a className="button button-secondary" href={`/projects/${projectId}/assets`}>자산 목록 확인</a>
        </div>
        <MatchingActions
          bidCount={dashboard.bidCount}
          canConfirm={false}
          canRecalculate={canRecalculate && dashboard.bidCount > 0}
          confirmed={false}
          criteria={{
            minimumCashRecovery: project.minimumCashRecovery,
            minimumReuseRate: project.minimumReuseRate,
            maximumPickupRounds: project.maximumPickupRounds,
          }}
          projectId={projectId}
          result={null}
        />
      </div>
    );
  }

  const confirmed = plan.status === "CONFIRMED";
  const canRecalculate = dashboard.membershipRole === "MANAGER" || dashboard.membershipRole === "APPROVER";
  const canConfirm = dashboard.membershipRole === "APPROVER";

  return (
    <div className="dashboard-page">
      <ViewTracker projectId={projectId} />
      <ProjectHeader batchLabel={project.batchLabel} name={project.name} status={project.status} updatedAt={project.updatedAt} />

      <div className="summary-grid">
        <KpiSummary
          cashRecovery={plan.cashRecovery}
          confirmed={confirmed}
          costSavings={plan.costSavings}
          netImpact={plan.netImpact}
          reuseRate={plan.reuseRate}
        />
        <DecisionCriteria
          cashRecovery={plan.cashRecovery}
          maximumPickupRounds={project.maximumPickupRounds}
          minimumCashRecovery={project.minimumCashRecovery}
          minimumReuseRate={project.minimumReuseRate}
          pickupRounds={plan.pickupRounds}
          reuseRate={plan.reuseRate}
        />
      </div>

      <div className="matching-grid">
        <AssetBatchTable assets={dashboard.assets} />
        <MatchProposalTable
          allocations={dashboard.allocations}
          cashRecovery={plan.cashRecovery}
          confirmed={confirmed}
          costSavings={plan.costSavings}
          pickupRounds={plan.pickupRounds}
          reuseRate={plan.reuseRate}
          totalQuantity={project.assetCount}
        />
      </div>

      <TrustStrip />
      <MatchingActions
        bidCount={dashboard.bidCount}
        canConfirm={canConfirm}
        canRecalculate={canRecalculate}
        confirmed={confirmed}
        criteria={{
          minimumCashRecovery: project.minimumCashRecovery,
          minimumReuseRate: project.minimumReuseRate,
          maximumPickupRounds: project.maximumPickupRounds,
        }}
        projectId={projectId}
        result={{
          cashRecovery: plan.cashRecovery,
          costSavings: plan.costSavings,
          netImpact: plan.netImpact,
          reuseRate: plan.reuseRate,
          pickupRounds: plan.pickupRounds,
          criteriaPassed: plan.criteriaPassed,
          allocations: dashboard.allocations.map((allocation) => ({
            id: allocation.id,
            assetGroupName: allocation.assetGroupName,
            partnerName: allocation.partnerName,
            quantity: allocation.quantity,
          })),
        }}
      />
    </div>
  );
}
