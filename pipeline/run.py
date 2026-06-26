"""Main entry point for the Community Gap & Confidence Copilot data pipeline."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pipeline.aggregators import (
    aggregate_community_signals,
    build_district_base,
    build_supporting_context,
    count_amenities_by_district,
)
from pipeline.cleaners import apply_district_cleaning
from pipeline.exporters import build_frontend_payload, export_csv_summary, export_json
from pipeline.loaders import DataValidationError, load_datasets
from pipeline.scoring import apply_all_scores


def run_pipeline(data_dir: Path | None = None, output_dir: Path | None = None) -> dict:
    bundle = load_datasets(data_dir)

    (
        communities,
        districts,
        amenities,
        listings,
        parcels,
        transactions,
    ) = apply_district_cleaning(
        bundle.communities,
        bundle.districts,
        bundle.amenities,
        bundle.listings,
        bundle.parcels,
        bundle.transactions,
    )

    community_agg = aggregate_community_signals(communities)
    amenity_counts = count_amenities_by_district(amenities)
    supporting = build_supporting_context(
        listings,
        parcels,
        transactions,
        community_agg.set_index("district")["population_estimate"],
    )

    base = build_district_base(districts, community_agg, amenity_counts, supporting)
    scored, _, _ = apply_all_scores(base)

    payload = build_frontend_payload(scored)
    json_path = export_json(payload, output_dir)
    csv_path = export_csv_summary(scored, output_dir)

    print(f"Wrote frontend JSON: {json_path}")
    print(f"Wrote debug CSV:     {csv_path}")
    print(f"Districts scored:    {len(scored)}")
    print("Top 5 intervention priorities:")
    for _, row in scored.head(5).iterrows():
        print(
            f"  {int(row['intervention_rank'])}. {row['district']} — "
            f"gap {row['community_gap_score']:.1f} "
            f"({row['confidence_level']} confidence)"
        )

    return payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Community Gap & Confidence Copilot — deterministic scoring pipeline"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=None,
        help="Path to CSV data directory (default: ./data)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Path for JSON/CSV outputs (default: ./output)",
    )
    args = parser.parse_args(argv)

    try:
        run_pipeline(args.data_dir, args.output_dir)
    except DataValidationError as exc:
        print(f"Validation error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Pipeline failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
