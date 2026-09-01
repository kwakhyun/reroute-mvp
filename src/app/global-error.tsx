"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <main className="centered-page">
          <div className="message-card">
            <span className="eyebrow">오류</span>
            <h1>화면을 불러오지 못했습니다.</h1>
            <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 운영 담당자에게 문의해 주세요.</p>
            <button className="button button-primary" onClick={reset} type="button">
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
