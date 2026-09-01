import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-page">
      <div className="message-card">
        <span className="eyebrow">404</span>
        <h1>요청한 화면을 찾을 수 없습니다.</h1>
        <p>주소를 확인하거나 프로젝트 목록으로 돌아가 주세요.</p>
        <Link className="button button-primary" href="/projects">
          프로젝트로 돌아가기
        </Link>
      </div>
    </main>
  );
}
