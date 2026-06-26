"""Exact prompt template for the AI recommendation layer."""

from __future__ import annotations

import json
import re
from typing import Any

DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini"

SYSTEM_PROMPT = """You are an Abu Dhabi community planning copilot.

You help planners, developers, and community operators understand district-level community gaps.

Use only the structured district evidence provided.
Do not invent data.
Do not calculate new scores.
Do not change confidence levels.
Do not claim live data.
If evidence is mixed, say so clearly.
Keep the response concise, practical, and suitable for a 2-minute hackathon demo.

Return valid JSON only."""

JSON_OUTPUT_SCHEMA = """{
  "district_summary": string,
  "main_gap": string,
  "recommended_intervention": string,
  "why_this_matters": string,
  "confidence_note": string,
  "uncertainty_note": string
}"""

SPECIAL_WORDING_RULE = (
    'If the district is Al Ghadeer, or if it is the highest-scoring district but '
    'gap_level is Medium, call it "top priority in the current dataset," not "High gap."'
)

REQUIRED_KEYS = (
    "district_summary",
    "main_gap",
    "recommended_intervention",
    "why_this_matters",
    "confidence_note",
    "uncertainty_note",
)

MIXED_EVIDENCE_MARKERS = (
    "mixed",
    "disagree",
    "cautiously",
    "do not fully align",
)


def build_user_prompt_evidence(district: dict[str, Any]) -> dict[str, Any]:
    return {
        "district": district["district"],
        "community_metrics": district["community_metrics"],
        "amenity_counts": district["amenity_counts"],
        "supporting_context": district.get("supporting_context"),
        "scores": district["scores"],
        "classification": district["classification"],
        "evidence_bullets": district.get("evidence_bullets", []),
        "top_gap_drivers": district.get("top_gap_drivers", []),
    }


def _is_top_priority_wording(district: dict[str, Any]) -> bool:
    classification = district["classification"]
    return district["district"] == "Al Ghadeer" or (
        district.get("rank") == 1 and classification.get("gap_level") == "Medium"
    )


def build_user_prompt(district: dict[str, Any]) -> str:
    evidence = build_user_prompt_evidence(district)
    classification = evidence["classification"]
    top_priority_hint = (
        'This district qualifies for the special wording rule — use "top priority in the current dataset," not "High gap."'
        if _is_top_priority_wording(district)
        else SPECIAL_WORDING_RULE
    )

    return (
        "Write a short, polished, planner-friendly recommendation for the district below.\n\n"
        "Use only the structured evidence provided. Do not invent data, calculate new scores, "
        "change confidence levels, or claim live data.\n\n"
        f"District evidence (JSON):\n{json.dumps(evidence, indent=2)}\n\n"
        f"Special wording rule:\n{top_priority_hint}\n\n"
        "Output requirements:\n"
        "- Return valid JSON only — no markdown fences.\n"
        f'- recommended_intervention must exactly match classification.recommended_intervention_category: "{classification["recommended_intervention_category"]}"\n'
        f"- confidence_note must reflect classification.confidence_level ({classification['confidence_level']}) and confidence_reason without changing the level.\n"
        f"- district_summary must reflect classification.gap_level ({classification['gap_level']}) without changing it.\n"
        "- main_gap should draw from top_gap_drivers and evidence_bullets.\n"
        "- why_this_matters should synthesize evidence_bullets in readable prose.\n"
        "- uncertainty_note should flag mixed evidence, Medium/Low confidence, or incomplete data when applicable.\n"
        "- Keep each field concise and suitable for a 2-minute hackathon demo.\n\n"
        f"Required JSON output shape:\n{JSON_OUTPUT_SCHEMA}"
    )


def to_evidence_payload(district: dict[str, Any]) -> dict[str, Any]:
    """Backward-compatible alias used by recommendation.py."""
    return build_user_prompt_evidence(district)


def parse_recommendation_json(raw: str) -> dict[str, str]:
    trimmed = raw.strip()
    if trimmed.startswith("```"):
        trimmed = re.sub(r"^```(?:json)?\s*", "", trimmed, flags=re.IGNORECASE)
        trimmed = re.sub(r"\s*```$", "", trimmed)

    try:
        parsed = json.loads(trimmed)
    except json.JSONDecodeError as exc:
        raise ValueError("LLM response is not valid JSON") from exc

    for key in REQUIRED_KEYS:
        if not isinstance(parsed.get(key), str) or not parsed[key].strip():
            raise ValueError(f"LLM response missing or invalid field: {key}")

    return {key: parsed[key].strip() for key in REQUIRED_KEYS}


def _has_mixed_evidence(evidence_bullets: list[str], top_gap_drivers: list[str]) -> bool:
    combined = " ".join([*evidence_bullets, *top_gap_drivers]).lower()
    return any(marker in combined for marker in MIXED_EVIDENCE_MARKERS)


def validate_and_enforce_output(
    recommendation: dict[str, str], district: dict[str, Any]
) -> dict[str, str]:
    enforced = dict(recommendation)
    classification = district["classification"]
    scores = district["scores"]
    evidence_bullets: list[str] = district.get("evidence_bullets", [])
    top_gap_drivers: list[str] = district.get("top_gap_drivers", [])

    if enforced["recommended_intervention"] != classification["recommended_intervention_category"]:
        enforced["recommended_intervention"] = classification["recommended_intervention_category"]

    level = classification["confidence_level"]
    if level.lower() not in enforced["confidence_note"].lower():
        enforced["confidence_note"] = f"{level} confidence. {classification['confidence_reason']}"

    gap_level = classification["gap_level"]
    if gap_level.lower() not in enforced["district_summary"].lower():
        enforced["district_summary"] = f"{enforced['district_summary']} Gap level: {gap_level}."

    if _is_top_priority_wording(district):
        enforced["district_summary"] = re.sub(
            r"\bhigh gap\b",
            "top priority in the current dataset",
            enforced["district_summary"],
            flags=re.IGNORECASE,
        )
        if "top priority in the current dataset" not in enforced["district_summary"].lower():
            enforced["district_summary"] = (
                f"{district['district']} is the top priority in the current dataset "
                f"(gap level {gap_level}, community gap score {scores['community_gap_score']}/100). "
                f"{enforced['district_summary']}"
            )

    if gap_level != "High":
        enforced["district_summary"] = re.sub(
            r"\bhigh gap\b",
            f"{gap_level.lower()} gap",
            enforced["district_summary"],
            flags=re.IGNORECASE,
        )

    uncertainty_lower = enforced["uncertainty_note"].lower()
    if classification["confidence_level"] in ("Medium", "Low") and not any(
        w in uncertainty_lower for w in ("caution", "uncertain", "mixed")
    ):
        enforced["uncertainty_note"] = (
            f"Pipeline confidence is {classification['confidence_level']}. {enforced['uncertainty_note']}"
        )

    if _has_mixed_evidence(evidence_bullets, top_gap_drivers) and "mixed" not in uncertainty_lower:
        enforced["uncertainty_note"] = f"Evidence signals are mixed. {enforced['uncertainty_note']}"

    if scores.get("data_completeness_score", 100) < 80 and "completeness" not in uncertainty_lower:
        enforced["uncertainty_note"] += f" Data completeness is {scores['data_completeness_score']}/100."

    if "pre-processed" not in enforced["uncertainty_note"].lower() and "static" not in enforced["uncertainty_note"].lower():
        enforced["uncertainty_note"] += " Based on pre-processed pipeline data, not live feeds."

    for key in REQUIRED_KEYS:
        if not enforced[key].strip():
            raise ValueError(f"Validation failed after enforcement: {key}")

    return enforced
