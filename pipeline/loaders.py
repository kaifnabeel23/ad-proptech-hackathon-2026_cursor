"""Load and validate challenge CSV datasets."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from pipeline.config import DATA_DIR, REQUIRED_COLUMNS


@dataclass(frozen=True)
class DatasetBundle:
    communities: pd.DataFrame
    districts: pd.DataFrame
    amenities: pd.DataFrame
    listings: pd.DataFrame
    parcels: pd.DataFrame
    transactions: pd.DataFrame


class DataValidationError(ValueError):
    """Raised when a dataset fails schema or quality checks."""


def _validate_file(path: Path, required_columns: list[str]) -> pd.DataFrame:
    if not path.exists():
        raise DataValidationError(f"Missing required file: {path}")

    df = pd.read_csv(path)
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise DataValidationError(
            f"{path.name} is missing required columns: {', '.join(missing)}"
        )

    if df.empty:
        raise DataValidationError(f"{path.name} is empty")

    return df


def load_datasets(data_dir: Path | None = None) -> DatasetBundle:
    """Load all pipeline datasets and validate required columns."""
    root = data_dir or DATA_DIR

    communities = _validate_file(
        root / "sample_communities.csv",
        REQUIRED_COLUMNS["sample_communities.csv"],
    )
    districts = _validate_file(
        root / "districts.csv",
        REQUIRED_COLUMNS["districts.csv"],
    )
    amenities = _validate_file(
        root / "osm_amenities.csv",
        REQUIRED_COLUMNS["osm_amenities.csv"],
    )
    listings = _validate_file(
        root / "sample_listings.csv",
        REQUIRED_COLUMNS["sample_listings.csv"],
    )
    parcels = _validate_file(
        root / "sample_parcels.csv",
        REQUIRED_COLUMNS["sample_parcels.csv"],
    )
    transactions = _validate_file(
        root / "sample_transactions.csv",
        REQUIRED_COLUMNS["sample_transactions.csv"],
    )

    _validate_numeric_ranges(communities, districts, amenities)

    return DatasetBundle(
        communities=communities,
        districts=districts,
        amenities=amenities,
        listings=listings,
        parcels=parcels,
        transactions=transactions,
    )


def _validate_numeric_ranges(
    communities: pd.DataFrame,
    districts: pd.DataFrame,
    amenities: pd.DataFrame,
) -> None:
    for col in ("service_demand_index", "mobility_score", "resident_experience_score"):
        if not communities[col].between(0, 100).all():
            raise DataValidationError(
                f"sample_communities.csv: {col} must be between 0 and 100"
            )

    if not communities["occupancy_rate"].between(0, 1).all():
        raise DataValidationError(
            "sample_communities.csv: occupancy_rate must be between 0 and 1"
        )

    if communities["population_estimate"].lt(0).any():
        raise DataValidationError(
            "sample_communities.csv: population_estimate cannot be negative"
        )

    if not districts["infrastructure_score"].between(0, 100).all():
        raise DataValidationError(
            "districts.csv: infrastructure_score must be between 0 and 100"
        )

    invalid_categories = set(amenities["category"].unique()) - {
        "education",
        "healthcare",
        "mobility",
        "retail",
        "community",
        "services",
    }
    if invalid_categories:
        raise DataValidationError(
            f"osm_amenities.csv: unknown categories: {sorted(invalid_categories)}"
        )
