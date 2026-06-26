#!/usr/bin/env python3
"""
Build processed community gap outputs from challenge CSVs.

Run from the starter-kit repo root::

    python scripts/build_community_gap_data.py

Writes:
  - processed/community_gap_outputs.json
  - processed/community_gap_scores.csv
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from community_gap.data_loader import DataValidationError, LAST_LOAD_WARNINGS  # noqa: E402
from community_gap.export import export_outputs  # noqa: E402

DATA_DIR = REPO_ROOT / "data"
OUTPUT_JSON = REPO_ROOT / "processed" / "community_gap_outputs.json"
OUTPUT_CSV = REPO_ROOT / "processed" / "community_gap_scores.csv"


def main() -> int:
    """Run the full export pipeline and write processed outputs."""
    print("Community Gap & Confidence Copilot")
    print("Building processed outputs...\n")

    try:
        export_outputs(
            data_dir=DATA_DIR,
            output_json=OUTPUT_JSON,
            output_csv=OUTPUT_CSV,
        )
    except DataValidationError as exc:
        print(f"\nData validation error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"\nBuild failed: {exc}", file=sys.stderr)
        return 1

    if LAST_LOAD_WARNINGS:
        print(f"\n{len(LAST_LOAD_WARNINGS)} optional data warning(s) during load (see stderr).")

    print("\nBuild complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
