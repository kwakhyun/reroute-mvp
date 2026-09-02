#!/usr/bin/env python3
"""Build the canonical, portable validation-simulation report artifact."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "analysis" / "generated" / "validation-simulation-results.json"
ARTIFACT_PATH = ROOT / "analysis" / "validation-report-artifact.json"
SQL_PATH = ROOT / "analysis" / "generated" / "validation-report-source.sql"
GENERATED_AT = "2026-09-01T09:00:00+09:00"


METRIC_LABELS = {
    "bids_opened": ("인수처 확인 자료 검토", "6/10명 이상"),
    "recalculation_opened": ("조건 탐색", "3/10명 이상"),
    "confirmation_opened": ("배분안 확정 화면 진입", "2/10명 이상"),
    "pilot_interest": ("파일럿 참여 의향", "기업 5곳 중 3곳 이상"),
    "paid_pilot": ("유료 파일럿", "기업 5곳 중 2곳 이상"),
    "all_criteria": ("모든 기준 동시 충족", "5개 기준 모두 충족"),
}


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(criteria_rows: list[dict[str, Any]], sensitivity_rows: list[dict[str, Any]]) -> str:
    criteria_values = ",\n    ".join(
        "(" + ", ".join(
            [
                sql_string(row["metric"]),
                sql_string(row["label"]),
                str(row["probability"]),
                sql_string(row["threshold"]),
                str(row.get("median_count", "NULL")),
                str(row.get("denominator", "NULL")),
            ]
        ) + ")"
        for row in criteria_rows
    )
    sensitivity_values = ",\n    ".join(
        "(" + ", ".join(
            [
                sql_string(row["scenario"]),
                sql_string(row["label"]),
                str(row["all_criteria_probability"]),
                str(row["investment_rule_probability"]),
                str(row["iterations"]),
            ]
        ) + ")"
        for row in sensitivity_rows
    )
    return f"""-- Synthetic simulation only. This query materializes the reviewed report rows.
WITH criteria(metric, label, probability, threshold, median_count, denominator) AS (
  VALUES
    {criteria_values}
),
sensitivity(scenario, label, all_criteria_probability, investment_rule_probability, iterations) AS (
  VALUES
    {sensitivity_values}
)
SELECT
  'criterion' AS row_type,
  metric AS row_id,
  label,
  probability,
  threshold,
  median_count,
  denominator,
  NULL AS all_criteria_probability,
  NULL AS investment_rule_probability,
  NULL AS iterations
FROM criteria
UNION ALL
SELECT
  'scenario' AS row_type,
  scenario AS row_id,
  label,
  NULL AS probability,
  NULL AS threshold,
  NULL AS median_count,
  NULL AS denominator,
  all_criteria_probability,
  investment_rule_probability,
  iterations
FROM sensitivity;
"""


def make_source(source_id: str, label: str, query: str, description: str) -> dict[str, Any]:
    return {
        "id": source_id,
        "label": label,
        "path": "analysis/generated/validation-report-source.sql",
        "query": {
            "engine": "sqlite",
            "language": "sql",
            "sql": query,
            "description": description,
            "tables_used": ["criteria", "sensitivity"],
            "filters": [
                "synthetic=true",
                "seed=20260901",
                "base_iterations=50000",
                "sensitivity_iterations=20000",
            ],
            "metric_definitions": {
                "criterion_probability": "몬테카를로 반복 중 각 성공 기준을 충족한 횟수 / 전체 반복 횟수",
                "investment_rule_probability": "확정 화면을 연 사용자 2명 이상과 유료 파일럿 참여 기업 2곳 이상을 동시에 충족한 비율",
            },
            "executed_at": GENERATED_AT,
        },
    }


def main() -> None:
    data = json.loads(RESULT_PATH.read_text(encoding="utf-8"))
    base = data["base"]
    representative = base["representative"]["counts"]
    probabilities = base["pass_probabilities"]

    criteria_rows: list[dict[str, Any]] = []
    for key in (
        "bids_opened",
        "recalculation_opened",
        "confirmation_opened",
        "pilot_interest",
        "paid_pilot",
        "all_criteria",
    ):
        label, threshold = METRIC_LABELS[key]
        denominator = 10 if key in {"bids_opened", "recalculation_opened", "confirmation_opened"} else 5
        row: dict[str, Any] = {
            "metric": key,
            "label": label,
            "probability": probabilities[key] / 100,
            "probability_points": probabilities[key],
            "threshold": threshold,
            "scenario": "base",
            "iterations": base["iterations"],
            "synthetic": True,
        }
        if key != "all_criteria":
            row["median_count"] = base["summary"][key]["median_count"]
            row["denominator"] = denominator
        criteria_rows.append(row)

    sensitivity_rows = [
        {
            "scenario": scenario["scenario"],
            "label": scenario["label"],
            "all_criteria_probability": scenario["pass_probabilities"]["all_criteria"] / 100,
            "investment_rule_probability": scenario["pass_probabilities"]["investment_rule"] / 100,
            "iterations": scenario["iterations"],
            "synthetic": True,
            "assumption_band": "prior sensitivity",
        }
        for scenario in data["scenarios"]
    ]
    summary_rows = [
        {
            "all_criteria_probability": probabilities["all_criteria"] / 100,
            "investment_rule_probability": probabilities["investment_rule"] / 100,
            "paid_pilot_median": representative["paid_pilot"],
            "paid_pilot_target": 2,
            "company_denominator": 5,
            "base_iterations": base["iterations"],
            "synthetic": True,
        }
    ]

    sql = build_sql(criteria_rows, sensitivity_rows)
    SQL_PATH.write_text(sql, encoding="utf-8")
    criteria_query = sql.rsplit("UNION ALL", 1)[0].rstrip().removesuffix(";") + ";"
    sensitivity_query = (
        "WITH sensitivity(scenario, label, all_criteria_probability, "
        "investment_rule_probability, iterations) AS (VALUES\n    "
        + ",\n    ".join(
            "(" + ", ".join(
                [
                    sql_string(row["scenario"]),
                    sql_string(row["label"]),
                    str(row["all_criteria_probability"]),
                    str(row["investment_rule_probability"]),
                    str(row["iterations"]),
                ]
            ) + ")"
            for row in sensitivity_rows
        )
        + "\n) SELECT * FROM sensitivity;"
    )
    summary_query = (
        "SELECT "
        f"{summary_rows[0]['all_criteria_probability']} AS all_criteria_probability, "
        f"{summary_rows[0]['investment_rule_probability']} AS investment_rule_probability, "
        f"{summary_rows[0]['paid_pilot_median']} AS paid_pilot_median, "
        f"{summary_rows[0]['paid_pilot_target']} AS paid_pilot_target, "
        f"{summary_rows[0]['company_denominator']} AS company_denominator, "
        f"{summary_rows[0]['base_iterations']} AS base_iterations;"
    )

    sources = [
        make_source(
            "criteria_source",
            "성공 기준 충족 확률",
            criteria_query,
            "같은 난수 초기값으로 반복한 가상 데이터의 기준별 충족 확률을 재현합니다.",
        ),
        make_source(
            "sensitivity_source",
            "가정 민감도",
            sensitivity_query,
            "보수, 기준, 낙관 사전 가정에 따른 판단 확률을 재현합니다.",
        ),
        make_source(
            "summary_source",
            "개발 인력 투입 판단",
            summary_query,
            "전체 기준, 개발 인력 투입 기준, 유료 파일럿 참여 기업 수 중앙값을 재현합니다.",
        ),
        {
            "id": "simulation_code",
            "label": "재현 스크립트",
            "path": "analysis/simulate_validation.py",
        },
        {
            "id": "cohort_source",
            "label": "예시 결과",
            "path": "analysis/generated/validation-simulation-cohort.csv",
        },
    ]

    artifact = {
        "surface": "report",
        "manifest": {
            "version": 1,
            "surface": "report",
            "title": "REROUTE 가상 데이터 분석 보고서",
            "description": "실제 고객 파일럿 전에 제품의 성공 기준과 개발 인력 투입 기준을 점검한 보고서",
            "generatedAt": GENERATED_AT,
            "cards": [
                {
                    "id": "all_criteria_card",
                    "description": "다섯 가지 성공 기준을 한 번의 시뮬레이션에서 모두 충족한 비율",
                    "dataset": "summary",
                    "sourceId": "summary_source",
                    "metrics": [
                        {"label": "모든 기준 동시 충족", "field": "all_criteria_probability", "format": "percent"}
                    ],
                },
                {
                    "id": "investment_rule_card",
                    "description": "확정 화면을 연 사용자 2명 이상과 유료 파일럿 참여 기업 2곳 이상을 동시에 충족한 비율",
                    "dataset": "summary",
                    "sourceId": "summary_source",
                    "metrics": [
                        {"label": "전담 개발 인력 투입 기준 충족", "field": "investment_rule_probability", "format": "percent"}
                    ],
                },
                {
                    "id": "paid_pilot_card",
                    "description": "기준 시나리오에서 유료 파일럿으로 전환한 기업 수의 중앙값",
                    "dataset": "summary",
                    "sourceId": "summary_source",
                    "metrics": [
                        {"label": "유료 파일럿 참여 기업 수 중앙값", "field": "paid_pilot_median", "format": "number"},
                        {"label": "목표", "field": "paid_pilot_target", "format": "number"},
                    ],
                },
            ],
            "charts": [
                {
                    "id": "criteria_probability_chart",
                    "title": "기준별 충족 추정 확률",
                    "subtitle": "유료 파일럿과 모든 기준 동시 충족이 가장 큰 불확실성입니다.",
                    "type": "bar",
                    "dataset": "criteria",
                    "sourceId": "criteria_source",
                    "valueFormat": "percent",
                    "encodings": {
                        "x": {"field": "label", "type": "nominal", "label": "판단 기준"},
                        "y": {"field": "probability", "type": "quantitative", "label": "충족 확률", "format": "percent"},
                        "tooltip": [
                            {"field": "threshold", "type": "nominal", "label": "성공 기준"},
                            {"field": "iterations", "type": "quantitative", "label": "반복 횟수"},
                        ],
                    },
                }
            ],
            "tables": [
                {
                    "id": "sensitivity_table",
                    "title": "가정 민감도",
                    "subtitle": "사전 확률 가정을 바꿔 결론의 안정성을 확인합니다.",
                    "dataset": "sensitivity",
                    "sourceId": "sensitivity_source",
                    "defaultSort": {"field": "all_criteria_probability", "direction": "desc"},
                    "columns": [
                        {"field": "label", "label": "시나리오", "type": "text"},
                        {"field": "all_criteria_probability", "label": "모든 기준 충족", "format": "percent"},
                        {"field": "investment_rule_probability", "label": "개발 인력 투입 기준 충족", "format": "percent"},
                        {"field": "iterations", "label": "반복 횟수", "format": "number"},
                    ],
                }
            ],
            "sources": [
                {"id": source["id"], "label": source["label"], "path": source["path"]}
                for source in sources
            ],
            "blocks": [
                {"id": "title", "type": "markdown", "body": "# REROUTE 가상 데이터 분석 보고서"},
                {
                    "id": "executive_summary",
                    "type": "markdown",
                    "sourceId": "summary_source",
                    "body": (
                        "## 핵심 요약\n\n"
                        "> **중요:** 실제 고객 조사나 운영 기록이 아닙니다. 같은 결과를 재현할 수 있도록 난수 초기값을 고정해 만든 가상 데이터입니다.\n\n"
                        f"- **소규모 실제 파일럿은 진행할 가치가 있습니다.** 기준 시나리오에서 5개 성공 기준을 모두 충족할 추정 확률은 {probabilities['all_criteria']:.1f}%입니다.\n"
                        f"- **전담 개발 인력 투입은 보류해야 합니다.** 배분안 확정 화면 진입과 유료 파일럿 기준을 함께 충족할 추정 확률은 {probabilities['investment_rule']:.1f}%입니다. 예시 결과에서 유료 파일럿에 참여한 기업은 5곳 중 {representative['paid_pilot']}곳으로 목표인 2곳에 미치지 못했습니다.\n"
                        "- **다음 단계에서는 실제 지불 의향과 구매 결정권자를 확인합니다.** 실제 기업 5곳의 지불 의사와 계약 주체를 확인하기 전까지 이 결과는 다음 검증 방향을 정하는 참고값으로만 사용합니다."
                    ),
                },
                {"id": "decision_metrics", "type": "metric-strip", "cardIds": ["all_criteria_card", "investment_rule_card", "paid_pilot_card"]},
                {
                    "id": "method",
                    "type": "markdown",
                    "sourceId": "simulation_code",
                    "body": (
                        "## 방법\n\n"
                        "100인 이상 기업의 이전, 통폐합, 폐점 상황을 가정한 가상 사용자 10명과 가상 기업 5곳을 대상으로 했습니다. "
                        "각 반복에서 전환 확률을 베타 분포로 새로 추출해 표본 오차와 가정 오차를 함께 반영했습니다. 기준 시나리오는 50,000회, 민감도 시나리오는 각각 20,000회 반복했습니다."
                    ),
                },
                {"id": "criteria_chart", "type": "chart", "chartId": "criteria_probability_chart", "layout": "full"},
                {
                    "id": "sensitivity_heading",
                    "type": "markdown",
                    "sourceId": "sensitivity_source",
                    "body": "## 가정이 달라져도 개발 인력 투입은 신중해야 합니다\n\n낙관 시나리오에서도 실제 고객 근거 없이 전담 개발 인력을 투입할 수 없습니다. 보수 시나리오에서는 모든 기준을 충족할 가능성이 크게 낮아집니다.",
                },
                {"id": "sensitivity", "type": "table", "tableId": "sensitivity_table"},
                {
                    "id": "next_steps",
                    "type": "markdown",
                    "body": (
                        "## 권장 다음 단계\n\n"
                        "1. 기업 5곳 이내에서 소규모 실제 파일럿을 진행합니다.\n"
                        "2. 화면 반응보다 지불 의사, 계약 주체와 운영 중단 기준을 먼저 확인합니다.\n"
                        "3. 유료 파일럿에 참여한 기업이 2곳 이상이고 배분안 확정 화면 진입률이 20% 이상일 때만 전담 개발 인력 투입을 다시 판단합니다."
                    ),
                },
                {
                    "id": "caveats",
                    "type": "markdown",
                    "body": (
                        "## 한계와 사용 금지 범위\n\n"
                        "- 실제 사용자 행동, 인터뷰, 계약, 매출을 관측하지 않았습니다.\n"
                        "- 분포의 사전 가정은 실제 관측값이 아니며 결과에 직접 영향을 줍니다.\n"
                        "- 인과 효과나 시장 수요를 증명하지 않습니다.\n"
                        "- 이 결과를 사용자 테스트 완료, 파일럿 진행, 유료 고객 확보로 표현하면 안 됩니다."
                    ),
                },
            ],
        },
        "snapshot": {
            "version": 1,
            "generatedAt": GENERATED_AT,
            "status": "fixture",
            "datasets": {
                "summary": summary_rows,
                "criteria": criteria_rows,
                "sensitivity": sensitivity_rows,
            },
        },
        "sources": sources,
        "package_info": {
            "originUrl": "artifact://reroute-synthetic-validation",
            "controls": {"edit": False, "refresh": False},
        },
    }
    ARTIFACT_PATH.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(ARTIFACT_PATH)


if __name__ == "__main__":
    main()
