#!/usr/bin/env python3
"""
Validate processed community gap outputs.

Run from repo root::

    python scripts/check_community_gap_data.py

Exit codes:
  0 — all checks passed (warnings may still be printed)
  1 — validation failure
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from community_gap import OUTPUT_JSON  # noqa: E402
from community_gap.export import SCORE_KEYS  # noqa: E402

REQUIRED_DISTRICT_KEYS = (
    "district",
    "community_metrics",
    "amenity_counts",
    "supporting_context",
    "scores",
    "classification",
    "evidence_bullets",
    "top_gap_drivers",
)

VALID_LEVELS = frozenset({"High", "Medium", "Low"})


def _is_empty(value: Any) -> bool:
    """True when a value is missing or empty."""
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, (list, dict)) and len(value) == 0:
        return True
    return False


def _validate_district(
    district: dict[str, Any],
    index: int,
) -> tuple[list[str], list[str]]:
    """Validate one district object. Returns (errors, warnings)."""
    errors: list[str] = []
    warnings: list[str] = []
    label = district.get("district") or f"index {index}"

    for key in REQUIRED_DISTRICT_KEYS:
        if key not in district:
            errors.append(f"{label}: missing required key '{key}'")

    scores = district.get("scores", {})
    if not isinstance(scores, dict):
        errors.append(f"{label}: 'scores' must be an object")
        scores = {}

    for score_key in SCORE_KEYS:
        if score_key not in scores:
            warnings.append(f"{label}: scores.{score_key} is missing")
            continue
        value = scores[score_key]
        if value is None:
            warnings.append(f"{label}: scores.{score_key} is null")
            continue
        if not isinstance(value, (int, float)):
            errors.append(f"{label}: scores.{score_key} must be numeric, got {type(value).__name__}")
            continue
        if not 0 <= float(value) <= 100:
            errors.append(f"{label}: scores.{score_key}={value} is outside 0–100")

    classification = district.get("classification", {})
    if not isinstance(classification, dict):
        errors.append(f"{label}: 'classification' must be an object")
        classification = {}

    gap_level = classification.get("gap_level")
    if gap_level not in VALID_LEVELS:
        errors.append(f"{label}: gap_level must be High, Medium, or Low (got {gap_level!r})")

    confidence_level = classification.get("confidence_level")
    if confidence_level not in VALID_LEVELS:
        errors.append(
            f"{label}: confidence_level must be High, Medium, or Low (got {confidence_level!r})"
        )

    evidence = district.get("evidence_bullets")
    if not isinstance(evidence, list):
        errors.append(f"{label}: evidence_bullets must be a list")
    elif len(evidence) == 0:
        errors.append(f"{label}: evidence_bullets must be a non-empty list")
    else:
        for bullet_index, bullet in enumerate(evidence):
            if _is_empty(bullet):
                warnings.append(f"{label}: evidence_bullets[{bullet_index}] is empty")

    drivers = district.get("top_gap_drivers")
    if not isinstance(drivers, list):
        errors.append(f"{label}: top_gap_drivers must be a list")
    elif len(drivers) == 0:
        warnings.append(f"{label}: top_gap_drivers is empty")

    for section in ("community_metrics", "amenity_counts", "supporting_context"):
        block = district.get(section)
        if not isinstance(block, dict):
            continue
        for field, value in block.items():
            if _is_empty(value):
                warnings.append(f"{label}: {section}.{field} is missing or empty")

    for field in ("confidence_reason", "recommended_intervention_category", "recommendation_priority"):
        if field in classification and _is_empty(classification.get(field)):
            warnings.append(f"{label}: classification.{field} is missing or empty")

    if _is_empty(district.get("district")):
        errors.append(f"{label}: district name is missing or empty")

    return errors, warnings


def check_processed_json(json_path: Path) -> tuple[list[str], list[str], list[dict[str, Any]]]:
    """
    Load and validate community_gap_outputs.json.

    Returns (errors, warnings, districts).
    """
    errors: list[str] = []
    warnings: list[str] = []

    if not json_path.exists():
        errors.append(f"Missing processed output: {json_path}")
        return errors, warnings, []

    try:
        payload = json.loads(json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {json_path}: {exc}")
        return errors, warnings, []

    districts = payload.get("districts")
    if not isinstance(districts, list):
        errors.append("Top-level 'districts' must be a list")
        return errors, warnings, []

    if len(districts) == 0:
        errors.append("'districts' list is empty")
        return errors, warnings, []

    print(f"  Loaded {len(districts)} district object(s) from {json_path.name}")

    for index, district in enumerate(districts):
        if not isinstance(district, dict):
            errors.append(f"District at index {index} is not an object")
            continue
        district_errors, district_warnings = _validate_district(district, index)
        errors.extend(district_errors)
        warnings.extend(district_warnings)

    return errors, warnings, districts


def _print_top_districts(districts: list[dict[str, Any]], limit: int = 5) -> None:
    """Print top districts ranked by community_gap_score."""
    ranked = sorted(
        districts,
        key=lambda item: (item.get("scores") or {}).get("community_gap_score") or 0,
        reverse=True,
    )

    print(f"\nTop {limit} districts by community_gap_score:")
    for item in ranked[:limit]:
        scores = item.get("scores") or {}
        classification = item.get("classification") or {}
        print(
            f"  {item.get('district', 'unknown')}: "
            f"score {scores.get('community_gap_score', 'n/a')}, "
            f"gap {classification.get('gap_level', 'n/a')}, "
            f"{classification.get('confidence_level', 'n/a')} confidence"
        )


def _print_sample_district(districts: list[dict[str, Any]]) -> None:
    """Print full JSON for the highest-gap district."""
    if not districts:
        return

    top = max(
        districts,
        key=lambda item: (item.get("scores") or {}).get("community_gap_score") or 0,
    )
    print(f"\nSample district object (highest gap — {top.get('district', 'unknown')}):")
    print(json.dumps(top, indent=2, ensure_ascii=False))


def main() -> int:
    json_path = OUTPUT_JSON
    print(f"Checking processed outputs at {json_path.resolve()}...\n")

    errors, warnings, districts = check_processed_json(json_path)

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  ! {warning}")

    if districts and not errors:
        _print_top_districts(districts)
        _print_sample_district(districts)

    if errors:
        print("\nFAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
