"use client";

import { ArrowClockwise, ArrowRight } from "@phosphor-icons/react";
import { useFormStatus } from "react-dom";
import { demoLoginAction, resetDemoLoginAction } from "@/app/actions/auth";

const resetSteps = [
  "기존 샘플 기록 정리",
  "프로젝트와 입찰, 배분안 복원",
  "로그인 세션 준비",
  "작업 공간으로 이동",
] as const;

type DemoOpenFormProps = {
  className?: string;
  kind?: "login" | "portfolio";
  label?: string;
};

function OpenDemoButton({ kind, label }: Required<Pick<DemoOpenFormProps, "kind" | "label">>) {
  const { pending } = useFormStatus();
  const buttonClass = kind === "portfolio"
    ? "portfolio-button portfolio-button-primary"
    : "button button-secondary demo-open-button";

  return (
    <button className={buttonClass} disabled={pending} type="submit">
      {pending ? <span className="button-spinner" aria-hidden="true" /> : null}
      <span>{pending ? "데모 여는 중…" : label}</span>
      {!pending && kind === "login" ? <ArrowRight aria-hidden="true" size={18} /> : null}
    </button>
  );
}

export function DemoOpenForm({
  className = "",
  kind = "login",
  label = kind === "portfolio" ? "제품 데모 열기" : "데모 바로 열기",
}: DemoOpenFormProps) {
  const formClass = kind === "portfolio" ? "portfolio-demo-form" : "demo-open-form";

  return (
    <form action={demoLoginAction} className={`${formClass} ${className}`.trim()}>
      <OpenDemoButton kind={kind} label={label} />
    </form>
  );
}

function ResetDemoButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <button className="demo-reset-button" disabled={pending} type="submit">
        <ArrowClockwise aria-hidden="true" size={17} />
        <span>{pending ? "초기 상태로 되돌리는 중…" : "초기 상태로 다시 시작"}</span>
      </button>
      {pending ? (
        <div className="demo-reset-progress" aria-busy="true" aria-live="polite" role="status">
          <div className="demo-reset-progress-heading">
            <span className="reset-spinner" aria-hidden="true" />
            <div>
              <strong>초기 상태를 준비하고 있습니다</strong>
              <p>샘플 데이터를 아래 순서로 처리한 뒤 자동으로 이동합니다.</p>
            </div>
          </div>
          <ol aria-label="초기화 실행 순서">
            {resetSteps.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </>
  );
}

export function DemoLoginControls() {
  return (
    <section className="demo-access" aria-labelledby="demo-access-title">
      <div className="demo-access-heading">
        <strong id="demo-access-title">샘플 작업 공간</strong>
        <p>별도 입력 없이 현재 저장된 샘플 상태를 바로 확인할 수 있습니다.</p>
      </div>
      <DemoOpenForm />
      <form action={resetDemoLoginAction} className="demo-reset-form">
        <ResetDemoButton />
      </form>
      <p className="demo-reset-help">변경된 샘플 데이터를 처음 상태로 되돌려야 할 때만 초기화를 실행하세요.</p>
    </section>
  );
}
