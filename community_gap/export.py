"""
Export processed outputs for the frontend and debugging.

Stable output contract (see docs/data_handoff.md):
  - processed/community_gap_outputs.json
  - processed/community_gap_scores.csv
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from community_gap import OUTPUT_CSV, OUTPUT_JSON, PROCESSED_DIR
from community_gap.data_loader import load_challenge_data
from community_gap.evidence import add_evidence, add_recommendations
from community_gap.features import build_full_feature_dataset
from community_gap.scoring import GAP_WEIGHTS, add_confidence, add_scores

COMMUNITY_METRIC_KEYS = (
    "population_estimate",
    "occupancy_rate",
    "service_demand_index",
    "mobility_score",
    "resident_experience_score",
)

AMENITY_COUNT_KEYS = (
    "education",
    "healthcare",
    "retail",
    "services",
    "community",
    "mobility",
    "total_amenities",
    "amenity_diversity_count",
)

SUPPORTING_CONTEXT_KEYS = (
    "listing_count",
    "available_listing_count",
    "rent_listing_count",
    "sale_listing_count",
    "transaction_count",
    "parcel_count",
    "vacant_or_available_parcel_count",
)

SCORE_KEYS = (
    "community_need_score",
    "amenity_adequacy_score",
    "amenity_shortage_score",
    "market_pressure_score",
    "intervention_feasibility_score",
    "community_gap_score",
    "confidence_score",
    "data_completeness_score",
)

CLASSIFICATION_KEYS = (
    "gap_level",
    "confidence_level",
    "confidence_reason",
    "recommended_intervention_category",
    "recommendation_priority",
)


def to_json_safe(value: Any) -> Any:
    """
    Convert pandas/numpy types to JSON-serializable Python types.

    Replaces NaN with None.
    """
    if value is None:
        return None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if np.isnan(value):
            return None
        return float(value)
    if isinstance(value, np.ndarray):
        return [to_json_safe(item) for item in value.tolist()]
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, float) and np.isnan(value):
        return None
    if isinstance(value, (list, tuple)):
        return [to_json_safe(item) for item in value]
    if pd.isna(value):
        return None
    return value


def _row_value(row: pd.Series, key: str) -> Any:
    """Read one field from a row and return a JSON-safe value (or None)."""
    if key not in row.index:
        return None
    return to_json_safe(row[key])


def _row_list(row: pd.Series, key: str) -> list[Any]:
    """Read a list field from a row as a JSON-safe Python list."""
    if key not in row.index:
        return []
    value = row[key]
    if value is None or (not isinstance(value, (list, tuple, np.ndarray)) and pd.isna(value)):
        return []
    if isinstance(value, np.ndarray):
        value = value.tolist()
    if isinstance(value, tuple):
        value = list(value)
    if not isinstance(value, list):
        return [to_json_safe(value)] if value is not None else []
    return [to_json_safe(item) for item in value]


def _nested_fields(row: pd.Series, keys: tuple[str, ...]) -> dict[str, Any]:
    """Build a nested dict with a stable key set."""
    return {key: _row_value(row, key) for key in keys}


def row_to_output(row: pd.Series) -> dict[str, Any]:
    """
    Convert one scored feature row into a frontend/AI-ready JSON object.

    All keys are always present; missing values are ``None`` or ``[]``.
    """
    return {
        "district": _row_value(row, "district"),
        "area_type": _row_value(row, "area_type"),
        "profile": _row_value(row, "profile"),
        "location": {
            "latitude": _row_value(row, "latitude"),
            "longitude": _row_value(row, "longitude"),
        },
        "community_metrics": _nested_fields(row, COMMUNITY_METRIC_KEYS),
        "amenity_counts": _nested_fields(row, AMENITY_COUNT_KEYS),
        "supporting_context": _nested_fields(row, SUPPORTING_CONTEXT_KEYS),
        "scores": _nested_fields(row, SCORE_KEYS),
        "classification": _nested_fields(row, CLASSIFICATION_KEYS),
        "evidence_bullets": _row_list(row, "evidence_bullets"),
        "top_gap_drivers": _row_list(row, "top_gap_drivers"),
    }


def build_scored_dataset(data_dir: str | Path = "data") -> pd.DataFrame:
    """
    Run the full deterministic pipeline and return the scored feature table.

    Steps: load → features → scores → confidence → evidence → recommendations.
    """
    raw = load_challenge_data(data_dir)
    df = build_full_feature_dataset(raw)
    df = add_scores(df)
    df = add_confidence(df)
    df = add_evidence(df)
    df = add_recommendations(df)
    df = df.sort_values("community_gap_score", ascending=False).reset_index(drop=True)
    df["intervention_rank"] = range(1, len(df) + 1)
    return df


def _district_level_frame(scored: pd.DataFrame) -> pd.DataFrame:
    """Keep the highest community_gap_score row per district."""
    return (
        scored.sort_values("community_gap_score", ascending=False)
        .drop_duplicates(subset="district", keep="first")
        .reset_index(drop=True)
    )


def build_all_district_outputs(data_dir: str | Path = "data") -> list[dict[str, Any]]:
    """Build one frontend-ready output dict per district (highest-gap community row)."""
    scored = build_scored_dataset(data_dir)
    district_rows = _district_level_frame(scored)

    outputs = [row_to_output(row) for _, row in district_rows.iterrows()]
    outputs.sort(key=lambda item: item["scores"]["community_gap_score"] or 0, reverse=True)

    for index, item in enumerate(outputs, start=1):
        item["rank"] = index

    return outputs


def analyze_district(district_name: str, data_dir: str | Path = "data") -> dict[str, Any]:
    """
    Return the frontend-ready output for one district (case-insensitive match).

    When multiple community rows exist, uses the row with the highest gap score.
    """
    scored = build_scored_dataset(data_dir)
    needle = district_name.strip().casefold()
    matches = scored[scored["district"].astype(str).str.casefold() == needle]

    if matches.empty:
        available = sorted(scored["district"].dropna().unique().tolist())
        raise ValueError(
            f"District '{district_name}' not found. "
            f"Available districts: {', '.join(available)}"
        )

    row = matches.sort_values("community_gap_score", ascending=False).iloc[0]
    output = row_to_output(row)
    district_rank = (
        _district_level_frame(scored)["district"].tolist().index(output["district"]) + 1
    )
    output["rank"] = district_rank
    return output


def build_frontend_payload(scored: pd.DataFrame) -> dict[str, Any]:
    """
    Build the frontend-ready JSON structure.

    Shape is defined in docs/data_handoff.md — do not change without updating docs.
    """
    district_rows = _district_level_frame(scored)
    districts = [row_to_output(row) for _, row in district_rows.iterrows()]
    districts.sort(key=lambda item: item["scores"]["community_gap_score"] or 0, reverse=True)

    for index, district in enumerate(districts, start=1):
        district["rank"] = index

    ranked_summary = [
        {
            "district": item["district"],
            "rank": item["rank"],
            "community_gap_score": item["scores"]["community_gap_score"],
            "confidence_level": item["classification"]["confidence_level"],
            "recommended_intervention": item["classification"]["recommended_intervention_category"],
        }
        for item in districts
    ]

    return {
        "project": "Community Gap & Confidence Copilot",
        "track": "Future Communities",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology_version": "1.0.0",
        "scoring_weights": GAP_WEIGHTS,
        "district_count": len(districts),
        "districts": districts,
        "ranked_summary": ranked_summary,
    }


def export_json(payload: dict[str, Any], path: Path | None = None) -> Path:
    """Write community_gap_outputs.json."""
    out_path = path or OUTPUT_JSON
    out_path.parent.mkdir(parents=True, exist_ok=True)
    safe_payload = json.loads(json.dumps(payload, default=to_json_safe))
    out_path.write_text(json.dumps(safe_payload, indent=2), encoding="utf-8")
    return out_path


def export_csv_summary(scored: pd.DataFrame, path: Path | None = None) -> Path:
    """Write a flat community_gap_scores.csv for debugging and judge review."""
    out_path = path or OUTPUT_CSV
    out_path.parent.mkdir(parents=True, exist_ok=True)

    summary_cols = [
        "district",
        "area_type",
        "profile",
        "population_estimate",
        "service_demand_index",
        "mobility_score",
        "resident_experience_score",
        "total_amenities",
        *SCORE_KEYS,
        "gap_level",
        "confidence_level",
        "recommended_intervention_category",
        "recommendation_priority",
        "intervention_rank",
    ]
    available = [col for col in summary_cols if col in scored.columns]
    scored[available].to_csv(out_path, index=False)
    return out_path


def export_all(scored: pd.DataFrame, output_dir: Path | None = None) -> tuple[Path, Path]:
    """
    Export JSON + CSV to processed/.

    Returns (json_path, csv_path).
    """
    out_dir = output_dir or PROCESSED_DIR
    payload = build_frontend_payload(scored)
    json_path = export_json(payload, out_dir / OUTPUT_JSON.name)
    csv_path = export_csv_summary(scored, out_dir / OUTPUT_CSV.name)
    return json_path, csv_path


def export_outputs(
    data_dir: str | Path = "data",
    output_json: str | Path = "processed/community_gap_outputs.json",
    output_csv: str | Path = "processed/community_gap_scores.csv",
) -> None:
    """
    Build, export, and print a summary of community gap outputs.

    Writes pretty JSON and a flat district-level CSV.
    """
    scored = build_scored_dataset(data_dir)
    district_rows = _district_level_frame(scored)

    json_path = Path(output_json)
    csv_path = Path(output_csv)

    payload = build_frontend_payload(scored)
    export_json(payload, json_path)
    export_csv_summary(district_rows, csv_path)

    district_count = len(district_rows)
    print(f"Districts exported: {district_count}")
    print("\nTop 5 highest-gap districts:")
    top5 = district_rows.nlargest(5, "community_gap_score")
    for _, row in top5.iterrows():
        print(
            f"  {row['district']}: gap {int(row['community_gap_score'])} "
            f"({row.get('gap_level', 'n/a')}, {row.get('confidence_level', 'n/a')} confidence)"
        )
    print(f"\nJSON: {json_path.resolve()}")
    print(f"CSV:  {csv_path.resolve()}")


def build_metadata_stub() -> dict[str, Any]:
    """Return a minimal payload stub for testing export plumbing."""
    return {
        "project": "Community Gap & Confidence Copilot",
        "track": "Future Communities",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology_version": "0.1.0",
        "scoring_weights": GAP_WEIGHTS,
        "status": "placeholder — run build script after implementing scoring",
        "districts": [],
        "ranked_summary": [],
    }
