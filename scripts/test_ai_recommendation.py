#!/usr/bin/env python3
"""Smoke-test the fallback recommendation layer against processed JSON."""

from __future__ import annotations

import json
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


def main() -> None:
    data_path = ROOT / "processed" / "community_gap_outputs.json"
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    districts = payload["districts"]

    samples = [
        next(d for d in districts if d["district"] == "Al Ghadeer"),
        next(d for d in districts if d["district"] == "Al Raha Beach"),
        next(d for d in districts if d["district"] == "Al Khalidiyah"),
    ]

    for district in samples:
        rec = fallback_recommendation(district)
        print(f"\n=== {district['district']} (fallback) ===")
        print(json.dumps(rec, indent=2, ensure_ascii=False))

        for key in REQUIRED_KEYS:
            assert key in rec and rec[key].strip()

        assert rec["recommended_intervention"] == district["classification"][
            "recommended_intervention_category"
        ]
        assert district["classification"]["confidence_level"] in rec["confidence_note"]

        bullet_count = min(3, len(district.get("evidence_bullets", [])))
        if bullet_count:
            assert district["evidence_bullets"][0] in rec["why_this_matters"]

        if district["district"] == "Al Ghadeer":
            assert "top priority in the current dataset" in rec["district_summary"].lower()
            assert "high gap" not in rec["district_summary"].lower()
            assert "multiple pipeline signals agree" in rec["confidence_note"].lower()

        if district["district"] == "Al Raha Beach":
            assert "caution" in rec["confidence_note"].lower()
            assert "mixed" in rec["uncertainty_note"].lower()

        if district["district"] == "Al Khalidiyah":
            assert "caution" in rec["confidence_note"].lower()

        # API path fallback should match standalone fallback
        api_result = generate_recommendation(district, force_fallback=True)
        assert api_result["recommendation"] == rec

    print("\nAll fallback checks passed.")


if __name__ == "__main__":
    main()
