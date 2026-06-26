"""Export pipeline outputs for frontend consumption and debugging."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from pipeline.config import AMENITY_CATEGORIES, GAP_WEIGHTS, OUTPUT_DIR
from pipeline.evidence import build_city_medians, generate_evidence_bullets
from pipeline.recommendations import recommend_intervention


def _district_record(row: pd.Series, city_medians: dict[str, float]) -> dict:
    intervention = recommend_intervention(row)
    evidence = generate_evidence_bullets(row, city_medians)

    amenity_counts = {cat: int(row[cat]) for cat in AMENITY_CATEGORIES}
    amenity_per_10k = {
        cat: float(row.get(f"amenity_per_10k_{cat}", 0)) for cat in AMENITY_CATEGORIES
    }
    category_shortages = {
        cat: float(row.get(f"shortage_{cat}", 0)) for cat in AMENITY_CATEGORIES
    }

    return {
        "district": row["district"],
        "rank": int(row["intervention_rank"]),
        "area_type": row.get("area_type", ""),
        "profile": row.get("profile", ""),
        "coordinates": {
            "latitude": float(row.get("latitude", 0)),
            "longitude": float(row.get("longitude", 0)),
        },
        "scores": {
            "community_need_score": float(row["community_need_score"]),
            "amenity_adequacy_score": float(row["amenity_adequacy_score"]),
            "amenity_shortage_score": float(row["amenity_shortage_score"]),
            "market_pressure_score": float(row["market_pressure_score"]),
            "intervention_feasibility_score": float(row["intervention_feasibility_score"]),
            "community_gap_score": float(row["community_gap_score"]),
            "confidence_level": row["confidence_level"],
        },
        "community_metrics": {
            "population_estimate": int(row["population_estimate"]),
            "community_count": int(row["community_count"]),
            "occupancy_rate": round(float(row["occupancy_rate"]), 4),
            "service_demand_index": float(row["service_demand_index"]),
            "mobility_score": float(row["mobility_score"]),
            "resident_experience_score": float(row["resident_experience_score"]),
            "top_optimization_opportunity": row.get("top_optimization_opportunity", ""),
        },
        "amenity_counts": amenity_counts,
        "amenity_total": int(row["total_amenities"]),
        "amenity_per_10k": amenity_per_10k,
        "category_shortages": category_shortages,
        "supporting_context": {
            "listing_count": int(row.get("listing_count", 0)),
            "active_listing_count": int(row.get("active_listing_count", 0)),
            "listings_per_10k_residents": float(row.get("listings_per_10k_residents", 0)),
            "transaction_count": int(row.get("transaction_count", 0)),
            "transactions_per_10k_residents": float(
                row.get("transactions_per_10k_residents", 0)
            ),
            "avg_price_per_sqm_aed": round(float(row.get("avg_price_per_sqm_aed", 0)), 2),
            "vacant_parcel_count": int(row.get("vacant_parcel_count", 0)),
            "avg_development_potential": round(
                float(row.get("avg_development_potential", 0)), 2
            ),
            "infrastructure_score": float(row.get("infrastructure_score", 0)),
        },
        "recommended_intervention": intervention,
        "evidence": evidence,
        "confidence_explanation": row["confidence_explanation"],
    }


def build_frontend_payload(scored: pd.DataFrame) -> dict:
    city_medians = build_city_medians(scored)
    districts = [_district_record(row, city_medians) for _, row in scored.iterrows()]

    return {
        "project": "Community Gap & Confidence Copilot",
        "track": "Future Communities",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology_version": "1.0.0",
        "scoring_weights": GAP_WEIGHTS,
        "city_medians": city_medians,
        "district_count": len(districts),
        "districts": districts,
        "ranked_summary": [
            {
                "district": d["district"],
                "rank": d["rank"],
                "community_gap_score": d["scores"]["community_gap_score"],
                "confidence_level": d["scores"]["confidence_level"],
                "recommended_intervention": d["recommended_intervention"]["label"],
            }
            for d in districts
        ],
    }


def export_json(payload: dict, output_dir: Path | None = None) -> Path:
    out_dir = output_dir or OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "district_scores.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def export_csv_summary(scored: pd.DataFrame, output_dir: Path | None = None) -> Path:
    out_dir = output_dir or OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    summary_cols = [
        "intervention_rank",
        "district",
        "area_type",
        "profile",
        "population_estimate",
        "service_demand_index",
        "mobility_score",
        "resident_experience_score",
        "total_amenities",
        "community_need_score",
        "amenity_adequacy_score",
        "amenity_shortage_score",
        "market_pressure_score",
        "intervention_feasibility_score",
        "community_gap_score",
        "confidence_level",
        "top_optimization_opportunity",
    ]
    summary_cols += [f"shortage_{c}" for c in AMENITY_CATEGORIES]

    path = out_dir / "district_scores_summary.csv"
    scored[summary_cols].to_csv(path, index=False)
    return path
