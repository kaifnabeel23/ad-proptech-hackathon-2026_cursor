"""
Load and validate challenge CSV datasets.

Primary entry point::

    from community_gap.data_loader import load_challenge_data
    data = load_challenge_data("data")

CLI smoke test::

    python -m community_gap.data_loader
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from community_gap import DATA_DIR

# ---------------------------------------------------------------------------
# Column contracts (filename → columns)
# ---------------------------------------------------------------------------

REQUIRED_COLUMNS: dict[str, list[str]] = {
    "districts.csv": [
        "district",
        "area_type",
        "profile",
        "infrastructure_score",
        "latitude",
        "longitude",
    ],
    "sample_communities.csv": [
        "district",
        "population_estimate",
        "occupancy_rate",
        "service_demand_index",
        "mobility_score",
        "resident_experience_score",
        "optimization_opportunity",
    ],
    "osm_amenities.csv": [
        "district",
        "category",
        "subtype",
        "name",
        "latitude",
        "longitude",
    ],
    "sample_listings.csv": [
        "district",
        "listing_id",
        "listing_type",
        "property_type",
        "size_sqm",
        "price_aed",
        "price_per_sqm_aed",
        "status",
        "latitude",
        "longitude",
    ],
    "sample_parcels.csv": [
        "district",
    ],
    "sample_transactions.csv": [
        "district",
        "date",
        "transaction_value_aed",
        "price_per_sqm",
    ],
}

CORE_FILES = [
    "districts.csv",
    "sample_communities.csv",
    "osm_amenities.csv",
]

OPTIONAL_FILES = [
    "sample_listings.csv",
    "sample_parcels.csv",
    "sample_transactions.csv",
    "sample_investors.csv",
]

# Dict keys returned by load_challenge_data()
FILE_TO_KEY: dict[str, str] = {
    "districts.csv": "districts",
    "sample_communities.csv": "communities",
    "osm_amenities.csv": "amenities",
    "sample_listings.csv": "listings",
    "sample_parcels.csv": "parcels",
    "sample_transactions.csv": "transactions",
    "sample_investors.csv": "investors",
}

# Minimum columns for optional supporting files when present.
SUPPORTING_MIN_COLUMNS: dict[str, list[str]] = {
    "sample_listings.csv": ["district"],
    "sample_parcels.csv": ["district"],
    "sample_transactions.csv": ["district"],
}

# Backward compatibility — all files that were once required together.
REQUIRED_FILES = CORE_FILES + [
    f for f in OPTIONAL_FILES if f != "sample_investors.csv"
]

# Warnings from the most recent :func:`load_challenge_data` call.
LAST_LOAD_WARNINGS: list[str] = []


class DataValidationError(ValueError):
    """Raised when a dataset fails schema or quality checks."""


@dataclass
class DatasetBundle:
    """Container for all loaded challenge CSVs."""

    districts: pd.DataFrame
    communities: pd.DataFrame
    amenities: pd.DataFrame
    listings: pd.DataFrame | None = None
    parcels: pd.DataFrame | None = None
    transactions: pd.DataFrame | None = None
    investors: pd.DataFrame | None = None


def clean_district_name(value: object) -> object:
    """
    Normalize a district label for joining.

    Trims whitespace and collapses internal runs of spaces.
    Empty results become NA.
    """
    if pd.isna(value):
        return pd.NA
    cleaned = " ".join(str(value).strip().split())
    return cleaned if cleaned else pd.NA


def clean_district_column(df: pd.DataFrame, column: str = "district") -> pd.DataFrame:
    """Return a copy of *df* with cleaned district names in *column*."""
    if column not in df.columns:
        return df.copy()
    out = df.copy()
    out[column] = out[column].map(clean_district_name)
    return out


def standardize_empty_strings(df: pd.DataFrame) -> pd.DataFrame:
    """Replace blank strings with NA in object/string columns."""
    out = df.copy()
    str_cols = out.select_dtypes(include=["object", "string"]).columns
    for col in str_cols:
        out[col] = out[col].replace(r"^\s*$", pd.NA, regex=True)
    return out


def _record_warning(message: str) -> None:
    """Store and print a non-fatal data loading warning."""
    LAST_LOAD_WARNINGS.append(message)
    print(f"Warning: {message}", file=sys.stderr)


def _validate_columns(
    path: Path,
    df: pd.DataFrame,
    required_columns: list[str],
) -> None:
    """Raise DataValidationError if any required column is missing."""
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise DataValidationError(
            f"{path.name} is missing required columns: {', '.join(missing)}"
        )


def _prepare_loaded_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Apply shared string and district cleaning to a loaded dataframe."""
    df = standardize_empty_strings(df)
    if "district" in df.columns:
        df = clean_district_column(df)
    return df


def _load_core_csv(path: Path, required_columns: list[str]) -> pd.DataFrame:
    """Load and strictly validate a core scoring CSV."""
    if not path.exists():
        raise DataValidationError(f"Missing required file: {path}")

    df = pd.read_csv(path)
    _validate_columns(path, df, required_columns)

    if df.empty:
        raise DataValidationError(f"{path.name} is empty")

    return _prepare_loaded_frame(df)


def _load_supporting_csv(path: Path, filename: str) -> pd.DataFrame | None:
    """
    Load an optional supporting CSV when present and usable.

    Returns ``None`` when the file is missing, empty, or lacks columns needed
    for safe downstream feature engineering.
    """
    if not path.exists():
        _record_warning(f"Optional file missing: {filename} - supporting context skipped.")
        return None

    df = pd.read_csv(path)
    if df.empty:
        _record_warning(f"{filename} is empty - supporting context skipped.")
        return None

    min_columns = SUPPORTING_MIN_COLUMNS.get(filename, ["district"])
    missing_min = [col for col in min_columns if col not in df.columns]
    if missing_min:
        _record_warning(
            f"{filename} is missing required join column(s) "
            f"{', '.join(missing_min)} - supporting context skipped."
        )
        return None

    preferred = REQUIRED_COLUMNS.get(filename, min_columns)
    missing_preferred = [col for col in preferred if col not in df.columns]
    if missing_preferred:
        _record_warning(
            f"{filename} is missing useful columns "
            f"({', '.join(missing_preferred)}) - supporting context skipped."
        )
        return None

    return _prepare_loaded_frame(df)


def _load_investors_csv(path: Path) -> pd.DataFrame | None:
    """Load optional investors CSV when present and non-empty."""
    if not path.exists():
        _record_warning("Optional file missing: sample_investors.csv - investors skipped.")
        return None

    df = pd.read_csv(path)
    if df.empty:
        _record_warning("sample_investors.csv is empty - investors skipped.")
        return None

    df = _prepare_loaded_frame(df)
    if "preferred_district" in df.columns:
        df = clean_district_column(df, "preferred_district")
    return df


def load_challenge_data(data_dir: str | Path = "data") -> dict[str, pd.DataFrame]:
    """
    Load and validate challenge CSV datasets.

    Core files (districts, communities, OSM amenities) are required.
    Supporting files (listings, parcels, transactions, investors) are optional.

    Parameters
    ----------
    data_dir:
        Path to the folder containing challenge CSVs (default: ``"data"``).

    Returns
    -------
    dict
        Keys: ``districts``, ``communities``, ``amenities``, and optionally
        ``listings``, ``parcels``, ``transactions``, ``investors``.

    Raises
    ------
    DataValidationError
        If a core file is missing, empty, or lacks required columns.
    """
    global LAST_LOAD_WARNINGS
    LAST_LOAD_WARNINGS = []

    root = Path(data_dir)
    if not root.is_dir():
        raise DataValidationError(f"Data directory does not exist: {root.resolve()}")

    result: dict[str, pd.DataFrame] = {}

    for filename in CORE_FILES:
        path = root / filename
        key = FILE_TO_KEY[filename]
        result[key] = _load_core_csv(path, REQUIRED_COLUMNS[filename])

    for filename in OPTIONAL_FILES:
        if filename == "sample_investors.csv":
            investors = _load_investors_csv(root / filename)
            if investors is not None:
                result["investors"] = investors
            continue

        path = root / filename
        key = FILE_TO_KEY[filename]
        frame = _load_supporting_csv(path, filename)
        if frame is not None:
            result[key] = frame

    return result


def load_core_datasets(
    data_dir: Path | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load the three core scoring datasets (backward-compatible wrapper)."""
    data = load_challenge_data(data_dir or DATA_DIR)
    return data["districts"], data["communities"], data["amenities"]


def load_all_datasets(data_dir: Path | None = None) -> DatasetBundle:
    """Load all datasets into a :class:`DatasetBundle` (backward-compatible wrapper)."""
    data = load_challenge_data(data_dir or DATA_DIR)
    return DatasetBundle(
        districts=data["districts"],
        communities=data["communities"],
        amenities=data["amenities"],
        listings=data.get("listings"),
        parcels=data.get("parcels"),
        transactions=data.get("transactions"),
        investors=data.get("investors"),
    )


def get_master_districts(districts: pd.DataFrame) -> list[str]:
    """Return sorted canonical district names from districts.csv."""
    return sorted(districts["district"].dropna().unique().tolist())


def _district_count(df: pd.DataFrame, key: str) -> int | str:
    """Count unique districts (or preferred_district for investors)."""
    if "district" in df.columns:
        return int(df["district"].dropna().nunique())
    if key == "investors" and "preferred_district" in df.columns:
        return int(df["preferred_district"].dropna().nunique())
    return "n/a"


def _filename_for_key(key: str) -> str:
    for filename, dict_key in FILE_TO_KEY.items():
        if dict_key == key:
            return filename
    return key


def main() -> None:
    """Print loaded file names, row counts, and district counts."""
    data = load_challenge_data(DATA_DIR)
    print(f"Data directory: {DATA_DIR.resolve()}\n")
    if LAST_LOAD_WARNINGS:
        print(f"Load warnings: {len(LAST_LOAD_WARNINGS)} (see stderr)\n")
    print(f"{'File':<30} {'Key':<15} {'Rows':>8}  {'Districts':>10}")
    print("-" * 68)
    for key, df in data.items():
        filename = _filename_for_key(key)
        rows = len(df)
        districts = _district_count(df, key)
        print(f"{filename:<30} {key:<15} {rows:>8}  {districts:>10}")

    loaded_keys = set(data.keys())
    for filename in OPTIONAL_FILES:
        key = FILE_TO_KEY[filename]
        if key not in loaded_keys:
            print(f"{filename:<30} {key:<15} {'-':>8}  {'-':>10}  (not loaded)")


if __name__ == "__main__":
    main()
