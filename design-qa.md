# REROUTE 디자인 QA

검증일: 2026-09-01

기준 상태: 성수 오피스 이전 프로젝트, 승인자 계정, 매칭안 확정 전

## 비교 자료

- 목표 시안: [design/reroute-marketplace-final.png](design/reroute-marketplace-final.png)
- 최종 데스크톱 구현: [artifacts/final-qa/matching-final-desktop-1440x1024.png](artifacts/final-qa/matching-final-desktop-1440x1024.png)
- 목표와 구현 좌우 비교: [artifacts/final-qa/design-vs-final-implementation.png](artifacts/final-qa/design-vs-final-implementation.png)
- 최종 모바일 구현: [artifacts/final-qa/matching-final-mobile-390x844.png](artifacts/final-qa/matching-final-mobile-390x844.png)
- 2차 감사 후 최종 데스크톱: [artifacts/audit-2026-09-01-round3/final-matching-desktop-1440x1024.png](artifacts/audit-2026-09-01-round3/final-matching-desktop-1440x1024.png)
- 2차 감사 후 최종 모바일: [artifacts/audit-2026-09-01-round3/final-matching-mobile-390x844.png](artifacts/audit-2026-09-01-round3/final-matching-mobile-390x844.png)
- 공개 케이스 스터디 히어로: [public/portfolio/walkthrough-frames/01-case-study-hero.png](public/portfolio/walkthrough-frames/01-case-study-hero.png)
- 합성 검증과 투자 판단: [public/portfolio/walkthrough-frames/07-synthetic-decision.png](public/portfolio/walkthrough-frames/07-synthetic-decision.png)
- 엔지니어링 범위: [public/portfolio/walkthrough-frames/08-engineering.png](public/portfolio/walkthrough-frames/08-engineering.png)
- 기여도와 AI 책임 경계: [public/portfolio/walkthrough-frames/09-ownership.png](public/portfolio/walkthrough-frames/09-ownership.png)
- 실행 가능한 분석 보고서: [public/portfolio/walkthrough-frames/10-report.png](public/portfolio/walkthrough-frames/10-report.png)
- 사용자 제공 아이콘 기준 화면: [artifacts/final-qa/icon-reference-matching.png](artifacts/final-qa/icon-reference-matching.png), [artifacts/final-qa/icon-reference-pickups.png](artifacts/final-qa/icon-reference-pickups.png)
- 아이콘 수정 후 수거 화면: [artifacts/final-qa/pickups-icon-alignment-final.png](artifacts/final-qa/pickups-icon-alignment-final.png)
- 아이콘 기준과 수정 결과 집중 비교: [artifacts/final-qa/icon-reference-vs-final.png](artifacts/final-qa/icon-reference-vs-final.png)
- 모바일 케이스 스터디 최종 화면: [artifacts/final-qa/portfolio-mobile-390x844-final.png](artifacts/final-qa/portfolio-mobile-390x844-final.png)

## 반복 개선 결과

1. 목표 시안의 좌측 내비게이션, 프로젝트 헤더, 핵심 지표, 2열 표, 신뢰 안내와 하단 행동 영역을 같은 정보 구조로 구현했다.
2. 1440px 화면에서 열 너비, 행 높이, 카드 여백, 타이포그래피와 테두리를 캡처 비교로 보정했다.
3. 네 가지 자산 이미지를 목록과 매칭 표에 연결하고 임시 플레이스홀더를 제거했다.
4. 닫힌 모바일 메뉴를 접근성 트리와 탭 순서에서 제외하고, Esc로 닫을 때 메뉴 버튼으로 포커스가 돌아오게 했다.
5. 넓은 표에는 스크롤 안내, 키보드 포커스 영역과 고정 핵심 열을 적용했다.
6. 보조 텍스트와 상태 배지의 대비를 WCAG AA 기준 이상으로 높이고 화면 표시 글자 크기를 최소 11px로 조정했다.
7. 새 프로젝트 화면에서는 프로젝트가 필요한 메뉴를 비활성화하고, 프로젝트 내부에서는 현재 프로젝트 경로로 연결했다.
8. 열린 모바일 메뉴를 모달 내비게이션으로 처리해 배경을 `inert`로 만들고, 포커스를 메뉴 안에 가둔 뒤 닫을 때 원래 버튼으로 복귀시켰다.
9. 추천안과 확정 확인 화면에 자산군, 수요처, 수량, 검증 근거를 함께 표시해 같은 수량의 자산도 구분할 수 있게 했다.
10. 계산 결과가 없는 신규 프로젝트에서도 입찰 가져오기와 재계산 행동이 이어지도록 빈 상태를 완성했다.
11. 공개 첫 화면에 제품 가설, 구현 범위, 합성 검증의 한계, 투자 보류 결정, 기여도와 데모 시작 동선을 하나의 읽기 흐름으로 구성했다.
12. 공개 케이스 스터디를 1440px와 390px에서 확인해 본문이 가로로 넘치지 않고 주요 버튼이 화면 밖으로 사라지지 않는지 검증했다.
13. 실제 고객 결과와 합성 시뮬레이션이 혼동되지 않도록 상태 배지, 경고 카드, 보고서 링크에서 같은 한계를 반복 표시했다.
14. 권한 없는 동적 경로의 `noindex`와 루트 색인 메타 충돌을 제거했다.
15. 수거 카드의 일반 보조 문구 선택자가 원형 아이콘의 `display: grid`를 덮어쓰던 문제를 제거했다. 건물 아이콘 중심 편차는 수정 전 `-3.5px`에서 유형별 광학 보정 후 `+1.5px`로 조정했다.
16. 수거와 정산 상태 저장 후 서버 요약과 폼 선택값이 달라지던 비제어 입력을 버전별 필드 묶음으로 교체했다.
17. 모달을 닫은 뒤 실행 버튼으로 포커스가 복귀하도록 했고, 두 탭에서 같은 운영 건을 수정하면 이전 버전의 저장을 거절하도록 검증했다.
18. 390×844 모바일 화면에 빠른 탐색을 추가하고 카드 높이와 구간 여백을 줄였다. 가로 넘침은 없고 전체 높이는 8,349px에서 7,546px로 줄었다.

## 2026-09-01 최종 비교 조건

- 사용자 기준 이미지 크기: 매칭 916×86px, 수거 362×532px
- 구현 전체 화면: 수거 1280×1143px, 모바일 케이스 스터디 390×7546px
- CSS 화면 크기와 밀도: 데스크톱 1280px 너비, 모바일 390×844px, `deviceScaleFactor` 1
- 비교 상태: 승인자 계정, 확정된 성수 오피스 이전 프로젝트, 수거 상태 `계획`
- 전체 화면 비교: 수거 회차 카드, 입력 폼, 파트너 카드, 모바일 케이스 스터디의 정보 순서와 가로 넘침을 확인했다.
- 집중 비교: 사용자 수거 이미지의 임직원 파트너 카드와 수정 후 동일 카드를 높이 92px로 정규화해 한 이미지에서 비교했다. 파트너 아이콘이 핵심 대상이므로 별도 이미지 생성은 필요하지 않았다.

## 필수 품질 표면

- 글꼴과 타이포그래피: Noto Sans KR과 Newsreader 조합, 제목 위계, 11px 이상 보조 문구, 줄바꿈과 말줄임을 확인했다.
- 간격과 레이아웃: 원형 아이콘, 파트너 카드, 수거 입력 그리드, 모바일 구간 여백과 2열 기술 카드의 정렬을 확인했다.
- 색상과 토큰: 파트너 유형별 배경과 전경색, 상태색, 테두리와 본문 대비가 기존 토큰 체계를 유지한다.
- 이미지와 아이콘: Phosphor 아이콘을 유지하고 사용자 이미지에서 지적된 도형 중심만 유형별로 광학 보정했다. 임시 이미지나 코드로 그린 대체 자산은 없다.
- 문구와 콘텐츠: 수거 상태, 담당자, 결제사 확인과 합성 검증의 한계를 자연스러운 한국어로 유지했다.

## 최종 상호작용 검증

- 매칭 조건 모달을 취소하거나 완료하면 `조건 다시 계산` 버튼으로 포커스가 돌아온다.
- `준비 완료`부터 수거지, 시간대, 차량, 담당자를 모두 요구하며 서버도 같은 조건을 검증한다.
- 수거 상태를 연속 저장해도 배지와 선택값이 일치한다.
- 정산 상태를 연속 저장해도 요약 카드와 선택값이 일치한다.
- 두 탭의 동시 수정에서 늦은 저장은 최신 내용을 덮어쓰지 않고 충돌 메시지를 표시한다.
- 모바일 빠른 탐색 링크 4개가 표시되고 390px에서 가로 넘침이 없다.
- 브라우저 콘솔 경고와 오류는 0건이다.

## 시안과 의도적으로 다른 부분

- 시안의 자산별 수량은 총합과 일치하지 않아 96개, 48개, 42개, 28개로 정정했다. 추천 입찰 수량도 이 값과 정확히 일치한다.
- 실제 결제사와 운송사 연동이 없으므로 에스크로 보관이나 담당자 확인 완료 같은 단정 표현을 제거했다.
- 운영 상태는 데이터베이스에 저장된 수거 작업과 정산 원장을 그대로 표시한다.

## 최종 판정

| 심각도 | 열린 항목 | 판정 |
| --- | ---: | --- |
| P0 | 0 | 없음 |
| P1 | 0 | 없음 |
| P2 | 0 | 없음 |

검증 범위에는 화면 구조, 타이포그래피, 색상, 반응형 레이아웃, 주요 상호작용, 권한 상태, 접근성 이름과 정적 자산 로딩이 포함된다.

final result: passed
