"""District name normalization and master-district alignment."""

from __future__ import annotations

import re

import pandas as pd

# Known aliases that may appear in future data drops.
DISTRICT_ALIASES: dict[str, str] = {
    "mohammed bin zayed": "Mohammed Bin Zayed City",
    "mbz city": "Mohammed Bin Zayed City",
    "mbz": "Mohammed Bin Zayed City",
    "al reem": "Al Reem Island",
    "reem island": "Al Reem Island",
    "al maryah": "Al Maryah Island",
    "maryah island": "Al Maryah Island",
    "saadiyat": "Saadiyat Island",
    "yas": "Yas Island",
    "zayed city district": "Zayed City",
    "khalifa city a": "Khalifa City",
    "khalifa city b": "Khalifa City",
}


def _collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def normalize_district_name(raw: str) -> str:
    """Clean and canonicalize a district label."""
    if pd.isna(raw):
        return ""

    cleaned = _collapse_whitespace(str(raw))
    if not cleaned:
        return ""

    alias_key = cleaned.lower()
    if alias_key in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[alias_key]

    # Title-case words while preserving known acronyms and "Al" prefix style.
    words = cleaned.split()
    normalized_words: list[str] = []
    for word in words:
        lower = word.lower()
        if lower in {"al", "bin", "abu", "danet"}:
            normalized_words.append(lower.capitalize())
        else:
            normalized_words.append(word[:1].upper() + word[1:].lower() if word else word)

    return " ".join(normalized_words)


def clean_district_column(
    df: pd.DataFrame,
    master_districts: list[str],
    column: str = "district",
) -> pd.DataFrame:
    """Normalize district names and flag rows outside the master list."""
    out = df.copy()
    out[column] = out[column].map(normalize_district_name)

    unknown = sorted(set(out[column]) - set(master_districts) - {""})
    if unknown:
        raise ValueError(
            f"Unknown districts in {column}: {unknown}. "
            f"Expected one of: {master_districts}"
        )

    return out


def apply_district_cleaning(
    communities: pd.DataFrame,
    districts: pd.DataFrame,
    amenities: pd.DataFrame,
    listings: pd.DataFrame,
    parcels: pd.DataFrame,
    transactions: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Clean district names across all datasets using districts.csv as master."""
    master = sorted(districts["district"].map(normalize_district_name).unique())

    cleaned_districts = clean_district_column(districts, master)
    cleaned_communities = clean_district_column(communities, master)
    cleaned_amenities = clean_district_column(amenities, master)
    cleaned_listings = clean_district_column(listings, master)
    cleaned_parcels = clean_district_column(parcels, master)
    cleaned_transactions = clean_district_column(transactions, master)

    return (
        cleaned_communities,
        cleaned_districts,
        cleaned_amenities,
        cleaned_listings,
        cleaned_parcels,
        cleaned_transactions,
    )
