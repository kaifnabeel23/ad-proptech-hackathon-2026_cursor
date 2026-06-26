#!/usr/bin/env python3
"""
Find demo districts for the hackathon video and write docs/demo_districts.md.

Run from repo root::

    python scripts/find_demo_districts.py

Requires processed/community_gap_outputs.json from build_community_gap_data.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from community_gap import DOCS_DIR, OUTPUT_JSON  # noqa: E402

DEMO_DOC = DOCS_DIR / "demo_districts.md"

MIN_EVIDENCE_BULLETS = 4
TOP_EVIDENCE_COUNT = 4

GAP_LEVEL_RANK = {"High": 3, "Medium": 2, "Low": 1}


def _has_mixed_signals(district: dict[str, Any]) -> bool:
    """True when drivers or bullets indicate mixed evidence."""
    drivers = district.get("top_gap_drivers") or []
    if "Mixed evidence" in drivers:
        return True
    return any("mixed" in bullet.lower() for bullet in district.get("evidence_bullets") or [])


def _gap_sort_key(district: dict[str, Any]) -> tuple[int, int]:
    classification = district.get("classification") or {}
    scores = district.get("scores") or {}
    gap_level = classification.get("gap_level", "Low")
    gap_score = scores.get("community_gap_score") or 0
    return (GAP_LEVEL_RANK.get(gap_level, 0), int(gap_score))


def select_high_urgency_demo(districts: list[dict[str, Any]]) -> dict[str, Any] | None:
    """
    Best high-urgency walkthrough district.

    High gap, High or Medium confidence, at least 4 evidence bullets.
    """
    candidates = [
        d
        for d in districts
        if (d.get("classification") or {}).get("confidence_level") in ("High", "Medium")
        and len(d.get("evidence_bullets") or []) >= MIN_EVIDENCE_BULLETS
    ]
    if not candidates:
        return None

    high_gap = [d for d in candidates if (d.get("classification") or {}).get("gap_level") == "High"]
    pool = high_gap if high_gap else candidates
    return max(pool, key=_gap_sort_key)


def select_mixed_evidence_demo(
    districts: list[dict[str, Any]],
    exclude: set[str] | None = None,
) -> dict[str, Any] | None:
    """
    Best mixed-evidence contrast district.

    Medium gap or Medium confidence; prefers explicit mixed signals.
    """
    exclude = exclude or set()

    def mixed_rank(district: dict[str, Any]) -> tuple[int, int, int]:
        classification = district.get("classification") or {}
        gap_level = classification.get("gap_level", "")
        confidence = classification.get("confidence_level", "")
        score = 0
        if gap_level == "Medium":
            score += 2
        if confidence == "Medium":
            score += 2
        if _has_mixed_signals(district):
            score += 5
        return (score, *_gap_sort_key(district))

    candidates = [
        d
        for d in districts
        if d.get("district") not in exclude
        and (
            (d.get("classification") or {}).get("gap_level") == "Medium"
            or (d.get("classification") or {}).get("confidence_level") == "Medium"
        )
    ]
    if not candidates:
        return None

    return max(candidates, key=mixed_rank)


def select_low_urgency_demo(
    districts: list[dict[str, Any]],
    exclude: set[str] | None = None,
) -> dict[str, Any] | None:
    """Best low-urgency reference district (Low gap, any confidence)."""
    exclude = exclude or set()
    candidates = [
        d
        for d in districts
        if d.get("district") not in exclude
        and (d.get("classification") or {}).get("gap_level") == "Low"
    ]
    if not candidates:
        return None

    return min(candidates, key=lambda d: (d.get("scores") or {}).get("community_gap_score") or 0)


def find_demo_districts_from_payload(payload: dict[str, Any]) -> dict[str, dict[str, Any] | None]:
    """Return the three demo district selections."""
    districts = payload.get("districts") or []
    high = select_high_urgency_demo(districts)
    exclude = {high["district"]} if high else set()
    mixed = select_mixed_evidence_demo(districts, exclude=exclude)
    if mixed:
        exclude.add(mixed["district"])
    low = select_low_urgency_demo(districts, exclude=exclude)
    return {
        "high_urgency": high,
        "mixed_evidence": mixed,
        "low_urgency": low,
    }


def _demo_why_useful(slot: str, district: dict[str, Any]) -> str:
    """Return a short demo narrative for each slot."""
    classification = district.get("classification") or {}
    scores = district.get("scores") or {}
    name = district.get("district", "District")
    gap = scores.get("community_gap_score", "n/a")
    confidence = classification.get("confidence_level", "n/a")
    intervention = classification.get("recommended_intervention_category", "n/a")

    if slot == "high_urgency":
        return (
            f"Use {name} as the main walkthrough: gap score {gap} with {confidence} confidence, "
            f"clear OSM-backed evidence, and a concrete recommendation ({intervention}). "
            f"Shows the full need → shortage → evidence → confidence story."
        )
    if slot == "mixed_evidence":
        return (
            f"Use {name} to demonstrate honest uncertainty: gap score {gap} with {confidence} "
            f"confidence and mixed amenity signals. Explains why the confidence badge matters "
            f"and when decision-makers should validate before acting."
        )
    return (
        f"Use {name} as the balanced reference: low gap score {gap} ({confidence} confidence). "
        f"Shows the copilot does not over-flag every district and when to monitor rather than intervene."
    )


def _format_district_section(
    title: str,
    district: dict[str, Any] | None,
    slot: str,
) -> str:
    """Format one demo district block for markdown."""
    if district is None:
        return f"## {title}\n\n_No district matched the selection criteria._\n"

    classification = district.get("classification") or {}
    scores = district.get("scores") or {}
    bullets = district.get("evidence_bullets") or []
    top_bullets = bullets[:TOP_EVIDENCE_COUNT]

    lines = [
        f"## {title}",
        "",
        f"**District:** {district.get('district', 'unknown')}",
        f"**Gap score:** {scores.get('community_gap_score', 'n/a')}",
        f"**Gap level:** {classification.get('gap_level', 'n/a')}",
        f"**Confidence level:** {classification.get('confidence_level', 'n/a')}",
        f"**Recommended intervention:** {classification.get('recommended_intervention_category', 'n/a')}",
        "",
        "**Top evidence bullets:**",
    ]
    for bullet in top_bullets:
        lines.append(f"- {bullet}")
    lines.extend(
        [
            "",
            "**Why it is useful in the demo:**",
            f"{_demo_why_useful(slot, district)}",
            "",
        ]
    )
    return "\n".join(lines)


def write_demo_doc(selections: dict[str, dict[str, Any] | None], path: Path = DEMO_DOC) -> Path:
    """Write docs/demo_districts.md with chosen demo districts."""
    generated = (
        f"**Generated:** run `python scripts/find_demo_districts.py` to refresh.\n"
        f"**Source:** `processed/community_gap_outputs.json`\n"
    )

    content = "\n".join(
        [
            "# Demo Districts",
            "",
            generated,
            "Recommended districts for the 2–3 minute hackathon demo video.",
            "",
            "---",
            "",
            _format_district_section(
                "1. High urgency (main walkthrough)",
                selections.get("high_urgency"),
                "high_urgency",
            ),
            _format_district_section(
                "2. Mixed evidence (confidence / uncertainty)",
                selections.get("mixed_evidence"),
                "mixed_evidence",
            ),
            _format_district_section(
                "3. Low urgency (monitor / balanced reference)",
                selections.get("low_urgency"),
                "low_urgency",
            ),
            "---",
            "",
            "## Regenerate",
            "",
            "```bash",
            "python scripts/build_community_gap_data.py",
            "python scripts/find_demo_districts.py",
            "```",
            "",
            "## Manual override",
            "",
            "Edit this file directly if auto-selected districts are not demo-friendly.",
            "",
        ]
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def _print_selection(label: str, district: dict[str, Any] | None) -> None:
    """Print one selected district to the terminal."""
    print(f"\n{label}")
    if district is None:
        print("  (no match)")
        return

    classification = district.get("classification") or {}
    scores = district.get("scores") or {}
    print(f"  District:     {district.get('district', 'unknown')}")
    print(f"  Gap score:    {scores.get('community_gap_score', 'n/a')}")
    print(f"  Gap level:    {classification.get('gap_level', 'n/a')}")
    print(f"  Confidence:   {classification.get('confidence_level', 'n/a')}")
    print(f"  Intervention: {classification.get('recommended_intervention_category', 'n/a')}")
    print(f"  Evidence:     {len(district.get('evidence_bullets') or [])} bullets")
    if district.get("top_gap_drivers"):
        print(f"  Drivers:      {', '.join(district['top_gap_drivers'])}")


def main() -> int:
    print("Finding demo districts...")

    if not OUTPUT_JSON.exists():
        print(f"No processed output at {OUTPUT_JSON}")
        print("Run: python scripts/build_community_gap_data.py")
        return 1

    payload = json.loads(OUTPUT_JSON.read_text(encoding="utf-8"))
    districts = payload.get("districts", [])

    if not districts:
        print("Processed JSON has no districts.")
        print("Run: python scripts/build_community_gap_data.py")
        return 1

    selections = find_demo_districts_from_payload(payload)
    doc_path = write_demo_doc(selections)

    print(f"\nSelected demo districts ({len(districts)} candidates):")
    _print_selection("1. High urgency", selections.get("high_urgency"))
    _print_selection("2. Mixed evidence", selections.get("mixed_evidence"))
    _print_selection("3. Low urgency", selections.get("low_urgency"))

    print(f"\nWrote {doc_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
