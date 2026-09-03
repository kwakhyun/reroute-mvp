export default function ProjectsLoading() {
  return (
    <div className="dashboard-skeleton" aria-label="화면을 불러오는 중" aria-busy="true" role="status">
      <span className="sr-only">요청한 화면을 불러오고 있습니다.</span>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton-grid skeleton-grid-main">
        <div className="skeleton skeleton-table" />
        <div className="skeleton skeleton-table" />
      </div>
    </div>
  );
}
