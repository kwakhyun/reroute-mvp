import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { demoLoginAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "B2B 사무 자산 처분 MVP 사례",
  description:
    "문제 정의부터 풀스택 구현, 가상 데이터 분석, 개발 인력 투입 결정까지 정리한 REROUTE 제품 개발 사례",
};

const flow = [
  {
    number: "01",
    title: "최소 매각 금액과 운영 조건 설정",
    body: "프로젝트별로 최소 매각 금액, 재사용률, 최대 수거 횟수를 정합니다.",
  },
  {
    number: "02",
    title: "입찰 조건과 인수처 확인 자료 검토",
    body: "CSV로 입찰을 일괄 등록하고, 인수처별 확인 자료를 배분안에서 함께 검토합니다.",
  },
  {
    number: "03",
    title: "조건을 충족하는 배분안 계산",
    body: "모든 자산을 배정할 수 없거나 최소 매각 금액을 충족하지 못하는 조합은 제외합니다.",
  },
  {
    number: "04",
    title: "확정 결과를 수거와 정산에 반영",
    body: "동시 수정과 중복 요청을 막고, 수거 현황과 결제사 확인 상태를 감사 로그와 함께 기록합니다.",
  },
] as const;

const architecture = [
  ["제품", "고객 문제, 성공 기준, 중단 기준, 사용자 행동 지표"],
  ["프론트엔드", "Next.js App Router, React 19, TypeScript, 반응형 UI"],
  ["백엔드", "서버 액션, REST API, Zod 입력 검증, 중복 실행 방지"],
  ["데이터", "Drizzle ORM, libSQL, 관계형 테이블 16개, 동시 수정 충돌 방지"],
  ["보안", "DB 세션, 최소 권한, 조직별 데이터 분리, nonce 기반 CSP"],
  ["품질과 운영", "GitHub Actions, Playwright, Vercel 배포, 구조화 로그"],
] as const;

function DemoButton({ className = "" }: { className?: string }) {
  if (process.env.DEMO_MODE !== "true") {
    return (
      <Link className={`portfolio-button portfolio-button-primary ${className}`} href="/login">
        제품 데모 열기
      </Link>
    );
  }

  return (
    <form action={demoLoginAction} className={`portfolio-demo-form ${className}`}>
      <button className="portfolio-button portfolio-button-primary" type="submit">
        샘플 데이터로 제품 데모 열기
      </button>
    </form>
  );
}

function DemoNote() {
  return process.env.DEMO_RESET_ON_LOGIN === "true" ? (
    <>한 번의 클릭으로 샘플 작업 공간을 초기 상태로 되돌린 뒤 승인자 계정으로 엽니다.</>
  ) : (
    <>실제 고객 데이터와 분리된 공유 샘플 계정으로 엽니다. 다른 방문자가 저장한 데모 상태가 이어질 수 있습니다.</>
  );
}

export default function HomePage() {
  return (
    <div className="portfolio-page">
      <a className="skip-link" href="#portfolio-content">
        본문으로 건너뛰기
      </a>
      <header className="portfolio-nav">
        <Link className="portfolio-brand" href="#top" aria-label="REROUTE 케이스 스터디 처음으로">
          <strong>REROUTE</strong>
          <span>제품 개발 사례</span>
        </Link>
        <nav aria-label="케이스 스터디 메뉴">
          <a href="#hypothesis">가설</a>
          <a href="#validation">검증</a>
          <a href="#engineering">구현</a>
          <a href="#ownership">기여</a>
        </nav>
        <DemoButton className="portfolio-nav-demo" />
      </header>

      <main id="portfolio-content">
        <section className="portfolio-hero" id="top">
        <div className="portfolio-hero-copy">
          <div className="portfolio-kicker-row">
            <span className="portfolio-kicker">개인 풀스택 MVP</span>
            <span className="portfolio-status">실제 고객 검증 전</span>
          </div>
          <h1>
            사무 자산을 어떻게 처분할지
            <br />
            <em>한눈에 비교합니다.</em>
          </h1>
          <p>
            오피스 이전이나 폐점 때 처분해야 하는 사무 자산을 필요한 확인 절차를 마친 인수처에 배분하고, 매각 대금, 절감한 폐기비와 운반비,
            재사용률을 한 화면에서 비교하는 B2B 매칭 서비스입니다.
          </p>
          <div className="portfolio-hero-actions">
            <DemoButton />
            <a
              className="portfolio-button portfolio-button-secondary"
              href="https://github.com/kwakhyun/reroute-mvp"
              target="_blank"
              rel="noreferrer"
            >
              GitHub 소스 보기
            </a>
          </div>
          <p className="portfolio-demo-note">
            <DemoNote />
          </p>
        </div>

        <div className="portfolio-hero-visual" aria-label="REROUTE 배분안 화면 미리보기">
          <div className="portfolio-browser-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <p>app.reroute / matching</p>
          </div>
          <Image
            src="/portfolio/walkthrough-frames/02-matching.png"
            alt="매각 대금, 폐기비와 운반비 절감액, 재사용률과 자산별 배분을 표시한 REROUTE 배분안 화면"
            width={1440}
            height={1024}
            priority
            sizes="(max-width: 900px) 94vw, 58vw"
            unoptimized
          />
          <div className="portfolio-visual-proof">
            <span>실제로 작동하는 핵심 흐름</span>
            <strong>화면부터 API, 데이터베이스, 배포까지</strong>
          </div>
        </div>
        </section>

        <section className="portfolio-proof-strip" aria-label="프로젝트 핵심 범위">
        <div><strong>100%</strong><span>개인 기여도</span></div>
        <div><strong>214</strong><span>샘플 자산</span></div>
        <div><strong>11</strong><span>샘플 입찰</span></div>
        <div><strong>16</strong><span>관계형 테이블</span></div>
        <div><strong>4</strong><span>브라우저 E2E 시나리오</span></div>
        </section>

        <nav className="portfolio-mobile-index" aria-label="모바일 빠른 탐색">
          <span>핵심 내용 바로가기</span>
          <div>
            <a href="#validation">판단 결과</a>
            <a href="#hypothesis">사업 가설</a>
            <a href="#engineering">구현</a>
            <a href="#ownership">기여</a>
          </div>
        </nav>

        <section className="portfolio-section portfolio-hypothesis" id="hypothesis">
        <div className="portfolio-section-heading">
          <span className="portfolio-section-index">01 / 사업 가설</span>
          <h2>흩어진 매각 조건을<br />한 화면에서 비교합니다.</h2>
        </div>
        <div className="portfolio-hypothesis-grid">
          <article>
            <span>해결할 문제</span>
            <h3>매각가만 보면 비용 절감과 재사용 효과를 놓치기 쉽습니다.</h3>
            <p>
              자산 담당자는 매각가, 폐기비와 운반비, 재사용률, 수거 일정을 여러 문서에서 확인한 뒤 승인 자료를 다시 정리해야 합니다.
            </p>
          </article>
          <article className="portfolio-hypothesis-card-accent">
            <span>검증할 가설</span>
            <h3>비교 기준을 한곳에 모으면 확정 화면까지 이동하는 사용자가 늘어날까?</h3>
            <p>
              매각 대금, 비용 절감액, 재사용률, 수거 횟수를 한 배분안에서 비교하면 검토자가 확정 화면까지 더 쉽게 이동할 것이라고 가정했습니다.
            </p>
          </article>
        </div>
        </section>

        <section className="portfolio-section portfolio-flow-section" id="flow">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">02 / 제품 흐름</span>
            <h2>입력부터 확정 이후의 수거와 정산까지<br />하나의 흐름으로 구현했습니다.</h2>
          </div>
          <p>
            화면 시안에 그치지 않고 입력, 계산, 승인, 수거, 정산 상태가 같은 데이터 구조 안에서 이어지도록 만들었습니다.
          </p>
        </div>
        <ol className="portfolio-flow-list">
          {flow.map((item) => (
            <li key={item.number}>
              <span>{item.number}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
        </section>

        <section className="portfolio-section portfolio-validation" id="validation">
        <div className="portfolio-validation-header">
          <div>
            <span className="portfolio-section-index">03 / 판단 근거</span>
            <h2>시뮬레이션 결과는<br />전담 개발 인력 투입 기준에 미치지 못했습니다.</h2>
          </div>
          <div className="portfolio-synthetic-notice">
            <strong>가상 데이터로 판단 기준 점검</strong>
            <p>
              아래 수치는 실제 고객 조사나 운영 기록이 아닙니다. 실제 파일럿을 시작하기 전에 판단 기준이 서로 모순되지 않는지 확인하려고 가상 데이터를 만들어 계산했습니다.
            </p>
          </div>
        </div>

        <div className="portfolio-validation-cards">
          <article>
            <span>모든 기준 동시 충족</span>
            <strong>18.8%</strong>
            <p>다섯 가지 판단 기준을 한 번에 모두 충족할 추정 확률</p>
          </article>
          <article>
            <span>개발 인력 투입 기준 충족</span>
            <strong>30.9%</strong>
            <p>확정 화면 진입 기준과 유료 파일럿 기준을 함께 충족할 추정 확률</p>
          </article>
          <article className="portfolio-validation-card-warning">
            <span>예시 결과: 유료 파일럿 참여</span>
            <strong>1 / 5</strong>
            <p>기준인 기업 2곳에 미치지 못했습니다. 실제 지불 의향과 구매 결정권자를 먼저 확인해야 합니다.</p>
          </article>
        </div>

        <div className="portfolio-decision-panel">
          <div>
            <span>다음 판단</span>
            <h3>소규모 파일럿은 진행하되 전담 개발 인력 투입은 보류합니다.</h3>
          </div>
          <p>
            실제 기업 5곳에서 지불 의사와 계약 주체를 확인합니다. 유료 파일럿에 참여한 기업이 2곳 이상이고 배분안 확정 화면을 연 사용자가 20% 이상일 때만 개발 인력 투입을 다시 검토합니다.
          </p>
          <a
            className="portfolio-inline-link"
            href="/reports/validation-simulation.html"
            target="_blank"
            rel="noreferrer"
          >
            가상 데이터 분석 보고서 열기 ↗
          </a>
        </div>
        </section>

        <section className="portfolio-section portfolio-engineering" id="engineering">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">04 / 구현</span>
            <h2>검증에 필요한 핵심 기능과<br />안전장치를 함께 구현했습니다.</h2>
          </div>
          <p>
            기능 수를 늘리기보다 조직별 데이터 분리, 역할별 권한, 데이터 일관성, 안전한 재시도와 주요 화면 이용 기록을 우선했습니다.
          </p>
        </div>
        <div className="portfolio-architecture-grid">
          {architecture.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <p>{value}</p>
            </article>
          ))}
        </div>
        <div className="portfolio-boundaries">
          <article>
            <span>반드시 구현한 범위</span>
            <h3>서비스 신뢰를 위한 안전장치</h3>
            <p>데이터베이스 제약, 조직별 데이터 분리, 역할별 권한, 중복 실행 방지, 감사 로그, 행동 이벤트</p>
          </article>
          <article>
            <span>제외한 범위</span>
            <h3>첫 검증에 필요하지 않은 기능</h3>
            <p>실제 결제, 인수처의 복잡한 등록 절차, 실시간 채팅, 운송 최적화, 검증 목적과 무관한 AI 기능</p>
          </article>
        </div>
        </section>

        <section className="portfolio-section portfolio-ownership" id="ownership">
        <div className="portfolio-ownership-card">
          <div>
            <span className="portfolio-section-index">05 / 기여 범위</span>
            <h2>기획부터 배포까지<br />기여도 100%</h2>
          </div>
          <div className="portfolio-ownership-copy">
            <p>
              문제 정의, 사업 가설, 성공 기준, UX/UI, 프론트엔드, API, 데이터베이스, 보안, 테스트, CI/CD 구성과 문서화를 직접 수행했습니다.
            </p>
            <p>
              AI 코딩 에이전트는 탐색, 반복 구현과 감사 보조에 사용했습니다. 권한 경계, 트랜잭션, 스키마, 안전장치와 판단에 사용한 수치는 소스 코드, 테스트와 별도 계산으로 직접 확인했습니다.
            </p>
            <div className="portfolio-document-links">
              <a href="https://github.com/kwakhyun/reroute-mvp/blob/main/docs/contribution-and-ai.md" target="_blank" rel="noreferrer">
                기여도와 AI 검증 기준 ↗
              </a>
              <a href="https://github.com/kwakhyun/reroute-mvp/blob/main/docs/architecture.md" target="_blank" rel="noreferrer">
                아키텍처 문서 ↗
              </a>
              <a href="https://github.com/kwakhyun/reroute-mvp/blob/main/verification-report.md" target="_blank" rel="noreferrer">
                검증 보고서 ↗
              </a>
            </div>
          </div>
        </div>
        </section>

        <section className="portfolio-final-cta">
        <span>제품 시연</span>
        <h2>제품의 전체 흐름을<br />직접 확인해 보세요.</h2>
        <div className="portfolio-hero-actions">
          <DemoButton />
          <a className="portfolio-button portfolio-button-secondary" href="/portfolio/reroute-walkthrough.mp4">
            4분 워크스루 보기
          </a>
        </div>
        </section>
      </main>

      <footer className="portfolio-footer">
        <div className="portfolio-brand">
          <strong>REROUTE</strong>
          <span>개인 제품 프로젝트</span>
        </div>
        <p>아직 실제 고객에게 검증하지 않은 개인 풀스택 포트폴리오 프로젝트입니다.</p>
      </footer>
    </div>
  );
}
