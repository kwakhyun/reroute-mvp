import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dashboardImage from "../../artifacts/audit-2026-09-01-round3/final-matching-desktop-1440x1024.png";
import { demoLoginAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "B2B 순환 자산 매칭 MVP 케이스 스터디",
  description:
    "가설 설계부터 풀스택 구현, 합성 검증 시뮬레이션, 투자 판단까지 정리한 REROUTE 제품 케이스 스터디",
};

const flow = [
  {
    number: "01",
    title: "제약 조건을 먼저 정의",
    body: "현금 회수 하한, 재사용률, 수거 횟수를 프로젝트 기준으로 고정합니다.",
  },
  {
    number: "02",
    title: "입찰과 증빙을 한 번에 검토",
    body: "CSV 일괄 가져오기와 파트너 검증 근거를 제안 화면에 연결합니다.",
  },
  {
    number: "03",
    title: "결정론적 최적화로 조합 생성",
    body: "자산군 완전성과 회수 기준을 깨는 입찰을 제외하고 반복 가능한 추천을 만듭니다.",
  },
  {
    number: "04",
    title: "확정 후 운영으로 인계",
    body: "버전 충돌과 중복 요청을 방지하고 수거, 외부 정산 상태, 감사 로그를 남깁니다.",
  },
] as const;

const architecture = [
  ["Product", "가설, 퍼널, 성공 기준, 중단 조건"],
  ["Frontend", "Next.js App Router, React 19, TypeScript, 반응형 UI"],
  ["Backend", "서버 액션, REST API, Zod 검증, 멱등성 보장"],
  ["Data", "Drizzle ORM, libSQL, 16개 관계형 스키마, CAS 버전"],
  ["Security", "DB 세션, 최소 권한, 테넌트 격리, nonce CSP"],
  ["Delivery", "GitHub Actions, Playwright, Vercel, 구조화 로깅"],
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
        초기화된 제품 데모 열기
      </button>
    </form>
  );
}

export default function HomePage() {
  return (
    <main className="portfolio-page">
      <header className="portfolio-nav">
        <Link className="portfolio-brand" href="#top" aria-label="REROUTE 케이스 스터디 처음으로">
          <strong>REROUTE</strong>
          <span>PRODUCT CASE STUDY</span>
        </Link>
        <nav aria-label="케이스 스터디 메뉴">
          <a href="#hypothesis">가설</a>
          <a href="#validation">검증</a>
          <a href="#engineering">구현</a>
          <a href="#ownership">기여</a>
        </nav>
        <DemoButton className="portfolio-nav-demo" />
      </header>

      <section className="portfolio-hero" id="top">
        <div className="portfolio-hero-copy">
          <div className="portfolio-kicker-row">
            <span className="portfolio-kicker">0→1 FULL-STACK MVP</span>
            <span className="portfolio-status">실제 고객 검증 전 단계</span>
          </div>
          <h1>
            폐기 예정 자산을
            <br />
            <em>의사결정 가능한 제안으로.</em>
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
            한 번의 클릭으로 샘플 작업 공간을 초기화하고 확정권자 계정으로 진입합니다.
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
            src={dashboardImage}
            alt="현금 회수액, 폐기비 절감, 재사용률과 자산별 배분을 표시한 REROUTE 추천 매칭안 화면"
            priority
            sizes="(max-width: 900px) 94vw, 58vw"
          />
          <div className="portfolio-visual-proof">
            <span>동작하는 전체 여정</span>
            <strong>화면 → API → DB → 배포</strong>
          </div>
        </div>
      </section>

      <section className="portfolio-proof-strip" aria-label="프로젝트 핵심 범위">
        <div><strong>100%</strong><span>개인 기여도</span></div>
        <div><strong>214</strong><span>샘플 자산</span></div>
        <div><strong>11</strong><span>샘플 입찰</span></div>
        <div><strong>16</strong><span>관계형 스키마</span></div>
        <div><strong>E2E</strong><span>로컬부터 배포까지</span></div>
      </section>

      <section className="portfolio-section portfolio-hypothesis" id="hypothesis">
        <div className="portfolio-section-heading">
          <span className="portfolio-section-index">01 / HYPOTHESIS</span>
          <h2>잘 팔리는 도구가 아니라,<br />빨리 결정하는 도구.</h2>
        </div>
        <div className="portfolio-hypothesis-grid">
          <article>
            <span>PROBLEM</span>
            <h3>개별 가격만으로는 승인할 수 없습니다.</h3>
            <p>
              자산 담당자는 매각가, 폐기비, 재사용 성과, 수거 일정을 서로 다른 문서에서 맞추고 승인 근거를 만들어야 합니다.
            </p>
          </article>
          <article className="portfolio-hypothesis-card-accent">
            <span>TESTABLE HYPOTHESIS</span>
            <h3>통합 회수 가치를 보여주면 확정 의도가 높아질까?</h3>
            <p>
              개별 매각가 대신 현금 회수, 비용 절감, 재사용률, 수거 횟수를 하나의 추천으로 제시하면 검토자가 더 빨리 승인 단계로 이동할 것이라고 가정했습니다.
            </p>
          </article>
        </div>
      </section>

      <section className="portfolio-section portfolio-flow-section">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">02 / PRODUCT FLOW</span>
            <h2>검증에 필요한 흔적을<br />처음부터 제품에 남겼습니다.</h2>
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
            <span className="portfolio-section-index">03 / DECISION EVIDENCE</span>
            <h2>결과를 꾸미지 않고,<br />투자 보류를 결론냈습니다.</h2>
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
            <span>전담 투자 규칙 충족</span>
            <strong>30.9%</strong>
            <p>확정 의도와 유료 파일럿 기준을 함께 충족할 추정 확률</p>
          </article>
          <article className="portfolio-validation-card-warning">
            <span>유료 파일럿 중앙값</span>
            <strong>1 / 5</strong>
            <p>투자 기준인 2개사에 미달. 가격과 구매 권한자 검증이 먼저입니다.</p>
          </article>
        </div>

        <div className="portfolio-decision-panel">
          <div>
            <span>NEXT DECISION</span>
            <h3>제한 파일럿은 진행, 전담 개발 투자는 보류</h3>
          </div>
          <p>
            실제 5개사에서 지불 의사와 계약 주체를 확인하고, 유료 파일럿 2개사와 확정 의도율 20%를 함께 충족할 때만 투자를 재판단합니다.
          </p>
          <a
            className="portfolio-inline-link"
            href="/reports/validation-simulation.html"
            target="_blank"
            rel="noreferrer"
          >
            재현 가능한 검증 보고서 열기 ↗
          </a>
        </div>
      </section>

      <section className="portfolio-section portfolio-engineering" id="engineering">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">04 / ENGINEERING</span>
            <h2>빠르게 만들어도,<br />검증할 것은 생략하지 않았습니다.</h2>
          </div>
          <p>
            기능 수를 늘리는 대신 테넌트 격리, 권한, 데이터 정합성, 재시도 안전성과 핵심 여정 측정을 반드시 지켰습니다.
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
            <span>KEPT</span>
            <h3>검증 신뢰를 만드는 경계</h3>
            <p>관계형 제약, 조직 격리, 프로젝트 역할, 거래 멱등성, 감사 로그, 퍼널 이벤트</p>
          </article>
          <article>
            <span>CUT</span>
            <h3>가설에 답하지 않는 범위</h3>
            <p>실제 결제, 복잡한 파트너 온보딩, 실시간 채팅, 무거운 탐색적 AI 기능</p>
          </article>
        </div>
      </section>

      <section className="portfolio-section portfolio-ownership" id="ownership">
        <div className="portfolio-ownership-card">
          <div>
            <span className="portfolio-section-index">05 / OWNERSHIP</span>
            <h2>기획부터 배포까지<br />기여도 100%</h2>
          </div>
          <div className="portfolio-ownership-copy">
            <p>
              문제 정의, 사업 가설, 성공 기준, UX/UI, 프론트엔드, API, 데이터베이스, 보안, 테스트, CI/CD, 문서화를 혼자 완결했습니다.
            </p>
            <p>
              AI 코딩 에이전트는 탐색, 반복 구현, 감사 보조에 사용했습니다. 권한 경계, 트랜잭션, 스키마, 안전 장치와 의사결정 수치는 소스, 테스트, 독립 재계산으로 직접 검증했습니다.
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
        <span>LIVE PRODUCT WALKTHROUGH</span>
        <h2>설명보다 동작하는<br />제품으로 확인하세요.</h2>
        <div className="portfolio-hero-actions">
          <DemoButton />
          <a className="portfolio-button portfolio-button-secondary" href="/portfolio/reroute-walkthrough.mp4">
            4분 워크스루 보기
          </a>
        </div>
      </section>

      <footer className="portfolio-footer">
        <div className="portfolio-brand">
          <strong>REROUTE</strong>
          <span>INDEPENDENT PRODUCT PROJECT</span>
        </div>
        <p>실제 고객 검증 전 단계의 개인 풀스택 포트폴리오 프로젝트입니다.</p>
      </footer>
    </main>
  );
}
