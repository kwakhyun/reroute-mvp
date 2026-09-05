import Link from "next/link";
import { ContentHeader } from "./content-header";

export function ProjectPreparation({ projectId, projectName, title }: { projectId: string; projectName: string; title: string }) {
  return <div className="section-page">
    <ContentHeader backHref={`/projects/${projectId}/matching`} eyebrow={projectName} title={title} description="배분안이 준비되면 다음 단계를 진행할 수 있습니다." />
    <section className="card content-empty-state" aria-labelledby="preparation-title">
      <h2 id="preparation-title">배분안을 먼저 계산해 주세요.</h2>
      <p>입찰을 확인하고 배분안을 계산하면 수거 일정과 정산 예정 금액을 볼 수 있습니다. 확정 후 진행 상태를 기록할 수 있습니다.</p>
      <div className="preparation-actions">
        <Link className="button button-primary" href={`/projects/${projectId}/matching`}>배분안 준비하기</Link>
        <Link className="button button-secondary" href={`/projects/${projectId}/bids`}>입찰 확인하기</Link>
      </div>
    </section>
  </div>;
}
