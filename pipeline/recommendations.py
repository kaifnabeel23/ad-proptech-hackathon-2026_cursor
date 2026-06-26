"""Recommend intervention categories from amenity gaps and community signals."""

from __future__ import annotations

import pandas as pd

from pipeline.config import (
    AMENITY_CATEGORIES,
    INTERVENTION_LABELS,
    OPTIMIZATION_TO_INTERVENTION,
)

CATEGORY_TO_INTERVENTION = {
    "education": "education_capacity",
    "healthcare": "healthcare_capacity",
    "mobility": "mobility_infrastructure",
    "retail": "retail_expansion",
    "community": "community_spaces",
    "services": "essential_services",
}


def _category_weights(row: pd.Series) -> dict[str, float]:
    """Weight amenity categories using community demand signals."""
    weights = {cat: 1.0 for cat in AMENITY_CATEGORIES}

    if row["mobility_score"] < 65:
        weights["mobility"] += 0.5
    if row["service_demand_index"] >= 70:
        weights["education"] += 0.3
        weights["healthcare"] += 0.3
        weights["services"] += 0.2
    if row["resident_experience_score"] < 80:
        weights["community"] += 0.3
        weights["retail"] += 0.2

    return weights


def recommend_intervention(row: pd.Series) -> dict[str, str]:
    """Pick the highest weighted category shortage as the intervention."""
    weights = _category_weights(row)

    weighted_shortages = {
        cat: row.get(f"shortage_{cat}", 0) * weights[cat] for cat in AMENITY_CATEGORIES
    }
    top_category = max(weighted_shortages, key=weighted_shortages.get)
    intervention_key = CATEGORY_TO_INTERVENTION[top_category]

    optimization = row.get("top_optimization_opportunity", "")
    if optimization in OPTIMIZATION_TO_INTERVENTION:
        opt_key = OPTIMIZATION_TO_INTERVENTION[optimization]
        opt_shortage = weighted_shortages.get(
            next(k for k, v in CATEGORY_TO_INTERVENTION.items() if v == opt_key),
            0,
        )
        top_shortage = weighted_shortages[top_category]
        # Use community optimization hint when it is within 15% of the top gap.
        if opt_shortage >= top_shortage * 0.85:
            intervention_key = opt_key
            top_category = next(
                k for k, v in CATEGORY_TO_INTERVENTION.items() if v == opt_key
            )

    label = INTERVENTION_LABELS[intervention_key]
    rationale = (
        f"{top_category.title()} shows the largest population-adjusted shortage "
        f"(weighted gap {weighted_shortages[top_category]:.1f}) given current "
        f"service demand ({row['service_demand_index']:.1f}) and mobility "
        f"({row['mobility_score']:.1f})."
    )

    return {
        "category": intervention_key,
        "primary_amenity_category": top_category,
        "label": label,
        "rationale": rationale,
    }
