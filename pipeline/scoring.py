"""Deterministic scoring functions for district gap analysis."""

from __future__ import annotations

import numpy as np
import pandas as pd

from pipeline.config import (
    AMENITY_CATEGORIES,
    COMMUNITY_NEED_WEIGHTS,
    GAP_WEIGHTS,
    MIN_AMENITY_OBSERVATIONS,
    MIN_TOTAL_AMENITIES_HIGH_CONFIDENCE,
)


def _percentile_score(series: pd.Series) -> pd.Series:
    """Map values to 0-100 using percentile rank across districts."""
    if len(series) <= 1:
        return pd.Series([50.0] * len(series), index=series.index)
    return (series.rank(pct=True) * 100).round(2)


def _ratio_to_score(ratio: float) -> float:
    """Convert district/median ratio into a 0-100 adequacy score."""
    if ratio <= 0:
        return 0.0
    return round(min(100.0, ratio * 100), 2)


def compute_community_need_score(df: pd.DataFrame) -> pd.Series:
    """Higher score = greater community need / pressure for services."""
    population_pressure = _percentile_score(df["population_estimate"])
    occupancy_pressure = (df["occupancy_rate"] * 100).round(2)
    mobility_deficit = (100 - df["mobility_score"]).round(2)
    experience_deficit = (100 - df["resident_experience_score"]).round(2)

    score = (
        COMMUNITY_NEED_WEIGHTS["service_demand_index"] * df["service_demand_index"]
        + COMMUNITY_NEED_WEIGHTS["mobility_deficit"] * mobility_deficit
        + COMMUNITY_NEED_WEIGHTS["experience_deficit"] * experience_deficit
        + COMMUNITY_NEED_WEIGHTS["population_pressure"] * population_pressure
        + COMMUNITY_NEED_WEIGHTS["occupancy_pressure"] * occupancy_pressure
    )
    return score.round(2)


def _amenities_per_10k(df: pd.DataFrame) -> pd.DataFrame:
    population = df["population_estimate"].clip(lower=1)
    per_10k = df[AMENITY_CATEGORIES].div(population, axis=0).mul(10_000)
    return per_10k.round(4)


def compute_amenity_scores(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Returns per-category adequacy, per-10k rates, overall adequacy, and shortage.
    """
    per_10k = _amenities_per_10k(df)
    city_medians = per_10k.median()

    adequacy_cols: dict[str, pd.Series] = {}
    for category in AMENITY_CATEGORIES:
        median = city_medians[category]
        if median <= 0:
            adequacy_cols[category] = pd.Series(50.0, index=df.index)
        else:
            adequacy_cols[category] = per_10k[category].apply(
                lambda v, m=median: _ratio_to_score(v / m)
            )

    adequacy_by_category = pd.DataFrame(adequacy_cols)
    amenity_adequacy_score = adequacy_by_category.mean(axis=1).round(2)
    amenity_shortage_score = (100 - amenity_adequacy_score).round(2)

    return adequacy_by_category, per_10k, amenity_adequacy_score, amenity_shortage_score


def compute_market_pressure_score(df: pd.DataFrame) -> pd.Series:
    """Supporting signal from listings and transactions — capped influence."""
    listing_density = _percentile_score(df["listings_per_10k_residents"])
    transaction_density = _percentile_score(df["transactions_per_10k_residents"])
    price_pressure = _percentile_score(df["avg_price_per_sqm_aed"].fillna(0))

    score = (
        0.45 * listing_density
        + 0.35 * transaction_density
        + 0.20 * price_pressure
    )
    return score.round(2)


def compute_intervention_feasibility_score(df: pd.DataFrame) -> pd.Series:
    """Supporting signal from parcel availability and district infrastructure."""
    vacant_signal = _percentile_score(df["vacant_parcel_count"])
    dev_potential = df["avg_development_potential"].fillna(0).clip(0, 100)
    community_land = _percentile_score(df["community_parcel_count"])
    infrastructure = df["infrastructure_score"].fillna(0)

    score = (
        0.35 * vacant_signal
        + 0.30 * dev_potential
        + 0.15 * community_land
        + 0.20 * infrastructure
    )
    return score.round(2)


def compute_community_gap_score(
    community_need: pd.Series,
    amenity_shortage: pd.Series,
    market_pressure: pd.Series,
    feasibility: pd.Series,
) -> pd.Series:
    """Primary intervention priority score — need + shortage dominate."""
    score = (
        GAP_WEIGHTS["community_need"] * community_need
        + GAP_WEIGHTS["amenity_shortage"] * amenity_shortage
        + GAP_WEIGHTS["market_pressure"] * market_pressure
        + GAP_WEIGHTS["intervention_feasibility"] * feasibility
    )
    return score.round(2)


def compute_category_shortages(adequacy_by_category: pd.DataFrame) -> pd.DataFrame:
    return (100 - adequacy_by_category).round(2)


def compute_confidence_level(
    df: pd.DataFrame,
    adequacy_by_category: pd.DataFrame,
    category_shortages: pd.DataFrame,
) -> tuple[pd.Series, pd.Series]:
    """
    Evidence confidence — not model certainty.
    Returns confidence labels and short explanations.
    """
    labels: list[str] = []
    explanations: list[str] = []

    city_medians = {
        "service_demand_index": df["service_demand_index"].median(),
        "mobility_score": df["mobility_score"].median(),
        "resident_experience_score": df["resident_experience_score"].median(),
    }

    for idx, row in df.iterrows():
        total_amenities = int(row.get("total_amenities", 0))
        need_high = row["community_need_score"] >= 60
        shortage_high = row["amenity_shortage_score"] >= 55

        weak_categories = [
            cat
            for cat in AMENITY_CATEGORIES
            if category_shortages.loc[idx, cat] >= 40
            and row[cat] >= MIN_AMENITY_OBSERVATIONS
        ]

        demand_signal = row["service_demand_index"] >= city_medians["service_demand_index"]
        mobility_signal = row["mobility_score"] < city_medians["mobility_score"]
        experience_signal = (
            row["resident_experience_score"] < city_medians["resident_experience_score"]
        )
        aligned_signals = sum([demand_signal, mobility_signal, experience_signal, shortage_high])

        if (
            need_high
            and shortage_high
            and len(weak_categories) >= 2
            and total_amenities >= MIN_TOTAL_AMENITIES_HIGH_CONFIDENCE
            and aligned_signals >= 3
        ):
            labels.append("high")
            explanations.append(
                "High confidence: elevated community need, clear amenity shortage, and "
                f"multiple aligned signals ({', '.join(weak_categories[:3])})."
            )
        elif (
            (need_high or shortage_high)
            and len(weak_categories) >= 1
            and total_amenities >= MIN_AMENITY_OBSERVATIONS
            and aligned_signals >= 2
        ):
            labels.append("medium")
            explanations.append(
                "Medium confidence: need and amenity signals partially align; "
                "some categories show gaps while others are mixed."
            )
        else:
            labels.append("low")
            explanations.append(
                "Low confidence: limited or mixed evidence — rely on additional "
                "field validation before major intervention decisions."
            )

    return pd.Series(labels, index=df.index), pd.Series(explanations, index=df.index)


def apply_all_scores(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Add all score columns to the district dataframe."""
    scored = df.copy()

    scored["community_need_score"] = compute_community_need_score(scored)
    adequacy_by_category, per_10k, adequacy, shortage = compute_amenity_scores(scored)
    scored["amenity_adequacy_score"] = adequacy
    scored["amenity_shortage_score"] = shortage
    scored["market_pressure_score"] = compute_market_pressure_score(scored)
    scored["intervention_feasibility_score"] = compute_intervention_feasibility_score(
        scored
    )
    scored["community_gap_score"] = compute_community_gap_score(
        scored["community_need_score"],
        scored["amenity_shortage_score"],
        scored["market_pressure_score"],
        scored["intervention_feasibility_score"],
    )

    category_shortages = compute_category_shortages(adequacy_by_category)

    confidence, confidence_explanation = compute_confidence_level(
        scored, adequacy_by_category, category_shortages
    )
    scored["confidence_level"] = confidence
    scored["confidence_explanation"] = confidence_explanation

    for category in AMENITY_CATEGORIES:
        scored[f"amenity_per_10k_{category}"] = per_10k[category]
        scored[f"adequacy_{category}"] = adequacy_by_category[category]
        scored[f"shortage_{category}"] = category_shortages[category]

    scored = scored.sort_values("community_gap_score", ascending=False).reset_index(drop=True)
    scored["intervention_rank"] = range(1, len(scored) + 1)

    return scored, adequacy_by_category, category_shortages
