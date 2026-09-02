#!/usr/bin/env python3
"""Generate a deterministic, explicitly synthetic validation simulation.

The output is useful for exercising the product decision framework before a
real pilot. It must never be presented as customer research or observed usage.
"""

from __future__ import annotations

import csv
import json
import random
import statistics
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "analysis" / "generated"
SEED = 20_260_901
BASE_ITERATIONS = 50_000
SENSITIVITY_ITERATIONS = 20_000


@dataclass(frozen=True)
class Scenario:
    name: str
    label: str
    bid_prior: tuple[float, float]
    recalc_prior: tuple[float, float]
    confirm_prior: tuple[float, float]
    interest_prior: tuple[float, float]
    paid_prior: tuple[float, float]


SCENARIOS = (
    Scenario(
        name="conservative",
        label="보수",
        bid_prior=(12, 10),
        recalc_prior=(8, 12),
        confirm_prior=(5, 12),
        interest_prior=(5, 7),
        paid_prior=(3, 8),
    ),
    Scenario(
        name="base",
        label="기준",
        bid_prior=(17, 8),
        recalc_prior=(11, 9),
        confirm_prior=(8, 11),
        interest_prior=(7, 5),
        paid_prior=(5, 6),
    ),
    Scenario(
        name="optimistic",
        label="낙관",
        bid_prior=(22, 6),
        recalc_prior=(15, 7),
        confirm_prior=(11, 9),
        interest_prior=(10, 4),
        paid_prior=(8, 6),
    ),
)


PERSONAS = (
    ("SYN-U01", "총무", "100–299명", "3개월 내 이전"),
    ("SYN-U02", "자산관리", "300–999명", "2개월 내 통폐합"),
    ("SYN-U03", "경영지원", "100–299명", "3개월 내 리뉴얼"),
    ("SYN-U04", "총무", "1,000명 이상", "1개월 내 이전"),
    ("SYN-U05", "ESG 운영", "300–999명", "3개월 내 이전"),
    ("SYN-U06", "자산관리", "100–299명", "2개월 내 폐점"),
    ("SYN-U07", "재무기획", "1,000명 이상", "2개월 내 통폐합"),
    ("SYN-U08", "총무", "300–999명", "1개월 내 이전"),
    ("SYN-U09", "경영지원", "100–299명", "3개월 내 폐점"),
    ("SYN-U10", "자산관리", "300–999명", "2개월 내 이전"),
)

COMPANIES = (
    ("SYN-C01", "100–299명", "오피스 이전"),
    ("SYN-C02", "300–999명", "거점 통폐합"),
    ("SYN-C03", "1,000명 이상", "오피스 이전"),
    ("SYN-C04", "100–299명", "폐점"),
    ("SYN-C05", "300–999명", "리뉴얼"),
)


def bernoulli(rng: random.Random, probability: float) -> bool:
    return rng.random() < probability


def percentile(values: list[int], fraction: float) -> int:
    ordered = sorted(values)
    index = round((len(ordered) - 1) * fraction)
    return ordered[index]


def run_iteration(rng: random.Random, scenario: Scenario, keep_rows: bool = False) -> dict[str, Any]:
    bid_probability = rng.betavariate(*scenario.bid_prior)
    recalc_probability = rng.betavariate(*scenario.recalc_prior)
    confirm_probability = rng.betavariate(*scenario.confirm_prior)
    interest_probability = rng.betavariate(*scenario.interest_prior)
    paid_probability = rng.betavariate(*scenario.paid_prior)

    users: list[dict[str, Any]] = []
    for participant_id, role, company_size, timing in PERSONAS:
        bids_opened = bernoulli(rng, bid_probability)
        recalculation_opened = bids_opened and bernoulli(rng, recalc_probability)
        confirmation_opened = bids_opened and bernoulli(rng, confirm_probability)
        users.append(
            {
                "participant_id": participant_id,
                "role": role,
                "company_size": company_size,
                "timing": timing,
                "dashboard_viewed": True,
                "bids_opened": bids_opened,
                "recalculation_opened": recalculation_opened,
                "confirmation_opened": confirmation_opened,
            }
        )

    companies: list[dict[str, Any]] = []
    for company_id, company_size, project_type in COMPANIES:
        pilot_interest = bernoulli(rng, interest_probability)
        paid_pilot = pilot_interest and bernoulli(rng, paid_probability)
        companies.append(
            {
                "company_id": company_id,
                "company_size": company_size,
                "project_type": project_type,
                "pilot_interest": pilot_interest,
                "paid_pilot": paid_pilot,
            }
        )

    counts = {
        "dashboard_viewed": len(users),
        "bids_opened": sum(row["bids_opened"] for row in users),
        "recalculation_opened": sum(row["recalculation_opened"] for row in users),
        "confirmation_opened": sum(row["confirmation_opened"] for row in users),
        "pilot_interest": sum(row["pilot_interest"] for row in companies),
        "paid_pilot": sum(row["paid_pilot"] for row in companies),
    }
    result: dict[str, Any] = {"counts": counts}
    if keep_rows:
        result["users"] = users
        result["companies"] = companies
    return result


def criteria(counts: dict[str, int]) -> dict[str, bool]:
    return {
        "bids_opened": counts["bids_opened"] >= 6,
        "recalculation_opened": counts["recalculation_opened"] >= 3,
        "confirmation_opened": counts["confirmation_opened"] >= 2,
        "pilot_interest": counts["pilot_interest"] >= 3,
        "paid_pilot": counts["paid_pilot"] >= 2,
    }


def simulate(scenario: Scenario, iterations: int, seed_offset: int) -> dict[str, Any]:
    rng = random.Random(SEED + seed_offset)
    outcomes: list[dict[str, int]] = []
    representative: dict[str, Any] | None = None
    representative_distance = float("inf")

    for _ in range(iterations):
        outcome = run_iteration(rng, scenario, keep_rows=True)
        counts = outcome["counts"]
        outcomes.append(counts)
        distance = (
            abs(counts["bids_opened"] - 7)
            + abs(counts["recalculation_opened"] - 4)
            + abs(counts["confirmation_opened"] - 3)
            + abs(counts["pilot_interest"] - 3)
            + abs(counts["paid_pilot"] - 1)
        )
        if distance < representative_distance:
            representative = outcome
            representative_distance = distance

    metrics = tuple(outcomes[0].keys())
    summaries: dict[str, Any] = {}
    for metric in metrics:
        values = [row[metric] for row in outcomes]
        denominator = 10 if metric in {
            "dashboard_viewed",
            "bids_opened",
            "recalculation_opened",
            "confirmation_opened",
        } else 5
        summaries[metric] = {
            "mean_count": round(statistics.fmean(values), 2),
            "median_count": int(statistics.median(values)),
            "median_rate": round(statistics.median(values) / denominator * 100, 1),
            "p05_count": percentile(values, 0.05),
            "p95_count": percentile(values, 0.95),
        }

    pass_probabilities: dict[str, float] = {}
    for metric in criteria(outcomes[0]):
        pass_probabilities[metric] = round(
            sum(criteria(row)[metric] for row in outcomes) / iterations * 100,
            1,
        )
    pass_probabilities["all_criteria"] = round(
        sum(all(criteria(row).values()) for row in outcomes) / iterations * 100,
        1,
    )
    pass_probabilities["investment_rule"] = round(
        sum(
            row["confirmation_opened"] >= 2 and row["paid_pilot"] >= 2
            for row in outcomes
        )
        / iterations
        * 100,
        1,
    )

    return {
        "scenario": scenario.name,
        "label": scenario.label,
        "iterations": iterations,
        "summary": summaries,
        "pass_probabilities": pass_probabilities,
        "representative": representative,
    }


def write_cohort_csv(representative: dict[str, Any]) -> None:
    path = OUTPUT_DIR / "validation-simulation-cohort.csv"
    fieldnames = [
        "record_type",
        "synthetic_id",
        "role_or_project",
        "company_size",
        "timing",
        "dashboard_viewed",
        "bids_opened",
        "recalculation_opened",
        "confirmation_opened",
        "pilot_interest",
        "paid_pilot",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for row in representative["users"]:
            writer.writerow(
                {
                    "record_type": "synthetic_user",
                    "synthetic_id": row["participant_id"],
                    "role_or_project": row["role"],
                    "company_size": row["company_size"],
                    "timing": row["timing"],
                    "dashboard_viewed": int(row["dashboard_viewed"]),
                    "bids_opened": int(row["bids_opened"]),
                    "recalculation_opened": int(row["recalculation_opened"]),
                    "confirmation_opened": int(row["confirmation_opened"]),
                    "pilot_interest": "",
                    "paid_pilot": "",
                }
            )
        for row in representative["companies"]:
            writer.writerow(
                {
                    "record_type": "synthetic_company",
                    "synthetic_id": row["company_id"],
                    "role_or_project": row["project_type"],
                    "company_size": row["company_size"],
                    "timing": "3개월 이내",
                    "dashboard_viewed": "",
                    "bids_opened": "",
                    "recalculation_opened": "",
                    "confirmation_opened": "",
                    "pilot_interest": int(row["pilot_interest"]),
                    "paid_pilot": int(row["paid_pilot"]),
                }
            )


def write_markdown(result: dict[str, Any]) -> None:
    base = result["base"]
    representative_counts = base["representative"]["counts"]
    probability = base["pass_probabilities"]
    scenario_rows = "\n".join(
        f"| {item['label']} | {item['pass_probabilities']['all_criteria']:.1f}% | "
        f"{item['pass_probabilities']['investment_rule']:.1f}% |"
        for item in result["scenarios"]
    )
    report = f"""# 가상 데이터 분석 보고서

> **중요:** 이 문서는 실제 고객 인터뷰나 운영 기록이 아닙니다. 실제 파일럿에 사용할 판단 기준을 점검하려고 생성한 가상 데이터이며, 사업성이 검증됐다는 근거로 사용할 수 없습니다.

## 핵심 요약

- **다음에는 기업 5곳 이내로 실제 파일럿을 진행합니다.** 예시 결과에서는 인수처 확인 자료 검토 {representative_counts['bids_opened']}/10명, 조건 탐색 {representative_counts['recalculation_opened']}/10명, 배분안 확정 화면 진입 {representative_counts['confirmation_opened']}/10명으로 행동 기준을 통과했습니다.
- **전담 개발 인력은 아직 투입하지 않습니다.** 예시 결과에서 유료 파일럿에 참여한 기업은 5곳 중 {representative_counts['paid_pilot']}곳으로 목표인 2곳에 미치지 못했습니다. 배분안 확정 화면 진입과 유료 파일럿 기준을 함께 충족할 추정 확률도 {probability['investment_rule']:.1f}%였습니다.
- **다음 검증은 가격과 구매 권한에 집중합니다.** 실제 기업 5곳을 대상으로 지불 의사, 계약 주체와 운영 중단 기준을 확인하기 전까지 이 결과는 다음 검증 방향을 정하는 참고값으로만 사용합니다.

## 검증 질문

배분안을 본 사용자가 확정 화면을 열고 유료 파일럿에 참여할 가능성이 있는지 살펴본 뒤, 소규모 실제 파일럿을 진행할지 판단합니다.

## 방법과 모집단

- 생성일: {result['generated_on']}, Asia/Seoul
- 난수 초기값: `{SEED}`. 같은 입력에서 같은 결과를 재현하기 위해 고정했습니다.
- 기준 시나리오: {BASE_ITERATIONS:,}회 몬테카를로 반복
- 가상 사용자: 이전 또는 폐점을 3개월 안에 앞둔 담당자 10명
- 가상 기업: 100인 이상 기업 5곳
- 불확실성: 각 반복에서 전환 확률을 베타 분포로 새로 추출해 표본 오차와 가정 오차를 함께 반영
- 원본: `analysis/generated/validation-simulation-cohort.csv`
- 재현: `python3 analysis/simulate_validation.py`

## 예시 결과

| 지표 | 결과 | 성공 기준 | 판정 |
| --- | ---: | ---: | --- |
| 인수처 확인 자료 검토 | {representative_counts['bids_opened']}/10명 | 6명 이상 | 통과 |
| 조건 탐색 | {representative_counts['recalculation_opened']}/10명 | 3명 이상 | 통과 |
| 배분안 확정 화면 진입 | {representative_counts['confirmation_opened']}/10명 | 2명 이상 | 통과 |
| 파일럿 참여 의향 | 기업 5곳 중 {representative_counts['pilot_interest']}곳 | 3곳 이상 | 통과 |
| 유료 파일럿 | 기업 5곳 중 {representative_counts['paid_pilot']}곳 | 2곳 이상 | 미달 |

## 불확실성 결과

| 판단 기준 | 기준 시나리오 충족 확률 |
| --- | ---: |
| 인수처 확인 자료 검토율 60% 이상 | {probability['bids_opened']:.1f}% |
| 조건 탐색률 30% 이상 | {probability['recalculation_opened']:.1f}% |
| 배분안 확정 화면 진입률 20% 이상 | {probability['confirmation_opened']:.1f}% |
| 파일럿에 참여하겠다고 답한 기업 5곳 중 3곳 이상 | {probability['pilot_interest']:.1f}% |
| 유료 파일럿에 참여한 기업 5곳 중 2곳 이상 | {probability['paid_pilot']:.1f}% |
| 모든 기준 동시 충족 | {probability['all_criteria']:.1f}% |

## 가정 민감도

| 시나리오 | 모든 기준 충족 | 개발 인력 투입 기준 충족 |
| --- | ---: | ---: |
{scenario_rows}

## 현재 판단

1. 전담 개발 인력 투입은 보류합니다.
2. 기업 5곳 이내의 소규모 실제 파일럿을 진행합니다.
3. 화면 행동보다 지불 의사와 구매 권한자를 먼저 확인합니다.
4. 유료 파일럿에 참여한 기업이 2곳 이상이고 배분안 확정 화면 진입률이 20% 이상일 때만 개발팀 인계를 검토합니다.

## 추가 질문

- 비용 절감액과 매각 대금 중 어느 금액을 기준으로 수수료를 계산해야 고객이 이해하기 쉬운가?
- 승인자는 총무, 재무, ESG 조직 중 누구이며 계약 예산은 어느 조직에 있는가?
- 수거 지연과 사업자 확인을 마치지 않은 인수처의 비율이 어느 수준에 이르면 파일럿을 중단해야 하는가?

## 한계와 사용 금지 범위

- 실제 사용자 행동, 인터뷰, 계약 또는 매출을 관측하지 않았습니다.
- 확률 분포를 정할 때 사용한 가정은 실제 관측값이 아니며 결과에 직접 영향을 줍니다.
- 인과 효과나 시장 수요를 증명하지 않습니다.
- 이 결과를 “사용자 10명 테스트 완료”, “기업 5곳 파일럿 진행”, “유료 고객 확보”로 표현하면 안 됩니다.
"""
    (ROOT / "docs" / "validation-simulation.md").write_text(report, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    scenario_results = []
    for index, scenario in enumerate(SCENARIOS):
        iterations = BASE_ITERATIONS if scenario.name == "base" else SENSITIVITY_ITERATIONS
        scenario_results.append(simulate(scenario, iterations, seed_offset=index * 10_000))

    base = next(item for item in scenario_results if item["scenario"] == "base")
    result = {
        "artifact_type": "synthetic_validation_simulation",
        "synthetic": True,
        "generated_on": date(2026, 9, 1).isoformat(),
        "timezone": "Asia/Seoul",
        "seed": SEED,
        "base": base,
        "scenarios": scenario_results,
        "decision": {
            "recommendation": "LIMITED_PILOT",
            "dedicated_investment": "HOLD",
            "reason": "화면 행동 기준은 통과했지만 유료 파일럿 기준과 전체 기준을 함께 충족할 확률이 낮음",
        },
        "required_disclaimer": "가상 데이터 분석이며 실제 고객 검증 결과가 아님",
    }
    write_cohort_csv(base["representative"])
    (OUTPUT_DIR / "validation-simulation-results.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_markdown(result)
    print(
        json.dumps(
            {
                "representative": base["representative"]["counts"],
                "pass_probabilities": base["pass_probabilities"],
                "decision": result["decision"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
