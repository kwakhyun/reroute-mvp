#!/usr/bin/env python3
"""Keep the portable report's embedded runtime payload in sync with its artifact."""

from __future__ import annotations

import base64
import gzip
import io
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_PATH = ROOT / "analysis/validation-report-artifact.json"
REPORT_PATH = ROOT / "public/reports/validation-simulation.html"
PAYLOAD_PATTERN = re.compile(
    r'(<template id="data-analytics-portable-artifact-payload-source" '
    r'data-compression="gzip-base64">)(.*?)(</template>)',
    re.DOTALL,
)
FALLBACK_COPY = (
    "다음 검증안은 사업팀이 기업 5곳 이내를 대상으로 고객의 지불 의사를 확인하는 것입니다",
    "가상 데이터만으로 후속 개발 여부를 결정할 수 없습니다",
    "개인 프로젝트에서는 참여 기업을 모집하거나 영업하지 않았습니다",
    "가정에 따라 전체 기준 충족 확률은 1.6%에서 52.3%까지 달라집니다",
    "다음 검증에서 할 일",
)


def compress_portably(payload: bytes) -> bytes:
    """Create reproducible gzip bytes without exposing the host OS in the header."""
    buffer = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=buffer, mtime=0) as compressed:
        compressed.write(payload)
    return buffer.getvalue()


def main() -> None:
    report = REPORT_PATH.read_text(encoding="utf-8")
    missing_fallback_copy = [text for text in FALLBACK_COPY if text not in report]
    if missing_fallback_copy:
        raise RuntimeError(f"portable report fallback copy is stale: {missing_fallback_copy}")

    artifact_bytes = ARTIFACT_PATH.read_bytes()
    encoded_payload = base64.b64encode(compress_portably(artifact_bytes)).decode("ascii")
    updated_report, count = PAYLOAD_PATTERN.subn(
        lambda match: f"{match.group(1)}{encoded_payload}{match.group(3)}",
        report,
        count=1,
    )
    if count != 1:
        raise RuntimeError("portable artifact payload template was not found exactly once")

    REPORT_PATH.write_text(updated_report, encoding="utf-8")
    print(REPORT_PATH)


if __name__ == "__main__":
    main()
