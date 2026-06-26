"""
Deterministic scoring — all district scores and gap levels.

The LLM must never invent these values. Every score must be traceable
to community metrics and OSM amenity counts.

Core score logic:
  community_gap_score = demand vs amenity supply (need + shortage dominate).

Supporting context (not mixed into need):
  - listings / transactions → market_pressure_score only (10% of gap)
  - parcels / infrastructure → intervention_feasibility_score (shown separately)
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# community_gap_score weights — need + shortage are core; market is supporting only.
GAP_WEIGHTS = {
    "community_need": 0.55,
    "amenity_shortage": 0.35,
    "market_pressure": 0.10,
}

COMMUNITY_NEED_WEIGHTS = {
    "service_demand_index": 0.40,
    "inverse_mobility": 0.20,
    "inverse_experience": 0.20,
    "population_percentile": 0.10,
    "occupancy_normalized": 0.10,
}

AMENITY_ADEQUACY_WEIGHTS = {
    "education": 0.22,
    "healthcare": 0.22,
    "mobility": 0.20,
    "community": 0.16,
    "retail": 0.10,
    "services": 0.10,
}

AMENITY_TO_CITY_MEDIAN = {
    "education": "city_median_education",
    "healthcare": "city_median_healthcare",
    "mobility": "city_median_mobility_amenities",
    "community": "city_median_community",
    "retail": "city_median_retail",
    "services": "city_median_services",
}

MARKET_PRESSURE_WEIGHTS = {
    "listing_count": 0.40,
    "available_listing_count": 0.20,
    "transaction_count": 0.25,
    "active_listing_share": 0.15,
}

MARKET_PRESSURE_COLUMNS = tuple(MARKET_PRESSURE_WEIGHTS.keys())

FEASIBILITY_WEIGHTS_WITH_PARCELS = {
    "infrastructure_score": 0.40,
    "vacant_or_available_parcel_count": 0.30,
    "avg_potential_score": 0.30,
}

SCORE_COLUMNS = [
    "community_need_score",
    "amenity_adequacy_score",
    "amenity_shortage_score",
    "market_pressure_score",
    "intervention_feasibility_score",
    "community_gap_score",
]

SIGNAL_COLUMNS = [
    "signal_high_service_demand",
    "signal_weak_mobility",
    "signal_weak_resident_experience",
    "signal_low_education",
    "signal_low_healthcare",
    "signal_low_mobility_amenities",
    "signal_high_market_pressure",
    "signal_need_and_shortage_agree",
]

CORE_COMPLETENESS_FIELDS = [
    "population_estimate",
    "occupancy_rate",
    "service_demand_index",
    "mobility_score",
    "resident_experience_score",
    "education",
    "healthcare",
    "mobility",
    "total_amenities",
]

CONFIDENCE_SIGNAL_LABELS = {
    "signal_high_service_demand": "elevated service demand",
    "signal_weak_mobility": "below-median mobility",
    "signal_weak_resident_experience": "below-median resident experience",
    "signal_low_education": "education amenity shortage",
    "signal_low_healthcare": "healthcare amenity shortage",
    "signal_low_mobility_amenities": "mobility amenity shortage",
    "signal_high_market_pressure": "elevated market pressure",
    "signal_need_and_shortage_agree": "aligned need and amenity shortage",
}

SIGNAL_COUNT = len(SIGNAL_COLUMNS)
COMPLETENESS_CAP_THRESHOLD = 80


def normalize_series(series: pd.Series, higher_is_better: bool = True) -> pd.Series:
    """
    Normalize a numeric series to a 0–100 scale using percentile rank.

    Parameters
    ----------
    series:
        Raw values to normalize.
    higher_is_better:
        When ``False``, lower raw values receive higher normalized scores.

    Notes
    -----
    - Constant series return 50 (neutral) for non-null rows.
    - Missing values are filled with 0 so downstream weighted sums stay safe.
    """
    if series.empty:
        return pd.Series(dtype=float)

    non_null = series.dropna()
    if non_null.empty:
        return pd.Series(0.0, index=series.index)

    if non_null.nunique() == 1:
        result = pd.Series(50.0, index=series.index)
        return result.where(series.notna(), 0.0)

    ranked = series.rank(pct=True, ascending=higher_is_better, na_option="keep")
    normalized = ranked * 100
    return normalized.fillna(0.0)


def _category_adequacy(count: pd.Series, median: pd.Series) -> pd.Series:
    """
    Compare district amenity count to city median.

    score = min(count / median, 1.5) / 1.5 * 100
    When median is 0: 100 if count > 0 else 0.
    """
    c = count.fillna(0).astype(float)
    m = median.fillna(0).astype(float)

    ratio = np.where(
        m > 0,
        np.minimum(c / m, 1.5),
        np.where(c > 0, 1.5, 0.0),
    )
    return pd.Series(ratio / 1.5 * 100, index=count.index)


def _round_score(series: pd.Series) -> pd.Series:
    """Round score series to whole numbers."""
    return series.round(0).astype(int)


def _compute_community_need_score(df: pd.DataFrame) -> pd.Series:
    """
    High need = high demand, weak mobility, weak experience, high population, high occupancy.

    Uses raw 0–100 indices where available; occupancy is percentile-normalized.
    """
    service_demand = df["service_demand_index"].fillna(0)
    inverse_mobility = 100 - df["mobility_score"].fillna(0)
    inverse_experience = 100 - df["resident_experience_score"].fillna(0)
    population_pct = df["population_percentile"].fillna(0)
    occupancy_norm = normalize_series(df["occupancy_rate"])

    score = (
        COMMUNITY_NEED_WEIGHTS["service_demand_index"] * service_demand
        + COMMUNITY_NEED_WEIGHTS["inverse_mobility"] * inverse_mobility
        + COMMUNITY_NEED_WEIGHTS["inverse_experience"] * inverse_experience
        + COMMUNITY_NEED_WEIGHTS["population_percentile"] * population_pct
        + COMMUNITY_NEED_WEIGHTS["occupancy_normalized"] * occupancy_norm
    )
    return score.clip(0, 100)


def _compute_amenity_adequacy_score(df: pd.DataFrame) -> pd.Series:
    """
    Weighted OSM amenity coverage vs city medians.

    Education, healthcare, and mobility amenity categories carry slightly more weight
    than retail and services.
    """
    adequacy = pd.Series(0.0, index=df.index)

    for category, weight in AMENITY_ADEQUACY_WEIGHTS.items():
        median_col = AMENITY_TO_CITY_MEDIAN[category]
        if category not in df.columns or median_col not in df.columns:
            continue
        cat_score = _category_adequacy(df[category], df[median_col])
        adequacy = adequacy + weight * cat_score

    return adequacy.clip(0, 100)


def _compute_market_pressure_score(df: pd.DataFrame) -> pd.Series:
    """
    Supporting market activity signal from listings and transactions.

    Listings/transactions are supporting market pressure only — not a pricing dashboard.
    Returns 0 when required support columns are missing.
    """
    if not all(col in df.columns for col in MARKET_PRESSURE_COLUMNS):
        return pd.Series(0, index=df.index, dtype=int)

    components = {
        "listing_count": normalize_series(df["listing_count"]),
        "available_listing_count": normalize_series(df["available_listing_count"]),
        "transaction_count": normalize_series(df["transaction_count"]),
        # active_listing_share is already 0–1; treat higher as more market activity
        "active_listing_share": normalize_series(df["active_listing_share"]),
    }

    score = sum(MARKET_PRESSURE_WEIGHTS[col] * components[col] for col in MARKET_PRESSURE_COLUMNS)
    return score.clip(0, 100)


def _compute_intervention_feasibility_score(df: pd.DataFrame) -> pd.Series:
    """
    Supporting feasibility from infrastructure and parcels.

    Parcels help explain feasibility, not community need. When parcel support
    columns are absent, fall back to infrastructure_score only.
    """
    if "infrastructure_score" not in df.columns:
        return pd.Series(0, index=df.index, dtype=int)

    infrastructure = df["infrastructure_score"].fillna(0).clip(0, 100)

    has_vacant = "vacant_or_available_parcel_count" in df.columns
    has_potential = "avg_potential_score" in df.columns

    if has_vacant and has_potential:
        vacant_norm = normalize_series(df["vacant_or_available_parcel_count"])
        potential = df["avg_potential_score"].fillna(0).clip(0, 100)
        score = (
            FEASIBILITY_WEIGHTS_WITH_PARCELS["infrastructure_score"] * infrastructure
            + FEASIBILITY_WEIGHTS_WITH_PARCELS["vacant_or_available_parcel_count"]
            * vacant_norm
            + FEASIBILITY_WEIGHTS_WITH_PARCELS["avg_potential_score"] * potential
        )
        return score.clip(0, 100)

    return infrastructure


def _gap_level(score: pd.Series) -> pd.Series:
    """Map community_gap_score to High / Medium / Low priority bands."""
    return pd.cut(
        score,
        bins=[-np.inf, 49, 74, 100],
        labels=["Low", "Medium", "High"],
    ).astype(str)


def add_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add deterministic score columns to a district-level feature dataframe.

    Expects output from :func:`community_gap.features.build_full_feature_dataset`.

    Score design (see docs/data_methodology.md):
      - community_need_score: demand, mobility weakness, experience weakness
      - amenity_adequacy_score / amenity_shortage_score: OSM vs city medians
      - market_pressure_score: listings + transactions (supporting only)
      - intervention_feasibility_score: parcels + infrastructure (separate from gap)
      - community_gap_score: 55% need + 35% shortage + 10% market pressure
    """
    out = df.copy()

    # --- Core: community need vs amenity supply ---
    out["community_need_score"] = _round_score(_compute_community_need_score(out))
    out["amenity_adequacy_score"] = _round_score(_compute_amenity_adequacy_score(out))
    out["amenity_shortage_score"] = _round_score(100 - out["amenity_adequacy_score"])

    # --- Supporting: market pressure (listings + transactions) ---
    out["market_pressure_score"] = _round_score(_compute_market_pressure_score(out))

    # --- Supporting: intervention feasibility (parcels + infrastructure) ---
    out["intervention_feasibility_score"] = _round_score(
        _compute_intervention_feasibility_score(out)
    )

    # --- Primary rank: need + shortage dominate; market pressure is minor context ---
    # intervention_feasibility_score is intentionally excluded from community_gap_score.
    out["community_gap_score"] = _round_score(
        GAP_WEIGHTS["community_need"] * out["community_need_score"]
        + GAP_WEIGHTS["amenity_shortage"] * out["amenity_shortage_score"]
        + GAP_WEIGHTS["market_pressure"] * out["market_pressure_score"]
    )

    out["gap_level"] = _gap_level(out["community_gap_score"])

    return out


def _compute_data_completeness_score(df: pd.DataFrame) -> pd.Series:
    """Percentage of required core fields that are non-null (0–100)."""
    present = pd.Series(0, index=df.index, dtype=int)

    for field in CORE_COMPLETENESS_FIELDS:
        if field in df.columns:
            present = present + df[field].notna().astype(int)

    return _round_score(present / len(CORE_COMPLETENESS_FIELDS) * 100)


def _confidence_level_from_agreement(count: pd.Series) -> pd.Series:
    """Map signal agreement count to High / Medium / Low."""
    return np.select(
        [count >= 6, count >= 3],
        ["High", "Medium"],
        default="Low",
    )


def _confidence_reason_for_row(row: pd.Series) -> str:
    """Build a district-specific confidence explanation from signal agreement."""
    district = row.get("district", "This district")
    level = str(row.get("confidence_level", "Low"))
    count = int(row.get("signal_agreement_count", 0) or 0)
    total = SIGNAL_COUNT

    agreeing = [
        CONFIDENCE_SIGNAL_LABELS[signal]
        for signal in SIGNAL_COLUMNS
        if bool(row.get(signal))
    ]

    if level == "High":
        if agreeing:
            preview = ", ".join(agreeing[:3])
            suffix = f" (+{len(agreeing) - 3} more)" if len(agreeing) > 3 else ""
            return (
                f"High confidence for {district}: {count}/{total} signals agree, "
                f"including {preview}{suffix}."
            )
        return (
            f"High confidence for {district}: {count}/{total} independent signals "
            f"point in the same direction."
        )

    if level == "Medium":
        if not bool(row.get("signal_need_and_shortage_agree")):
            return (
                f"Medium confidence for {district}: community need and amenity shortage "
                f"do not fully align ({count}/{total} signals agree)."
            )
        if agreeing:
            preview = ", ".join(agreeing[:3])
            return (
                f"Medium confidence for {district}: several indicators suggest a gap, "
                f"but not all categories align ({preview}; {count}/{total} signals)."
            )
        return (
            f"Medium confidence for {district}: partial signal agreement "
            f"({count}/{total} signals)."
        )

    if agreeing:
        preview = ", ".join(agreeing[:2])
        return (
            f"Low confidence for {district}: only {count}/{total} signals agree "
            f"({preview})."
        )
    return (
        f"Low confidence for {district}: limited signal agreement "
        f"({count}/{total} signals support a strong intervention claim)."
    )


def add_confidence(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add evidence-agreement confidence fields to a scored dataframe.

    Confidence reflects how many independent signals align — not ML probability.

    Eight agreement signals (see SIGNAL_COLUMNS). High = 6+ agree, Medium = 3–5,
    Low otherwise. High is capped at Medium when data_completeness_score < 80%.
    """
    out = df.copy()

    # --- Boolean evidence signals ---
    out["signal_high_service_demand"] = (
        out["service_demand_index"] > out["city_median_service_demand"]
    )
    out["signal_weak_mobility"] = out["mobility_score"] < out["city_median_mobility_score"]
    out["signal_weak_resident_experience"] = (
        out["resident_experience_score"] < out["city_median_resident_experience_score"]
    )
    out["signal_low_education"] = out["education"] < out["city_median_education"]
    out["signal_low_healthcare"] = out["healthcare"] < out["city_median_healthcare"]
    out["signal_low_mobility_amenities"] = (
        out["mobility"] < out["city_median_mobility_amenities"]
    )
    out["signal_high_market_pressure"] = out["market_pressure_score"] >= 60

    out["city_median_community_need_score"] = out["community_need_score"].median()
    out["city_median_amenity_shortage_score"] = out["amenity_shortage_score"].median()
    out["city_median_community_gap_score"] = out["community_gap_score"].median()

    out["signal_need_and_shortage_agree"] = (
        out["community_need_score"] >= out["city_median_community_need_score"]
    ) & (out["amenity_shortage_score"] >= out["city_median_amenity_shortage_score"])

    out["signal_agreement_count"] = out[SIGNAL_COLUMNS].sum(axis=1).astype(int)

    out["confidence_score"] = _round_score(
        (out["signal_agreement_count"] / SIGNAL_COUNT * 100).clip(upper=100)
    )

    out["data_completeness_score"] = _compute_data_completeness_score(out)

    out["confidence_level"] = _confidence_level_from_agreement(out["signal_agreement_count"])

    # Sparse core data should not receive High confidence.
    low_completeness = out["data_completeness_score"] < COMPLETENESS_CAP_THRESHOLD
    out.loc[low_completeness & (out["confidence_level"] == "High"), "confidence_level"] = (
        "Medium"
    )

    out["confidence_reason"] = out.apply(_confidence_reason_for_row, axis=1)

    return out


def score_all_districts(features: pd.DataFrame) -> pd.DataFrame:
    """
    Apply scoring and rank rows by community_gap_score (1 = highest priority).

    Returns one row per district in *features* (district-level after aggregation).
    """
    scored = add_confidence(add_scores(features))
    scored = scored.sort_values("community_gap_score", ascending=False).reset_index(drop=True)
    scored["intervention_rank"] = range(1, len(scored) + 1)
    return scored


# Backward-compatible aliases for older placeholder names
compute_community_need_score = _compute_community_need_score
compute_amenity_adequacy_score = _compute_amenity_adequacy_score
compute_amenity_shortage_score = lambda adequacy: 100 - adequacy
compute_market_pressure_score = _compute_market_pressure_score
compute_intervention_feasibility_score = _compute_intervention_feasibility_score
