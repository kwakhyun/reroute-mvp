import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { demoLoginAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "B2B 순환 자산 매칭 MVP 케이스 스터디",
  description:
    "가설 설계부터 풀스택 구현, 합성 검증 시뮬레이션, 투자 판단까지 정리한 REROUTE 제품 케이스 스터디",
};

const flow = [
  {
    number: "01",
    title: "의사결정 기준부터 설정",
    body: "프로젝트별로 최소 현금 회수액, 재사용률, 최대 수거 횟수를 정합니다.",
  },
  {
    number: "02",
    title: "입찰 내용과 검증 근거를 함께 검토",
    body: "CSV로 입찰을 일괄 등록하고, 수요처별 검증 근거를 제안 화면에서 확인합니다.",
  },
  {
    number: "03",
    title: "같은 조건에는 같은 추천을 계산",
    body: "모든 자산을 배정하지 못하거나 최소 회수액을 충족하지 못한 입찰은 제외합니다.",
  },
  {
    number: "04",
    title: "확정한 결과를 운영으로 인계",
    body: "동시 수정과 중복 요청을 막고 수거 현황, 결제사 확인 상태, 감사 로그를 남깁니다.",
  },
] as const;

const architecture = [
  ["제품", "가설, 퍼널, 성공 기준, 중단 기준"],
  ["프론트엔드", "Next.js App Router, React 19, TypeScript, 반응형 UI"],
  ["백엔드", "서버 액션, REST API, Zod 검증, 중복 실행 방지"],
  ["데이터", "Drizzle ORM, libSQL, 관계형 스키마 16개, 버전 충돌 제어"],
  ["보안", "DB 세션, 최소 권한, 조직별 데이터 격리, nonce CSP"],
  ["품질과 운영", "GitHub Actions, Playwright, Vercel 구성, 구조화 로그"],
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
            <span className="portfolio-kicker">독립형 풀스택 MVP</span>
            <span className="portfolio-status">실제 고객 검증 전 단계</span>
          </div>
          <h1>
            폐기 예정 자산을
            <br />
            <em>결정에 바로 쓸 수 있는 제안으로.</em>
          </h1>
          <p>
            오피스 이전과 폐점 시 발생하는 유휴 자산을 검증된 수요처와 연결하고, 현금 회수와 폐기비 절감을 한 번에
            비교하는 B2B 순환 자산 매칭 MVP입니다.
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

        <div className="portfolio-hero-visual" aria-label="REROUTE 추천 매칭안 대시보드 미리보기">
          <div className="portfolio-browser-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <p>app.reroute / matching</p>
          </div>
          <Image
            src="/portfolio/walkthrough-frames/02-matching.png"
            alt="현금 회수액, 폐기비 절감, 재사용률과 자산별 배분을 표시한 REROUTE 추천 매칭안 화면"
            width={1440}
            height={1024}
            priority
            sizes="(max-width: 900px) 94vw, 58vw"
            unoptimized
          />
          <div className="portfolio-visual-proof">
            <span>동작하는 전체 여정</span>
            <strong>화면 → API → DB → 배포 구성</strong>
          </div>
        </div>
        </section>

        <section className="portfolio-proof-strip" aria-label="프로젝트 핵심 범위">
        <div><strong>100%</strong><span>개인 기여도</span></div>
        <div><strong>214</strong><span>샘플 자산</span></div>
        <div><strong>11</strong><span>샘플 입찰</span></div>
        <div><strong>16</strong><span>관계형 스키마</span></div>
        <div><strong>전체 여정</strong><span>브라우저 자동화</span></div>
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
          <h2>여러 자료를 오가는 검토를,<br />한 번의 결정으로.</h2>
        </div>
        <div className="portfolio-hypothesis-grid">
          <article>
            <span>해결할 문제</span>
            <h3>개별 가격만으로는 전체 가치를 판단하기 어렵습니다.</h3>
            <p>
              자산 담당자는 매각가, 폐기비, 재사용 성과, 수거 일정을 서로 다른 문서에서 맞추고 승인 근거를 만들어야 합니다.
            </p>
          </article>
          <article className="portfolio-hypothesis-card-accent">
            <span>검증할 가설</span>
            <h3>회수 가치를 한눈에 보여주면 확정 의도가 높아질까?</h3>
            <p>
              개별 매각가 대신 현금 회수, 비용 절감, 재사용률, 수거 횟수를 하나의 추천으로 제시하면 검토자가 더 빨리 승인 단계로 이동할 것이라고 가정했습니다.
            </p>
          </article>
        </div>
        </section>

        <section className="portfolio-section portfolio-flow-section" id="flow">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">02 / 제품 흐름</span>
            <h2>검증에 필요한 기록을<br />처음부터 제품에 남겼습니다.</h2>
          </div>
          <p>
            단순한 화면 시안이 아니라 입력, 계산, 승인, 운영 상태가 하나의 데이터 모델로 이어지는 전체 여정을 구현했습니다.
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
            <h2>결과를 유리하게 해석하지 않고,<br />투자를 보류했습니다.</h2>
          </div>
          <div className="portfolio-synthetic-notice">
            <strong>합성 시뮬레이션</strong>
            <p>
              아래 수치는 실제 고객 조사나 운영 로그가 아닙니다. 실제 파일럿 전에 의사결정 규칙을 점검하기 위해 고정 시드로 생성했습니다.
            </p>
          </div>
        </div>

        <div className="portfolio-validation-cards">
          <article>
            <span>모든 기준 동시 충족</span>
            <strong>18.8%</strong>
            <p>5개 판단 기준을 한 반복에서 모두 충족할 추정 확률</p>
          </article>
          <article>
            <span>전담 개발 투자 기준 충족</span>
            <strong>30.9%</strong>
            <p>확정 의도와 유료 파일럿 기준을 함께 충족할 추정 확률</p>
          </article>
          <article className="portfolio-validation-card-warning">
            <span>대표 합성 코호트</span>
            <strong>1 / 5</strong>
            <p>투자 기준인 2개사에 미달. 가격과 구매 결정권자 검증이 먼저입니다.</p>
          </article>
        </div>

        <div className="portfolio-decision-panel">
          <div>
            <span>다음 판단</span>
            <h3>제한적 파일럿은 진행, 전담 개발 투자는 보류</h3>
          </div>
          <p>
            실제 5개사에서 지불 의사와 계약 주체를 확인하고, 유료 파일럿 2개사와 확정 의도율 20%를 함께 충족할 때만 투자를 다시 판단합니다.
          </p>
          <a
            className="portfolio-inline-link"
            href="/reports/validation-simulation.html"
            target="_blank"
            rel="noreferrer"
          >
            시뮬레이션 재현 보고서 열기 ↗
          </a>
        </div>
        </section>

        <section className="portfolio-section portfolio-engineering" id="engineering">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">04 / 구현</span>
            <h2>검증 속도를 높이되,<br />핵심 안전장치는 지켰습니다.</h2>
          </div>
          <p>
            기능 수를 늘리기보다 조직별 데이터 격리, 권한, 데이터 정합성, 안전한 재시도와 핵심 여정 측정을 우선했습니다.
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
            <span>유지한 범위</span>
            <h3>검증 신뢰를 만드는 경계</h3>
            <p>관계형 제약, 조직 격리, 프로젝트 역할, 거래 멱등성, 감사 로그, 퍼널 이벤트</p>
          </article>
          <article>
            <span>제외한 범위</span>
            <h3>가설 검증에 필요하지 않은 범위</h3>
            <p>실제 결제, 복잡한 수요처 등록 절차, 실시간 채팅, 가설 검증에 필요하지 않은 AI 기능</p>
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
              AI 코딩 에이전트는 탐색, 반복 구현과 감사 보조에 사용했습니다. 권한 경계, 트랜잭션, 스키마, 안전장치와 의사결정 수치는 소스 코드, 테스트와 독립 재계산으로 직접 검증했습니다.
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
        <p>실제 고객 검증 전 단계의 개인 풀스택 포트폴리오 프로젝트입니다.</p>
      </footer>
    </div>
  );
}
