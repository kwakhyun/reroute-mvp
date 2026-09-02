import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/app/content-header";
import { AssetBatchTable } from "@/components/matching/asset-batch-table";
import { formatNumber } from "@/lib/format";
import { getMatchingDashboard } from "@/server/services/dashboard";
import { projectPageData } from "../project-page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "자산" };

export default async function AssetsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const dashboard = await projectPageData(getMatchingDashboard(projectId));
  if (!dashboard) notFound();

  const minimumRecovery = dashboard.assets.reduce((sum, asset) => sum + asset.minimumRecovery, 0);

  return (
    <div className="section-page">
      <ContentHeader
        backHref={`/projects/${projectId}/matching`}
        description="자산 항목별 상태 등급, 수량과 최소 매각 금액을 확인합니다."
        eyebrow={dashboard.project.name}
        title="자산 목록"
      />
      <div className="compact-metrics">
        <div><span>총 자산</span><strong>{formatNumber(dashboard.project.assetCount)}개</strong></div>
        <div><span>자산 항목</span><strong>{dashboard.assets.length}개</strong></div>
        <div><span>항목별 최소 금액 합계</span><strong>{formatNumber(minimumRecovery)}만 원</strong></div>
      </div>
      <AssetBatchTable assets={dashboard.assets} />
    </div>
  );
}
