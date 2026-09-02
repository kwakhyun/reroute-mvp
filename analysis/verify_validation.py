#!/usr/bin/env python3
"""Verify deterministic synthetic-validation artifacts and notebook outputs."""

from __future__ import annotations

import base64
import csv
import gzip
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TRACKED_OUTPUTS = (
    ROOT / "analysis/generated/validation-simulation-cohort.csv",
    ROOT / "analysis/generated/validation-simulation-results.json",
    ROOT / "analysis/generated/validation-report-source.sql",
    ROOT / "analysis/validation-report-artifact.json",
    ROOT / "docs/validation-simulation.md",
    ROOT / "public/reports/validation-simulation.html",
)
DISCLAIMER = "실제 고객 검증 결과가 아님"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_notebook() -> dict[str, int]:
    notebook = json.loads((ROOT / "analysis/validation-simulation.ipynb").read_text(encoding="utf-8"))
    code_cells = [cell for cell in notebook["cells"] if cell["cell_type"] == "code"]
    assert code_cells, "notebook must contain executable cells"
    assert all(cell.get("execution_count") is not None for cell in code_cells), "notebook has an unexecuted code cell"
    errors = [
        output
        for cell in code_cells
        for output in cell.get("outputs", [])
        if output.get("output_type") == "error"
    ]
    assert not errors, "notebook contains an execution error"
    return {"code_cells": len(code_cells), "errors": len(errors)}


def validate_rows() -> dict[str, int]:
    result_path = ROOT / "analysis/generated/validation-simulation-results.json"
    cohort_path = ROOT / "analysis/generated/validation-simulation-cohort.csv"
    result = json.loads(result_path.read_text(encoding="utf-8"))
    with cohort_path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    users = [row for row in rows if row["record_type"] == "synthetic_user"]
    companies = [row for row in rows if row["record_type"] == "synthetic_company"]
    recomputed = {
        "dashboard_viewed": sum(int(row["dashboard_viewed"]) for row in users),
        "bids_opened": sum(int(row["bids_opened"]) for row in users),
        "recalculation_opened": sum(int(row["recalculation_opened"]) for row in users),
        "confirmation_opened": sum(int(row["confirmation_opened"]) for row in users),
        "pilot_interest": sum(int(row["pilot_interest"]) for row in companies),
        "paid_pilot": sum(int(row["paid_pilot"]) for row in companies),
    }
    assert result["synthetic"] is True
    assert result["required_disclaimer"].endswith("실제 고객 검증 결과가 아님")
    assert len(users) == 10 and len(companies) == 5
    assert recomputed == result["base"]["representative"]["counts"]
    assert result["decision"]["recommendation"] == "CUSTOMER_VALIDATION_NEXT"
    assert result["decision"]["follow_up_development"] == "REQUIRES_CUSTOMER_VALIDATION"
    return {"users": len(users), "companies": len(companies), **recomputed}


def main() -> None:
    missing = [str(path.relative_to(ROOT)) for path in TRACKED_OUTPUTS if not path.exists()]
    assert not missing, f"missing generated outputs: {missing}"
    before = {str(path.relative_to(ROOT)): digest(path) for path in TRACKED_OUTPUTS}
    subprocess.run([sys.executable, "analysis/simulate_validation.py"], cwd=ROOT, check=True, capture_output=True)
    subprocess.run([sys.executable, "analysis/build_validation_report.py"], cwd=ROOT, check=True, capture_output=True)
    subprocess.run([sys.executable, "analysis/sync_validation_report_payload.py"], cwd=ROOT, check=True, capture_output=True)
    after = {str(path.relative_to(ROOT)): digest(path) for path in TRACKED_OUTPUTS}
    assert before == after, "generated outputs changed; the simulation is not deterministic"

    markdown = (ROOT / "docs/validation-simulation.md").read_text(encoding="utf-8")
    artifact = (ROOT / "analysis/validation-report-artifact.json").read_text(encoding="utf-8")
    html = (ROOT / "public/reports/validation-simulation.html").read_text(encoding="utf-8")
    payload_match = re.search(
        r'<template id="data-analytics-portable-artifact-payload-source" '
        r'data-compression="gzip-base64">([^<]+)</template>',
        html,
    )
    assert payload_match, "portable artifact payload is missing"
    compressed_payload = base64.b64decode(payload_match.group(1))
    assert len(compressed_payload) >= 10, "portable artifact gzip payload is incomplete"
    assert compressed_payload[:2] == b"\x1f\x8b", "portable artifact payload is not gzip"
    assert compressed_payload[9] == 255, "portable artifact gzip header depends on the host OS"
    embedded_artifact = json.loads(gzip.decompress(compressed_payload))
    assert embedded_artifact == json.loads(artifact), "portable artifact payload is stale"
    assert "실제 고객 인터뷰나 운영 기록이 아닙니다" in markdown
    assert "\"status\": \"fixture\"" in artifact
    assert "REROUTE 가상 데이터 분석 보고서" in html
    assert "다음 검증안은 사업팀이 기업 5곳 이내를 대상으로 고객의 지불 의사를 확인하는 것입니다" in markdown
    assert "다음 검증안은 사업팀이 기업 5곳 이내를 대상으로 고객의 지불 의사를 확인하는 것입니다" in artifact
    assert "다음 검증안은 사업팀이 기업 5곳 이내를 대상으로 고객의 지불 의사를 확인하는 것입니다" in html
    assert "소규모 실제 파일럿은 진행할 가치가 있습니다" not in markdown
    assert "소규모 실제 파일럿은 진행할 가치가 있습니다" not in artifact
    assert "소규모 실제 파일럿은 진행할 가치가 있습니다" not in html
    assert "Tables:" not in html
    assert "개인 프로젝트에서는 참여 기업을 모집하거나 영업하지 않았습니다" in html
    assert "의향와" not in html
    assert "의향를" not in html
    duplicated_result_label = "\uc608\uc2dc \uacb0\uacfc \uacb0\uacfc"
    assert duplicated_result_label not in html
    assert DISCLAIMER in json.loads((ROOT / "analysis/generated/validation-simulation-results.json").read_text())["required_disclaimer"]

    print(json.dumps({
        "status": "validated",
        "deterministic_outputs": len(before),
        "cohort": validate_rows(),
        "notebook": validate_notebook(),
        "portable_report": "present",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
