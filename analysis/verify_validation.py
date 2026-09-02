#!/usr/bin/env python3
"""Verify deterministic synthetic-validation artifacts and notebook outputs."""

from __future__ import annotations

import csv
import hashlib
import json
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
    assert result["decision"]["recommendation"] == "LIMITED_PILOT"
    assert result["decision"]["dedicated_investment"] == "HOLD"
    return {"users": len(users), "companies": len(companies), **recomputed}


def main() -> None:
    missing = [str(path.relative_to(ROOT)) for path in TRACKED_OUTPUTS if not path.exists()]
    assert not missing, f"missing generated outputs: {missing}"
    before = {str(path.relative_to(ROOT)): digest(path) for path in TRACKED_OUTPUTS}
    subprocess.run([sys.executable, "analysis/simulate_validation.py"], cwd=ROOT, check=True, capture_output=True)
    subprocess.run([sys.executable, "analysis/build_validation_report.py"], cwd=ROOT, check=True, capture_output=True)
    after = {str(path.relative_to(ROOT)): digest(path) for path in TRACKED_OUTPUTS}
    assert before == after, "generated outputs changed; the simulation is not deterministic"

    markdown = (ROOT / "docs/validation-simulation.md").read_text(encoding="utf-8")
    artifact = (ROOT / "analysis/validation-report-artifact.json").read_text(encoding="utf-8")
    html = (ROOT / "public/reports/validation-simulation.html").read_text(encoding="utf-8")
    assert "실제 고객 인터뷰나 운영 기록이 아닙니다" in markdown
    assert "\"status\": \"fixture\"" in artifact
    assert "REROUTE 가상 데이터 분석 보고서" in html
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
