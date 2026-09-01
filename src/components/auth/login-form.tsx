"use client";

import { ArrowRight, LockKey, User } from "@phosphor-icons/react";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="login-form">
      <label className="field-label" htmlFor="email">
        이메일
      </label>
      <div className="input-with-icon">
        <User aria-hidden="true" size={19} />
        <input
          autoComplete="username"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <label className="field-label" htmlFor="password">
        비밀번호
      </label>
      <div className="input-with-icon">
        <LockKey aria-hidden="true" size={19} />
        <input
          autoComplete="current-password"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button className="button button-primary login-submit" disabled={pending} type="submit">
        {pending ? "로그인 중…" : "프로젝트 열기"}
        <ArrowRight aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
