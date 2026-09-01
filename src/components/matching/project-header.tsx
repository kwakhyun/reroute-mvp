import { Clock } from "@phosphor-icons/react/dist/ssr";
import { formatUpdatedAt } from "@/lib/format";

type ProjectHeaderProps = {
  name: string;
  batchLabel: string;
  updatedAt: string;
  status: "DRAFT" | "MATCHING" | "CONFIRMED";
};

export function ProjectHeader({ name, batchLabel, updatedAt, status }: ProjectHeaderProps) {
  return (
    <header className="project-header">
      <div className="project-title-block">
        <span className="project-eyebrow">프로젝트</span>
        <div className="project-title-line">
          <h1>{name}</h1>
          <span className="project-title-divider" aria-hidden="true" />
          <span className="batch-label-prefix">자산 묶음</span>
          <strong>{batchLabel}</strong>
          {status === "CONFIRMED" ? <span className="status-badge status-confirmed">확정</span> : null}
        </div>
      </div>
      <span className="last-updated">
        <Clock aria-hidden="true" size={18} />
        최종 업데이트: {formatUpdatedAt(updatedAt)}
      </span>
    </header>
  );
}
