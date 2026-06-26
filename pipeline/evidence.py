"""Generate deterministic evidence bullets for each district."""

from __future__ import annotations

import pandas as pd

from pipeline.config import AMENITY_CATEGORIES


def _fmt_num(value: float, decimals: int = 1) -> str:
    return f"{value:.{decimals}f}"


def generate_evidence_bullets(
    row: pd.Series,
    city_medians: dict[str, float],
) -> list[str]:
    """Build human-readable evidence tied to computed metrics."""
    bullets: list[str] = []

    if row["service_demand_index"] >= city_medians["service_demand_index"]:
        bullets.append(
            f"Service demand index is {_fmt_num(row['service_demand_index'])} "
            f"(city median {_fmt_num(city_medians['service_demand_index'])})."
        )
    else:
        bullets.append(
            f"Service demand index is {_fmt_num(row['service_demand_index'])}, "
            "below the city median — need pressure is moderate."
        )

    if row["mobility_score"] < city_medians["mobility_score"]:
        bullets.append(
            f"Mobility score is {_fmt_num(row['mobility_score'])} vs city median "
            f"{_fmt_num(city_medians['mobility_score'])}."
        )

    if row["resident_experience_score"] < city_medians["resident_experience_score"]:
        bullets.append(
            f"Resident experience score is {_fmt_num(row['resident_experience_score'])} "
            f"(city median {_fmt_num(city_medians['resident_experience_score'])})."
        )

    bullets.append(
        f"Estimated district population: {int(row['population_estimate']):,} "
        f"across {int(row['community_count'])} community record(s)."
    )

    weak_cats = sorted(
        AMENITY_CATEGORIES,
        key=lambda c: row.get(f"shortage_{c}", 0),
        reverse=True,
    )[:3]

    for category in weak_cats:
        count = int(row[category])
        per_10k = row.get(f"amenity_per_10k_{category}", 0)
        shortage = row.get(f"shortage_{category}", 0)
        if shortage >= 25:
            bullets.append(
                f"{category.title()} coverage is weak: {count} OSM amenities "
                f"({_fmt_num(per_10k, 2)} per 10k residents; shortage "
                f"{_fmt_num(shortage)})."
            )

    bullets.append(
        f"Community need score {_fmt_num(row['community_need_score'])} and "
        f"amenity shortage score {_fmt_num(row['amenity_shortage_score'])} "
        f"combine to gap score {_fmt_num(row['community_gap_score'])}."
    )

    if row.get("listing_count", 0) > 0:
        bullets.append(
            f"Market context: {int(row['listing_count'])} listings "
            f"({_fmt_num(row.get('listings_per_10k_residents', 0), 2)} per 10k residents); "
            f"{int(row.get('transaction_count', 0))} recorded transactions."
        )

    if row.get("vacant_parcel_count", 0) > 0:
        bullets.append(
            f"Feasibility context: {int(row['vacant_parcel_count'])} vacant or "
            "under-development parcels available for intervention."
        )

    return bullets


def build_city_medians(df: pd.DataFrame) -> dict[str, float]:
    return {
        "service_demand_index": float(df["service_demand_index"].median()),
        "mobility_score": float(df["mobility_score"].median()),
        "resident_experience_score": float(df["resident_experience_score"].median()),
        "community_gap_score": float(df["community_gap_score"].median()),
    }
