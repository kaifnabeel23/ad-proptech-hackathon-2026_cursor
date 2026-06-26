"""
Feature engineering — amenity counts and core community/district dataset.

Transforms raw CSV rows into enriched community records with district metadata,
OSM amenity counts, city medians, and percentile ranks.
"""

from __future__ import annotations

import pandas as pd

from community_gap.data_loader import DatasetBundle

AMENITY_CATEGORIES = [
    "education",
    "healthcare",
    "retail",
    "services",
    "community",
    "mobility",
]

AMENITY_COUNT_COLUMNS = AMENITY_CATEGORIES + ["total_amenities", "amenity_diversity_count"]

CITY_MEDIAN_COMMUNITY_COLUMNS = {
    "city_median_service_demand": "service_demand_index",
    "city_median_mobility_score": "mobility_score",
    "city_median_resident_experience_score": "resident_experience_score",
    "city_median_population": "population_estimate",
}

CITY_MEDIAN_AMENITY_COLUMNS = {
    "city_median_education": "education",
    "city_median_healthcare": "healthcare",
    "city_median_retail": "retail",
    "city_median_services": "services",
    "city_median_community": "community",
    "city_median_mobility_amenities": "mobility",
    "city_median_total_amenities": "total_amenities",
}

PERCENTILE_COLUMNS = {
    "population_percentile": "population_estimate",
    "service_demand_percentile": "service_demand_index",
    "mobility_percentile": "mobility_score",
    "resident_experience_percentile": "resident_experience_score",
    "total_amenities_percentile": "total_amenities",
}

# Supporting context only — must not drive community_gap_score directly.
LISTING_COUNT_COLUMNS = [
    "listing_count",
    "available_listing_count",
    "rent_listing_count",
    "sale_listing_count",
]

LISTING_CONTEXT_COLUMNS = LISTING_COUNT_COLUMNS + [
    "avg_rent_price_per_sqm",
    "avg_sale_price_per_sqm",
    "median_listing_size_sqm",
    "dominant_property_type",
    "furnished_share",
    "active_listing_share",
]

# Supporting context only — feasibility / evidence, not core gap drivers.
PARCEL_COUNT_COLUMNS = [
    "parcel_count",
    "vacant_or_available_parcel_count",
    "mixed_use_or_community_parcel_count",
]

PARCEL_CONTEXT_COLUMNS = PARCEL_COUNT_COLUMNS + [
    "avg_parcel_size_sqm",
    "avg_infrastructure_score",
    "avg_potential_score",
]

# Parcel statuses treated as intervention-ready when current_status is present.
VACANT_OR_AVAILABLE_STATUSES = frozenset({"vacant", "under_development", "available"})

# Land uses counted toward community/mixed-use intervention capacity.
MIXED_OR_COMMUNITY_LAND_USES = frozenset({"mixed_use", "community"})

# Column name fallbacks when starter-kit schemas vary slightly.
_SIZE_COLUMNS = ("parcel_size_sqm", "size_sqm", "parcel_size")
_INFRASTRUCTURE_COLUMNS = ("infrastructure_score",)
_POTENTIAL_COLUMNS = ("development_potential_score", "development_potential", "potential_score")
_STATUS_COLUMNS = ("current_status", "status", "parcel_status")
_LAND_USE_COLUMNS = ("land_use", "zoning", "zone_use")
_ID_COLUMNS = ("parcel_id",)

# Transaction column fallbacks.
_TRANSACTION_ID_COLUMNS = ("transaction_id",)
_TRANSACTION_VALUE_COLUMNS = ("transaction_value_aed", "transaction_value", "value_aed")
_TRANSACTION_PRICE_COLUMNS = ("price_per_sqm", "price_per_sqm_aed", "transaction_price_per_sqm")
_TRANSACTION_DATE_COLUMNS = ("date", "transaction_date", "txn_date")

# Supporting context — market activity / growth pressure, not a pricing dashboard.
TRANSACTION_COUNT_COLUMNS = [
    "transaction_count",
    "transaction_count_2026",
]

TRANSACTION_CONTEXT_COLUMNS = TRANSACTION_COUNT_COLUMNS + [
    "total_transaction_value_aed",
    "avg_transaction_value_aed",
    "avg_transaction_price_per_sqm",
    "latest_transaction_date",
    "recent_transaction_share",
]

RECENT_TRANSACTION_YEAR = 2026

# Keys accepted in the data dict (load_challenge_data names + CSV-style aliases).
_COMMUNITIES_KEYS = ("communities", "sample_communities")
_DISTRICTS_KEYS = ("districts",)
_AMENITIES_KEYS = ("amenities", "osm_amenities")
_LISTINGS_KEYS = ("listings", "sample_listings")
_PARCELS_KEYS = ("parcels", "sample_parcels")
_TRANSACTIONS_KEYS = ("transactions", "sample_transactions")

# Supporting numeric columns safe to default to 0 when a district has no rows.
SUPPORT_COUNT_ZERO_FILL_COLUMNS = (
    LISTING_COUNT_COLUMNS
    + PARCEL_COUNT_COLUMNS
    + TRANSACTION_COUNT_COLUMNS
)

SUPPORT_SHARE_ZERO_FILL_COLUMNS = (
    "active_listing_share",
    "recent_transaction_share",
    "furnished_share",
)

SUPPORT_OTHER_ZERO_FILL_COLUMNS = ("total_transaction_value_aed",)

def build_amenity_counts(osm_amenities: pd.DataFrame) -> pd.DataFrame:
    """
    Count OSM amenities per district and pivot to one row per district.

    Returns
    -------
    pd.DataFrame
        Columns: district, six category counts, total_amenities,
        amenity_diversity_count.
    """
    counts = (
        osm_amenities.groupby(["district", "category"], observed=True)
        .size()
        .unstack(fill_value=0)
        .reindex(columns=AMENITY_CATEGORIES, fill_value=0)
        .astype(int)
    )

    counts["total_amenities"] = counts[AMENITY_CATEGORIES].sum(axis=1)
    counts["amenity_diversity_count"] = (counts[AMENITY_CATEGORIES] > 0).sum(axis=1).astype(int)

    return counts.reset_index()


def _percentile_rank(series: pd.Series) -> pd.Series:
    """Map values to 0–100 percentile rank across the series."""
    if series.empty:
        return series.astype(float)
    if len(series) == 1:
        return pd.Series([50.0], index=series.index)
    return (series.rank(pct=True) * 100).round(2)


def _population_weighted_mean(group: pd.DataFrame, value_col: str, weight_col: str) -> float:
    """Population-weighted mean when weights are positive; otherwise simple mean."""
    values = group[value_col]
    weights = group[weight_col]
    valid = values.notna() & weights.notna() & (weights > 0)
    if valid.any() and weights.loc[valid].sum() > 0:
        return float((values.loc[valid] * weights.loc[valid]).sum() / weights.loc[valid].sum())
    return float(values.mean()) if values.notna().any() else float("nan")


def _mode_or_first_non_null(series: pd.Series) -> object:
    """Return the most common non-null value, or the first non-null if mode is unavailable."""
    non_null = series.dropna()
    if non_null.empty:
        return pd.NA
    mode = non_null.mode()
    if not mode.empty:
        return mode.iloc[0]
    return non_null.iloc[0]


def aggregate_community_features(communities: pd.DataFrame) -> pd.DataFrame:
    """
    Roll community rows up to district level.

    Returns one row per district with aggregated community metrics.
    """
    if "district" not in communities.columns:
        raise ValueError("communities dataframe must include a 'district' column")

    grouped = communities.groupby("district", observed=True)

    aggregated = grouped.agg(
        population_estimate=("population_estimate", "sum"),
        occupancy_rate=("occupancy_rate", "mean"),
        mobility_score=("mobility_score", "mean"),
        resident_experience_score=("resident_experience_score", "mean"),
        community_record_count=("district", "size"),
    ).reset_index()

    aggregated["occupancy_rate"] = aggregated["occupancy_rate"].round(2)
    aggregated["mobility_score"] = aggregated["mobility_score"].round(2)
    aggregated["resident_experience_score"] = aggregated["resident_experience_score"].round(2)

    demand_weighted = grouped.apply(
        lambda g: _population_weighted_mean(g, "service_demand_index", "population_estimate"),
        include_groups=False,
    )
    aggregated["service_demand_index"] = aggregated["district"].map(demand_weighted).round(2)

    if "optimization_opportunity" in communities.columns:
        opportunity = grouped["optimization_opportunity"].apply(_mode_or_first_non_null)
        aggregated["optimization_opportunity"] = aggregated["district"].map(opportunity)

    return aggregated


def build_core_dataset(
    communities: pd.DataFrame,
    districts: pd.DataFrame,
    osm_amenities: pd.DataFrame,
) -> pd.DataFrame:
    """
    Merge aggregated community metrics with district metadata and amenity counts.

    Returns one row per district with city median and percentile columns computed
    across district rows (not raw community records).
    """
    amenity_counts = build_amenity_counts(osm_amenities)
    communities_by_district = aggregate_community_features(communities)

    df = communities_by_district.merge(districts, on="district", how="left")
    df = df.merge(amenity_counts, on="district", how="left")

    for col in AMENITY_COUNT_COLUMNS:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)

    for median_col, source_col in CITY_MEDIAN_COMMUNITY_COLUMNS.items():
        df[median_col] = df[source_col].median()

    for median_col, source_col in CITY_MEDIAN_AMENITY_COLUMNS.items():
        df[median_col] = amenity_counts[source_col].median()

    for percentile_col, source_col in PERCENTILE_COLUMNS.items():
        df[percentile_col] = _percentile_rank(df[source_col])

    return df


def _dominant_value(series: pd.Series) -> object:
    """Return the statistical mode, or NA when empty."""
    mode = series.dropna().mode()
    return mode.iloc[0] if not mode.empty else pd.NA


def build_listing_context(listings: pd.DataFrame) -> pd.DataFrame:
    """
    Build district-level residential listing activity features.

    Rent and sale listings share ``price_aed`` but represent different markets,
    so rent and sale price metrics are computed separately from ``price_per_sqm_aed``.

    Returns one row per district. Supporting context only — not a core gap driver.
    """
    rent = listings[listings["listing_type"] == "rent"]
    sale = listings[listings["listing_type"] == "sale"]

    context = listings.groupby("district", observed=True).agg(
        listing_count=("listing_id", "count"),
        available_listing_count=("status", lambda s: (s == "available").sum()),
        rent_listing_count=("listing_type", lambda s: (s == "rent").sum()),
        sale_listing_count=("listing_type", lambda s: (s == "sale").sum()),
        median_listing_size_sqm=("size_sqm", "median"),
        dominant_property_type=("property_type", _dominant_value),
    )

    rent_prices = (
        rent.groupby("district", observed=True)["price_per_sqm_aed"]
        .mean()
        .rename("avg_rent_price_per_sqm")
    )
    sale_prices = (
        sale.groupby("district", observed=True)["price_per_sqm_aed"]
        .mean()
        .rename("avg_sale_price_per_sqm")
    )

    context = context.join(rent_prices, how="left").join(sale_prices, how="left")

    if "furnished" in listings.columns:
        furnished_share = (
            listings.groupby("district", observed=True)["furnished"]
            .mean()
            .rename("furnished_share")
        )
        context = context.join(furnished_share, how="left")

    context["active_listing_share"] = (
        context["available_listing_count"] / context["listing_count"].replace(0, pd.NA)
    ).fillna(0.0)

    context = context.reset_index()

    int_cols = LISTING_COUNT_COLUMNS
    context[int_cols] = context[int_cols].astype(int)
    context["median_listing_size_sqm"] = context["median_listing_size_sqm"].round(2)
    context["avg_rent_price_per_sqm"] = context["avg_rent_price_per_sqm"].round(2)
    context["avg_sale_price_per_sqm"] = context["avg_sale_price_per_sqm"].round(2)
    if "furnished_share" in context.columns:
        context["furnished_share"] = context["furnished_share"].round(4)
    context["active_listing_share"] = context["active_listing_share"].round(4)

    return context


def add_listing_context(core_df: pd.DataFrame, listings_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge district listing context into the core community dataset.

    Listing count columns are filled with 0 when a district has no listing rows.
    Price and share metrics are left as NA when unavailable.
    """
    listing_context = build_listing_context(listings_df)
    merged = core_df.merge(listing_context, on="district", how="left")

    for col in LISTING_COUNT_COLUMNS:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    return merged


def _first_present_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    """Return the first candidate column name that exists in *df*."""
    for col in candidates:
        if col in df.columns:
            return col
    return None


def build_parcel_context(parcels: pd.DataFrame) -> pd.DataFrame:
    """
    Build district-level parcel / intervention-feasibility features.

    Uses whichever of the expected columns are present in *parcels*; missing
    columns are skipped rather than raising errors.

    Known starter-kit schema::

        parcel_id, district, zone, land_use, parcel_size_sqm, current_status,
        infrastructure_score, development_potential_score, estimated_value_aed,
        recommended_use

    Returns one row per district. Supporting context only.
    """
    id_col = _first_present_column(parcels, _ID_COLUMNS)
    status_col = _first_present_column(parcels, _STATUS_COLUMNS)
    land_use_col = _first_present_column(parcels, _LAND_USE_COLUMNS)
    size_col = _first_present_column(parcels, _SIZE_COLUMNS)
    infra_col = _first_present_column(parcels, _INFRASTRUCTURE_COLUMNS)
    potential_col = _first_present_column(parcels, _POTENTIAL_COLUMNS)

    grouped = parcels.groupby("district", observed=True)

    if id_col:
        context = grouped[id_col].count().to_frame("parcel_count")
    else:
        context = grouped.size().to_frame("parcel_count")

    if status_col:
        vacant_counts = (
            parcels.groupby("district", observed=True)[status_col]
            .apply(lambda s: s.isin(VACANT_OR_AVAILABLE_STATUSES).sum())
            .rename("vacant_or_available_parcel_count")
        )
        context = context.join(vacant_counts, how="left")

    if land_use_col:
        mixed_counts = (
            parcels.groupby("district", observed=True)[land_use_col]
            .apply(lambda s: s.isin(MIXED_OR_COMMUNITY_LAND_USES).sum())
            .rename("mixed_use_or_community_parcel_count")
        )
        context = context.join(mixed_counts, how="left")

    if size_col:
        avg_size = grouped[size_col].mean().rename("avg_parcel_size_sqm")
        context = context.join(avg_size, how="left")

    if infra_col:
        avg_infra = grouped[infra_col].mean().rename("avg_infrastructure_score")
        context = context.join(avg_infra, how="left")

    if potential_col:
        avg_potential = grouped[potential_col].mean().rename("avg_potential_score")
        context = context.join(avg_potential, how="left")

    context = context.reset_index()

    for col in PARCEL_COUNT_COLUMNS:
        if col in context.columns:
            context[col] = context[col].fillna(0).astype(int)

    for col in ("avg_parcel_size_sqm", "avg_infrastructure_score", "avg_potential_score"):
        if col in context.columns:
            context[col] = context[col].round(2)

    return context


def add_parcel_context(core_df: pd.DataFrame, parcels_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge district parcel context into the core community dataset.

    Parcel count columns are filled with 0 when a district has no parcel rows.
    Average score/size columns are left as NA when unavailable.
    """
    parcel_context = build_parcel_context(parcels_df)
    merged = core_df.merge(parcel_context, on="district", how="left")

    for col in PARCEL_COUNT_COLUMNS:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    return merged


def build_transaction_context(transactions: pd.DataFrame) -> pd.DataFrame:
    """
    Build district-level market activity features from transactions.

    Uses whichever expected columns are present; missing columns are skipped.
    When a date column exists it is parsed with :func:`pandas.to_datetime`.

    Known starter-kit schema::

        transaction_id, date, district, asset_type, transaction_value_aed,
        size_sqm, price_per_sqm, buyer_type

    ``recent_transaction_share`` = share of district transactions in
    :data:`RECENT_TRANSACTION_YEAR` (2026 in the starter kit).

    Returns one row per district. Supporting context only.
    """
    id_col = _first_present_column(transactions, _TRANSACTION_ID_COLUMNS)
    value_col = _first_present_column(transactions, _TRANSACTION_VALUE_COLUMNS)
    price_col = _first_present_column(transactions, _TRANSACTION_PRICE_COLUMNS)
    date_col = _first_present_column(transactions, _TRANSACTION_DATE_COLUMNS)

    grouped = transactions.groupby("district", observed=True)

    if id_col:
        context = grouped[id_col].count().to_frame("transaction_count")
    else:
        context = grouped.size().to_frame("transaction_count")

    if value_col:
        context = context.join(
            grouped[value_col].sum().rename("total_transaction_value_aed"), how="left"
        )
        context = context.join(
            grouped[value_col].mean().rename("avg_transaction_value_aed"), how="left"
        )

    if price_col:
        context = context.join(
            grouped[price_col].mean().rename("avg_transaction_price_per_sqm"), how="left"
        )

    if date_col:
        working = transactions.copy()
        working["_transaction_date"] = pd.to_datetime(working[date_col], errors="coerce")
        date_grouped = working.groupby("district", observed=True)

        context = context.join(
            date_grouped["_transaction_date"].max().rename("latest_transaction_date"),
            how="left",
        )

        count_recent = (
            working.loc[working["_transaction_date"].dt.year == RECENT_TRANSACTION_YEAR]
            .groupby("district", observed=True)
            .size()
            .rename("transaction_count_2026")
        )
        context = context.join(count_recent, how="left")

        context["recent_transaction_share"] = (
            context["transaction_count_2026"].fillna(0)
            / context["transaction_count"].replace(0, pd.NA)
        ).fillna(0.0)

    context = context.reset_index()

    for col in TRANSACTION_COUNT_COLUMNS:
        if col in context.columns:
            context[col] = context[col].fillna(0).astype(int)

    if "avg_transaction_value_aed" in context.columns:
        context["avg_transaction_value_aed"] = context["avg_transaction_value_aed"].round(2)
    if "avg_transaction_price_per_sqm" in context.columns:
        context["avg_transaction_price_per_sqm"] = context[
            "avg_transaction_price_per_sqm"
        ].round(2)
    if "recent_transaction_share" in context.columns:
        context["recent_transaction_share"] = context["recent_transaction_share"].round(4)
    if "latest_transaction_date" in context.columns:
        context["latest_transaction_date"] = context["latest_transaction_date"].dt.strftime(
            "%Y-%m-%d"
        )

    return context


def add_transaction_context(
    core_df: pd.DataFrame, transactions_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Merge district transaction context into the core community dataset.

    Transaction count columns are filled with 0 when a district has no rows.
    Value averages and dates are left as NA when unavailable.
    """
    transaction_context = build_transaction_context(transactions_df)
    merged = core_df.merge(transaction_context, on="district", how="left")

    for col in TRANSACTION_COUNT_COLUMNS:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    return merged


def _get_dataframe(data: dict[str, pd.DataFrame], *keys: str) -> pd.DataFrame | None:
    """Return the first matching dataframe from *data*, or None."""
    for key in keys:
        frame = data.get(key)
        if frame is not None:
            return frame
    return None


def _require_dataframe(
    data: dict[str, pd.DataFrame], keys: tuple[str, ...], label: str
) -> pd.DataFrame:
    """Return a required dataframe or raise a clear error."""
    frame = _get_dataframe(data, *keys)
    if frame is None:
        raise ValueError(
            f"Missing required dataset for {label}. Expected one of: {', '.join(keys)}"
        )
    return frame


def _fill_supporting_numeric_defaults(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fill missing supporting numeric columns with 0 where that is semantically safe.

    Counts, shares, and total transaction value default to 0.
    Price averages and dates are left as NA.
    """
    out = df.copy()

    zero_fill_cols = (
        list(SUPPORT_COUNT_ZERO_FILL_COLUMNS)
        + list(SUPPORT_SHARE_ZERO_FILL_COLUMNS)
        + list(SUPPORT_OTHER_ZERO_FILL_COLUMNS)
    )

    for col in zero_fill_cols:
        if col not in out.columns:
            continue
        out[col] = out[col].fillna(0)
        if col in SUPPORT_COUNT_ZERO_FILL_COLUMNS:
            out[col] = out[col].astype(int)

    return out


def build_full_feature_dataset(data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Build the complete community/district feature table for scoring.

    Parameters
    ----------
    data:
        Mapping of dataset names to dataframes — as returned by
        :func:`community_gap.data_loader.load_challenge_data`. CSV-style
        aliases (e.g. ``sample_communities``) are also accepted.

    Returns
    -------
    pd.DataFrame
        One row per district with core, amenity, and supporting context
        columns merged on ``district``.
    """
    communities = _require_dataframe(data, _COMMUNITIES_KEYS, "communities")
    districts = _require_dataframe(data, _DISTRICTS_KEYS, "districts")
    amenities = _require_dataframe(data, _AMENITIES_KEYS, "osm amenities")

    df = build_core_dataset(communities, districts, amenities)

    listings = _get_dataframe(data, *_LISTINGS_KEYS)
    if listings is not None:
        df = add_listing_context(df, listings)

    parcels = _get_dataframe(data, *_PARCELS_KEYS)
    if parcels is not None:
        df = add_parcel_context(df, parcels)

    transactions = _get_dataframe(data, *_TRANSACTIONS_KEYS)
    if transactions is not None:
        df = add_transaction_context(df, transactions)

    return _fill_supporting_numeric_defaults(df)


def count_amenities_by_district(amenities: pd.DataFrame) -> pd.DataFrame:
    """Alias for :func:`build_amenity_counts` (backward compatibility)."""
    return build_amenity_counts(amenities)


def build_market_features(
    listings: pd.DataFrame | None,
    transactions: pd.DataFrame | None,
    population_by_district: pd.Series,
) -> pd.DataFrame:
    """
    Build supporting market-pressure features from listings and transactions.

    Deprecated in favour of :func:`build_listing_context` for listings.
    """
    if listings is None:
        raise NotImplementedError("TODO: build_market_features without listings")
    return build_listing_context(listings)


def build_feasibility_features(
    parcels: pd.DataFrame | None,
    districts: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build supporting intervention-feasibility features from parcels.

    Deprecated in favour of :func:`build_parcel_context`.
    """
    if parcels is None:
        raise ValueError("parcels dataframe is required for feasibility features")
    return build_parcel_context(parcels)


def build_district_feature_table(bundle: DatasetBundle) -> pd.DataFrame:
    """
    Join all feature tables on district.

    This is the main input to :mod:`community_gap.scoring`.

    Returns one row per district with all feature columns.
    """
    data = {
        "districts": bundle.districts,
        "communities": bundle.communities,
        "amenities": bundle.amenities,
    }
    if bundle.listings is not None:
        data["listings"] = bundle.listings
    if bundle.parcels is not None:
        data["parcels"] = bundle.parcels
    if bundle.transactions is not None:
        data["transactions"] = bundle.transactions
    return build_full_feature_dataset(data)


def _sample_display_columns(df: pd.DataFrame) -> list[str]:
    """Pick readable columns for CLI sample output."""
    preferred = [
        "district",
        "community_record_count",
        "service_demand_index",
        "mobility_score",
        "total_amenities",
        "listing_count",
        "parcel_count",
        "transaction_count",
        "recent_transaction_share",
    ]
    return [col for col in preferred if col in df.columns]


def main() -> None:
    """Load challenge data, build features, and print a smoke-test summary."""
    from community_gap import DATA_DIR
    from community_gap.data_loader import load_challenge_data

    print(f"Loading data from {DATA_DIR.resolve()}...")
    data = load_challenge_data(DATA_DIR)
    print(f"Loaded datasets: {', '.join(sorted(data.keys()))}\n")

    df = build_full_feature_dataset(data)

    print(f"final shape: {df.shape[0]} rows x {df.shape[1]} columns")
    print(f"\ncolumns ({len(df.columns)}):")
    for col in df.columns:
        print(f"  - {col}")

    display_cols = _sample_display_columns(df)
    print("\nsample rows:")
    print(df[display_cols].head(3).to_string(index=False))


if __name__ == "__main__":
    main()
