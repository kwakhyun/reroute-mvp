export default function AppLoading() {
  return (
    <div className="dashboard-skeleton" aria-label="프로젝트 정보를 불러오는 중" aria-busy="true">
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
