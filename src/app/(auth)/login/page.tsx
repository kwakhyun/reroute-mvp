import authStyles from "@/styles/auth.module.css";
import formStyles from "@/styles/forms.module.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoLoginControls } from "@/components/auth/demo-access";
import { RerouteMark } from "@/components/brand/reroute-mark";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/projects");
  }

  return (
    <main className={`${authStyles.root} ${formStyles.root} login-page`}>
      <section className="login-brand-panel" aria-label="REROUTE 소개">
        <div className="login-brand-lockup">
          <div className="login-brand-title">
            <RerouteMark className="login-brand-mark" />
            <strong>REROUTE</strong>
          </div>
          <span>풀스택 MVP</span>
        </div>
        <div className="login-brand-copy">
          <p>기업이 처분할 사무 자산을 다시 쓸 기업이나 기관과 연결합니다.</p>
          <span>매칭부터 수거 일정과 외부 결제사 확인까지 한곳에서 관리하세요.</span>
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">작업 공간 로그인</span>
          <h1>REROUTE에 로그인</h1>
          <p>성수 오피스 이전 프로젝트의 추천 배분안을 확인할 수 있습니다.</p>
          {process.env.DEMO_MODE === "true" ? (
            <>
              <DemoLoginControls />
              <div className="login-divider"><span>또는 계정으로 로그인</span></div>
            </>
          ) : null}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
