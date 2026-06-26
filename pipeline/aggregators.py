"""District-level aggregations from raw challenge datasets."""

from __future__ import annotations

import pandas as pd

from pipeline.config import AMENITY_CATEGORIES


def aggregate_community_signals(communities: pd.DataFrame) -> pd.DataFrame:
    """Roll community rows up to one district profile."""
    grouped = communities.groupby("district", as_index=False).agg(
        community_count=("community_id", "count"),
        population_estimate=("population_estimate", "sum"),
        occupancy_rate=("occupancy_rate", "mean"),
        service_demand_index=("service_demand_index", "mean"),
        mobility_score=("mobility_score", "mean"),
        resident_experience_score=("resident_experience_score", "mean"),
    )

    # Population-weighted demand when multiple communities exist in one district.
    weighted = (
        communities.assign(
            weighted_demand=communities["service_demand_index"]
            * communities["population_estimate"]
        )
        .groupby("district")["weighted_demand"]
        .sum()
        / communities.groupby("district")["population_estimate"].sum()
    )
    grouped["service_demand_index"] = grouped["district"].map(weighted).round(2)

    mode_opportunity = (
        communities.groupby("district")["optimization_opportunity"]
        .agg(lambda s: s.mode().iloc[0] if not s.mode().empty else "")
        .rename("top_optimization_opportunity")
    )
    grouped = grouped.merge(mode_opportunity, on="district", how="left")

    return grouped


def count_amenities_by_district(amenities: pd.DataFrame) -> pd.DataFrame:
    """Count OSM amenities per district and category."""
    counts = (
        amenities.groupby(["district", "category"])
        .size()
        .unstack(fill_value=0)
        .reindex(columns=AMENITY_CATEGORIES, fill_value=0)
        .reset_index()
    )
    counts["total_amenities"] = counts[AMENITY_CATEGORIES].sum(axis=1)
    return counts


def build_supporting_context(
    listings: pd.DataFrame,
    parcels: pd.DataFrame,
    transactions: pd.DataFrame,
    population_by_district: pd.Series,
) -> pd.DataFrame:
    """Derive lightweight market and feasibility context — supporting only."""
    listing_stats = listings.groupby("district").agg(
        listing_count=("listing_id", "count"),
        active_listing_count=("status", lambda s: (s == "available").sum()),
        avg_price_per_sqm_aed=("price_per_sqm_aed", "mean"),
        rent_share=("listing_type", lambda s: (s == "rent").mean()),
    )

    parcel_stats = parcels.groupby("district").agg(
        parcel_count=("parcel_id", "count"),
        vacant_parcel_count=(
            "current_status",
            lambda s: s.isin(["vacant", "under_development"]).sum(),
        ),
        avg_development_potential=("development_potential_score", "mean"),
        community_parcel_count=("land_use", lambda s: (s == "community").sum()),
        avg_parcel_size_sqm=("parcel_size_sqm", "mean"),
    )

    txn_stats = transactions.groupby("district").agg(
        transaction_count=("transaction_id", "count"),
        avg_transaction_price_per_sqm=("price_per_sqm", "mean"),
        total_transaction_value_aed=("transaction_value_aed", "sum"),
    )

    context = (
        listing_stats.join(parcel_stats, how="outer")
        .join(txn_stats, how="outer")
        .fillna(0)
        .reset_index()
    )

    pop = population_by_district.rename("population_estimate")
    context = context.merge(pop, on="district", how="left")
    context["population_estimate"] = context["population_estimate"].fillna(1).clip(lower=1)
    context["listings_per_10k_residents"] = (
        context["listing_count"] / context["population_estimate"] * 10_000
    ).round(2)
    context["transactions_per_10k_residents"] = (
        context["transaction_count"] / context["population_estimate"] * 10_000
    ).round(2)

    return context


def build_district_base(
    districts: pd.DataFrame,
    community_agg: pd.DataFrame,
    amenity_counts: pd.DataFrame,
    supporting: pd.DataFrame,
) -> pd.DataFrame:
    """Join all district-level tables on the master district list."""
    base = districts.merge(community_agg, on="district", how="left")
    base = base.merge(amenity_counts, on="district", how="left")
    base = base.merge(supporting, on="district", how="left", suffixes=("", "_ctx"))

    for col in AMENITY_CATEGORIES + ["total_amenities"]:
        if col in base.columns:
            base[col] = base[col].fillna(0)

    return base
