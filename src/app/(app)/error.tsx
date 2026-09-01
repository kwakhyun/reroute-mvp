"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="content-empty-state" role="alert">
      <h2>프로젝트 정보를 불러오지 못했습니다.</h2>
      <p>네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
      <button className="button button-primary" onClick={reset} type="button">
        다시 시도
      </button>
    </div>
  );
}
