import { ArrowRight, Buildings, ChartLineUp, Package, Plus } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentHeader } from "@/components/app/content-header";
import { formatNumber, formatUpdatedAt } from "@/lib/format";
import { getProjectCreationOrganizations, getProjectList } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "프로젝트" };

export default async function ProjectsPage() {
  const [projects, organizations] = await Promise.all([getProjectList(), getProjectCreationOrganizations()]);
  const canCreate = organizations.some((organization) => organization.role !== "VIEWER");

  return (
    <div className="section-page">
      <ContentHeader
        action={canCreate ? <Link className="button button-primary" href="/projects/new"><Plus aria-hidden="true" size={18} /> 새 프로젝트</Link> : undefined}
        description="회수 목표, 입찰, 매칭안과 수거 운영 상태를 프로젝트 단위로 관리합니다."
        eyebrow="PROJECTS"
        title="프로젝트"
      />
      <div className="project-list">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-card-top">
              <span className="project-card-icon"><Buildings aria-hidden="true" size={28} /></span>
              <span className={`status-badge ${project.status === "CONFIRMED" ? "status-confirmed" : "status-progress"}`}>
                {project.status === "CONFIRMED" ? "확정" : project.status === "MATCHING" ? "매칭 중" : "준비 중"}
              </span>
            </div>
            <h2>{project.name}</h2>
            <p>{project.location} · {project.batchLabel}</p>
            <dl className="project-card-metrics">
              <div><dt><Package aria-hidden="true" size={16} /> 자산</dt><dd>{formatNumber(project.assetCount)}개</dd></div>
              <div><dt><ChartLineUp aria-hidden="true" size={16} /> 순경제효과</dt><dd>{project.plan ? `${formatNumber(project.plan.netImpact)}만 원` : "계산 전"}</dd></div>
              <div><dt>재사용률</dt><dd>{project.plan ? `${project.plan.reuseRate.toFixed(1)}%` : "—"}</dd></div>
            </dl>
            <div className="project-card-footer">
              <span>업데이트 {formatUpdatedAt(project.updatedAt)}</span>
              <Link href={`/projects/${project.id}/matching`}>
                매칭안 보기 <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {projects.length === 0 ? (
        <div className="content-empty-state">
          <Buildings aria-hidden="true" size={36} />
          <h2>첫 프로젝트를 만들어 보세요.</h2>
          <p>자산 CSV를 가져오면 회수 목표와 매칭 검증을 바로 시작할 수 있습니다.</p>
          {canCreate ? <Link className="button button-primary" href="/projects/new">프로젝트 만들기</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
