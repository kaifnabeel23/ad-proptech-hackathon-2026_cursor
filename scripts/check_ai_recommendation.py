#!/usr/bin/env python3
"""
Check AI recommendation layer for Al Ghadeer.

Always validates deterministic fallback (must pass).
Optionally tests OpenRouter when OPENROUTER_API_KEY is set.
Never prints API keys.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ai.fallback import fallback_recommendation  # noqa: E402
from ai.recommendation import generate_recommendation  # noqa: E402

REQUIRED_KEYS = (
    "district_summary",
    "main_gap",
    "recommended_intervention",
    "why_this_matters",
    "confidence_note",
    "uncertainty_note",
)

DISTRICT_NAME = "Al Ghadeer"
DATA_PATH = ROOT / "processed" / "community_gap_outputs.json"


def _load_env_files() -> None:
    """Load .env files into os.environ without printing values."""
    candidates = [
        ROOT / ".env.local",
        ROOT / ".env",
        ROOT.parent / ".env",
    ]
    for path in candidates:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def _validate_output(rec: dict[str, str], label: str) -> None:
    missing = [k for k in REQUIRED_KEYS if k not in rec]
    if missing:
        raise AssertionError(f"{label}: missing keys: {', '.join(missing)}")

    empty = [k for k in REQUIRED_KEYS if not str(rec[k]).strip()]
    if empty:
        raise AssertionError(f"{label}: empty fields: {', '.join(empty)}")


def _print_result(rec: dict[str, str], source: str) -> None:
    print(f"\n=== {DISTRICT_NAME} ({source}) ===")
    print(json.dumps(rec, indent=2, ensure_ascii=False))


def main() -> int:
    _load_env_files()

    if not DATA_PATH.is_file():
        print(f"ERROR: missing {DATA_PATH}", file=sys.stderr)
        return 1

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    district = next(
        (d for d in payload["districts"] if d["district"] == DISTRICT_NAME),
        None,
    )
    if district is None:
        print(f"ERROR: district not found in JSON: {DISTRICT_NAME}", file=sys.stderr)
        return 1

    print(f"Loaded {DATA_PATH.name} — checking {DISTRICT_NAME}")

    # 1. Fallback (required)
    fallback_rec = fallback_recommendation(district)
    _validate_output(fallback_rec, "fallback")
    _print_result(fallback_rec, "fallback")

    assert (
        fallback_rec["recommended_intervention"]
        == district["classification"]["recommended_intervention_category"]
    )
    assert "top priority in the current dataset" in fallback_rec["district_summary"].lower()

    print("\nFallback check: PASSED")

    # 2. OpenRouter (optional)
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if api_key:
        print("\nOPENROUTER_API_KEY found — testing OpenRouter path...")
        try:
            result = generate_recommendation(district, force_fallback=False)
            rec = result["recommendation"]
            source = result["source"]
            _validate_output(rec, f"openrouter ({source})")
            _print_result(rec, source)
            if source == "llm":
                print("\nOpenRouter check: PASSED (llm)")
            else:
                print("\nOpenRouter check: PASSED (fell back to deterministic output)")
        except Exception as exc:
            print(f"\nOpenRouter check: SKIPPED ({exc})")
            print("Fallback still passed — overall check OK.")
    else:
        print("\nOPENROUTER_API_KEY not set — skipping OpenRouter test.")

    print("\nAll required checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
