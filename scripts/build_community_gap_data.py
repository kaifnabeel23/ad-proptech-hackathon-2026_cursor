#!/usr/bin/env python3
"""
Build processed community gap outputs from challenge CSVs.

Run from repo root::

    python scripts/build_community_gap_data.py

Writes:
  - processed/community_gap_outputs.json
  - processed/community_gap_scores.csv
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow imports when run as: python scripts/build_community_gap_data.py
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from community_gap.data_loader import DataValidationError  # noqa: E402
from community_gap.export import export_outputs  # noqa: E402


def main() -> int:
    try:
        export_outputs(
            data_dir=REPO_ROOT / "data",
            output_json=REPO_ROOT / "processed" / "community_gap_outputs.json",
            output_csv=REPO_ROOT / "processed" / "community_gap_scores.csv",
        )
        print("\nDone. Full pipeline complete.")
    except DataValidationError as exc:
        print(f"Data validation error: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"Build failed: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Build failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
