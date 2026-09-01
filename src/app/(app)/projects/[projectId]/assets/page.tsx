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
        description="검수 등급과 배치 현금 회수 하한을 구성하는 자산군별 기준액입니다."
        eyebrow={dashboard.project.name}
        title="자산 배치"
      />
      <div className="compact-metrics">
        <div><span>총 자산</span><strong>{formatNumber(dashboard.project.assetCount)}개</strong></div>
        <div><span>자산군</span><strong>{dashboard.assets.length}개</strong></div>
        <div><span>배치 회수 하한</span><strong>{formatNumber(minimumRecovery)}만 원</strong></div>
      </div>
      <AssetBatchTable assets={dashboard.assets} />
    </div>
  );
}
