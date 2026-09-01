import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { demoLoginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="REROUTE 소개">
        <div className="login-brand-lockup">
          <strong>REROUTE</strong>
          <span>PORTFOLIO CONCEPT</span>
        </div>
        <div className="login-brand-copy">
          <p>기업 유휴 자산을 더 가치 있는 다음 쓰임으로 연결합니다.</p>
          <span>매칭부터 수거, 외부 정산 상태 확인까지 한 흐름으로 관리하세요.</span>
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">WELCOME BACK</span>
          <h1>REROUTE에 로그인</h1>
          <p>성수 오피스 이전 프로젝트의 추천 매칭안을 확인할 수 있습니다.</p>
          <LoginForm />
          {process.env.DEMO_MODE === "true" ? (
            <form action={demoLoginAction} className="demo-login-form">
              <button className="button button-ghost" type="submit">포트폴리오 데모 바로 열기</button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
