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

**Final result: passed**
