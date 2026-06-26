"""
Community Gap & Confidence Copilot — deterministic data layer.

Scores Abu Dhabi districts by comparing community need signals with real
OSM amenity coverage. No LLM, no external APIs, no database.

Run from repo root::

    python scripts/build_community_gap_data.py
    python scripts/check_community_gap_data.py
    python scripts/find_demo_districts.py
"""

from pathlib import Path

__version__ = "1.0.0"

# Repo paths (community_gap/ lives at repo root)
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
PROCESSED_DIR = REPO_ROOT / "processed"
DOCS_DIR = REPO_ROOT / "docs"

# Expected processed outputs (stable contract — see docs/data_handoff.md)
OUTPUT_JSON = PROCESSED_DIR / "community_gap_outputs.json"
OUTPUT_CSV = PROCESSED_DIR / "community_gap_scores.csv"

__all__ = [
    "__version__",
    "REPO_ROOT",
    "DATA_DIR",
    "PROCESSED_DIR",
    "DOCS_DIR",
    "OUTPUT_JSON",
    "OUTPUT_CSV",
]
