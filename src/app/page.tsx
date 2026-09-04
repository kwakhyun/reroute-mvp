import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DemoOpenForm } from "@/components/auth/demo-access";
import { RerouteMark } from "@/components/brand/reroute-mark";

export const metadata: Metadata = {
  title: "B2B 사무 자산 처분 MVP 사례",
  description:
    "문제 정의, 풀스택 구현, 가상 데이터 분석, 후속 개발 검토 기준을 정리한 REROUTE 제품 개발 사례",
};

const flow = [
  {
    number: "01",
    title: "최소 매각 금액과 운영 조건 설정",
    body: "프로젝트별로 최소 매각 금액, 최소 재사용률, 최대 수거 횟수를 설정합니다.",
  },
  {
    number: "02",
    title: "입찰과 인수처 확인 자료 검토",
    body: "CSV 파일로 입찰을 한 번에 등록하고, 사업자 정보와 처리 자격 확인 자료를 함께 검토합니다.",
  },
  {
    number: "03",
    title: "조건에 맞는 배분안 계산",
    body: "모든 자산을 배정할 수 없거나 최소 매각 금액을 충족하지 못하는 배분안은 자동으로 제외합니다.",
  },
  {
    number: "04",
    title: "확정 결과를 수거와 정산에 반영",
    body: "동시 수정과 중복 요청을 막고, 수거 진행 상황과 결제사 확인 상태를 감사 로그에 기록합니다.",
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

  return <DemoOpenForm className={className} kind="portfolio" />;
}

function DemoNote() {
  return (
    <>
      별도 초기화 없이 바로 열립니다. 처음부터 살펴보려면 <Link href="/login">로그인 화면</Link>에서 샘플 데이터를 초기화할 수 있습니다. 실제 고객 데이터는 사용하지 않습니다.
    </>
  );
}

export default function HomePage() {
  return (
    <div className="portfolio-page">
      <a className="skip-link" href="#portfolio-content">
        본문으로 건너뛰기
      </a>
      <header className="portfolio-nav">
        <Link className="portfolio-brand" href="#top" aria-label="제품 개발 사례 첫 화면으로">
          <RerouteMark className="portfolio-brand-mark" />
          <span className="portfolio-brand-copy">
            <strong>REROUTE</strong>
            <span>제품 개발 사례</span>
          </span>
        </Link>
        <nav aria-label="제품 개발 사례 메뉴">
          <a href="#hypothesis">사업 가설</a>
          <a href="#flow">제품 흐름</a>
          <a href="#validation">판단 근거</a>
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
            사무 자산 처분안을
            <br />
            <em>한눈에 비교하고 결정합니다.</em>
          </h1>
          <p>
            오피스 이전이나 폐점으로 처분해야 하는 사무 자산을 사업자 정보와 처리 자격이 확인된 업체에 배분합니다. 매각 대금, 폐기비와 운반비
            절감액, 재사용률을 한 화면에서 비교할 수 있는 B2B 매칭 서비스입니다.
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
            alt="매각 대금, 폐기비와 운반비 절감액, 재사용률, 자산별 배분 결과를 보여 주는 REROUTE 화면"
            width={1440}
            height={1024}
            priority
            sizes="(max-width: 900px) 94vw, 58vw"
            unoptimized
          />
          <div className="portfolio-visual-proof">
            <span>데모에서 확인할 수 있는 범위</span>
            <strong>배분안 계산과 확정, 수거와 정산 기록</strong>
          </div>
        </div>
        </section>

        <section className="portfolio-proof-strip" aria-label="프로젝트 핵심 범위">
        <div><strong>100%</strong><span>개인 기여도</span></div>
        <div><strong>214</strong><span>샘플 자산</span></div>
        <div><strong>11</strong><span>샘플 입찰</span></div>
        <div><strong>16</strong><span>관계형 테이블</span></div>
        <div><strong>8</strong><span>브라우저 E2E 시나리오</span></div>
        </section>

        <nav className="portfolio-mobile-index" aria-label="모바일 빠른 탐색">
          <span>핵심 내용 바로가기</span>
          <div>
            <a href="#hypothesis">사업 가설</a>
            <a href="#flow">제품 흐름</a>
            <a href="#validation">판단 근거</a>
            <a href="#engineering">구현</a>
            <a href="#ownership">기여</a>
          </div>
        </nav>

        <section className="portfolio-section portfolio-hypothesis" id="hypothesis">
        <div className="portfolio-section-heading">
          <span className="portfolio-section-index">01 / 사업 가설</span>
          <h2>여러 문서에 흩어진 판단 기준을<br />한 화면에서 비교합니다.</h2>
        </div>
        <div className="portfolio-hypothesis-grid">
          <article>
            <span>해결할 문제</span>
            <h3>매각 대금만 보면 비용 절감과 재사용 효과를 놓치기 쉽습니다.</h3>
            <p>
              자산 담당자는 매각 대금, 폐기 및 운반 비용, 재사용률, 수거 일정을 여러 문서에서 확인한 뒤 승인 자료를 다시 정리해야 합니다.
            </p>
          </article>
          <article className="portfolio-hypothesis-card-accent">
            <span>검증할 가설</span>
            <h3>판단 기준을 한곳에 모으면 확정 화면 진입률이 높아질 것이다.</h3>
            <p>
              매각 대금, 폐기비와 운반비 절감액, 재사용률, 수거 횟수를 한 화면에서 비교할 수 있으면 확정 화면까지 이동하는 사용자의 비율이 높아질 것으로 가정했습니다.
            </p>
          </article>
        </div>
        </section>

        <section className="portfolio-section portfolio-flow-section" id="flow">
        <div className="portfolio-section-heading portfolio-section-heading-inline">
          <div>
            <span className="portfolio-section-index">02 / 제품 흐름</span>
            <h2>확정한 배분안은 수거 일정과<br />정산 기록에 반영됩니다.</h2>
          </div>
          <p>
            최소 매각 금액과 재사용률, 수거 횟수를 기준으로 배분안을 계산하고 확정 결과로 수거 일정과 정산 기록을 만듭니다.
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
            <h2>시뮬레이션 결과,<br />실제 사업 환경에서 확인할 기준을 정리했습니다.</h2>
          </div>
          <div className="portfolio-synthetic-notice">
            <strong>가상 데이터로 판단 기준을 미리 점검했습니다.</strong>
            <p>
              아래 수치는 실제 고객 조사나 운영 결과가 아닙니다. 실제 파일럿에 앞서 가상 데이터로 판단 기준이 서로 충돌하지 않는지 확인했습니다.
            </p>
          </div>
        </div>

        <div className="portfolio-validation-cards">
          <article>
            <span>모든 판단 기준 충족</span>
            <strong>18.8%</strong>
            <p>다섯 가지 판단 기준을 모두 충족할 추정 확률</p>
          </article>
          <article>
            <span>후속 개발 검토 기준 충족</span>
            <strong>30.9%</strong>
            <p>가상 사용자 중 확정 단계에 도달한 인원과 유료 파일럿 참여 의향이 있다고 가정한 가상 기업 수가 모두 기준을 넘은 비율</p>
          </article>
          <article className="portfolio-validation-card-warning">
            <span>예시 결과의 유료 파일럿 참여 의향</span>
            <strong>1곳 / 5곳</strong>
            <p>가상 기업 5곳 중 1곳에 유료 파일럿 참여 의향이 있다고 가정했습니다. 실제 고객의 지불 의사나 계약 결과가 아닙니다.</p>
          </article>
        </div>

        <div className="portfolio-decision-panel">
          <div>
            <span>실제 사업 환경을 가정한 검증안</span>
            <h3>사업팀이 고객의 지불 의사와 계약 주체를 우선 확인하는 검증안을 설계했습니다.</h3>
          </div>
          <p>
            개인 프로젝트에서는 참여 기업을 모집하거나 영업하지 않았고, 계약도 체결하지 않았습니다. 실제 사업 환경에서 사업팀이 고객 검증을 진행한다면 기업 5곳 중 2곳 이상에서 유료 파일럿 참여 의향을 확인하고, 테스트 사용자 중 20% 이상이 배분안 확정 화면에 도달했을 때 후속 개발을 검토하도록 기준을 설정했습니다.
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
            <h2>조직별 권한과 동시 수정 충돌 방지,<br />행동 기록까지 구현했습니다.</h2>
          </div>
          <p>
            데이터베이스 제약과 역할별 권한, 중복 요청 방지, 사용자 행동 이벤트를 제품 흐름에 적용했습니다.
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
            <h3>데이터 오염과 중복 처리를 막는 장치</h3>
            <p>데이터베이스 제약, 조직별 데이터 분리, 역할별 권한, 중복 실행 방지, 감사 로그, 사용자 행동 이벤트</p>
          </article>
          <article>
            <span>제외한 범위</span>
            <h3>첫 검증에 필요하지 않은 기능</h3>
            <p>실제 결제, 인수처 등록 및 심사 절차, 실시간 채팅, 운송 최적화, 검증 목적과 무관한 AI 기능</p>
          </article>
        </div>
        </section>

        <section className="portfolio-section portfolio-ownership" id="ownership">
        <div className="portfolio-ownership-card">
          <div>
            <span className="portfolio-section-index">05 / 기여 범위</span>
            <h2>기획부터 배포까지<br />100% 직접 수행했습니다.</h2>
          </div>
          <div className="portfolio-ownership-copy">
            <p>
              문제 정의, 사업 가설과 성공 기준 수립부터 UX/UI 설계, 프론트엔드와 백엔드 개발, 보안, 테스트, CI/CD, 문서화까지 맡았습니다.
            </p>
            <p>
              AI 코딩 에이전트는 코드 탐색과 반복 작업, 검토 보조에 활용했습니다. 권한 경계와 트랜잭션, 스키마, 안전장치는 소스 코드와 테스트로 직접 확인했고, 의사결정에 사용한 수치는 별도로 다시 계산했습니다.
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
            4분 제품 시연 영상 보기
          </a>
        </div>
        </section>
      </main>

      <footer className="portfolio-footer">
        <div className="portfolio-brand">
          <RerouteMark className="portfolio-brand-mark" />
          <span className="portfolio-brand-copy">
            <strong>REROUTE</strong>
            <span>개인 풀스택 프로젝트</span>
          </span>
        </div>
        <p>아직 실제 고객을 대상으로 검증하지 않은 개인 풀스택 포트폴리오 프로젝트입니다.</p>
      </footer>
    </div>
  );
}
