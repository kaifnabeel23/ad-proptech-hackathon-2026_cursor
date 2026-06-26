"""Deterministic fallback recommendation — no OpenRouter, no invented facts."""

from __future__ import annotations

from typing import Any

MIXED_EVIDENCE_MARKERS = (
    "mixed",
    "disagree",
    "cautiously",
    "do not fully align",
)


def _has_mixed_evidence(evidence_bullets: list[str], top_gap_drivers: list[str]) -> bool:
    combined = " ".join([*evidence_bullets, *top_gap_drivers]).lower()
    return any(marker in combined for marker in MIXED_EVIDENCE_MARKERS)


def _is_top_priority(district: dict[str, Any]) -> bool:
    classification = district["classification"]
    return district["district"] == "Al Ghadeer" or (
        district.get("rank") == 1 and classification.get("gap_level") == "Medium"
    )


def _build_district_summary(district: dict[str, Any]) -> str:
    name = district["district"]
    gap_level = district["classification"]["gap_level"]
    gap_score = district["scores"]["community_gap_score"]

    if _is_top_priority(district):
        return (
            f"{name} is the top priority in the current dataset with a {gap_level} community gap "
            f"(community gap score {gap_score}/100). Summary based on pre-processed pipeline data."
        )

    return (
        f"{name} has a {gap_level} community gap (community gap score {gap_score}/100). "
        f"Summary based on pre-processed pipeline data."
    )


def _build_main_gap(district: dict[str, Any]) -> str:
    top_gap_drivers: list[str] = district.get("top_gap_drivers", [])
    classification = district["classification"]
    name = district["district"]

    if not top_gap_drivers:
        return f"No dominant gap driver was flagged by the pipeline for {name}."

    drivers = ", ".join(top_gap_drivers[:3])
    return f"The main gap drivers are: {drivers}. Pipeline gap level: {classification['gap_level']}."


def _build_why_this_matters(evidence_bullets: list[str]) -> str:
    if not evidence_bullets:
        return "The pipeline did not attach evidence bullets for this district."
    return " ".join(evidence_bullets[:3])


def _build_confidence_note(district: dict[str, Any]) -> str:
    classification = district["classification"]
    level = classification["confidence_level"]
    reason = classification["confidence_reason"]

    if level == "High":
        return f"High confidence — multiple pipeline signals agree. {reason}"

    return f"{level} confidence — treat this recommendation with caution. {reason}"


def _build_uncertainty_note(district: dict[str, Any]) -> str:
    classification = district["classification"]
    evidence_bullets: list[str] = district.get("evidence_bullets", [])
    top_gap_drivers: list[str] = district.get("top_gap_drivers", [])
    notes: list[str] = []

    if classification["confidence_level"] in ("Medium", "Low"):
        notes.append(
            f"Pipeline confidence is {classification['confidence_level']}; validate before acting."
        )

    if _has_mixed_evidence(evidence_bullets, top_gap_drivers):
        notes.append("Evidence signals are mixed — core indicators do not fully agree.")

    if classification["confidence_level"] == "High" and not notes:
        notes.append("Multiple pipeline signals agree on the gap story.")

    notes.append("Based on pre-processed static data, not a live feed.")
    return " ".join(notes)


def fallback_recommendation(district_object: dict[str, Any]) -> dict[str, str]:
    """
    Deterministic recommendation — no OpenRouter.
    Uses only allowed pipeline fields from the district object.
    """
    classification = district_object["classification"]
    evidence_bullets: list[str] = district_object.get("evidence_bullets", [])

    return {
        "district_summary": _build_district_summary(district_object),
        "main_gap": _build_main_gap(district_object),
        "recommended_intervention": classification["recommended_intervention_category"],
        "why_this_matters": _build_why_this_matters(evidence_bullets),
        "confidence_note": _build_confidence_note(district_object),
        "uncertainty_note": _build_uncertainty_note(district_object),
    }


# Backward-compatible alias
build_fallback_recommendation = fallback_recommendation
