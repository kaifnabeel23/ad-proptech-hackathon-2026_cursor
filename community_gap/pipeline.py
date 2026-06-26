"""
End-to-end deterministic pipeline orchestration.

Load challenge CSVs → district features → scores → confidence → evidence → export.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from community_gap.data_loader import load_challenge_data
from community_gap.evidence import add_evidence, add_recommendations
from community_gap.features import build_full_feature_dataset
from community_gap.scoring import add_confidence, add_scores

GAP_SCORE_COLUMN = "community_gap_score"
DISTRICT_COLUMN = "district"


def rank_districts_by_gap(df: pd.DataFrame) -> pd.DataFrame:
    """Sort by community_gap_score descending and assign intervention_rank (1 = highest)."""
    ranked = df.sort_values(GAP_SCORE_COLUMN, ascending=False).reset_index(drop=True)
    ranked["intervention_rank"] = range(1, len(ranked) + 1)
    return ranked


def one_row_per_district(df: pd.DataFrame) -> pd.DataFrame:
    """
    Return one row per district.

    Feature engineering already aggregates communities to district level; this
    deduplicates safely if duplicate district rows ever appear.
    """
    if DISTRICT_COLUMN not in df.columns:
        return df.copy()
    return (
        df.sort_values(GAP_SCORE_COLUMN, ascending=False)
        .drop_duplicates(subset=DISTRICT_COLUMN, keep="first")
        .reset_index(drop=True)
    )


def run_full_pipeline(data_dir: str | Path = "data") -> pd.DataFrame:
    """
    Run the full scoring pipeline from challenge CSVs.

    Steps: load → district features → scores → confidence → evidence → recommendations.
    """
    raw = load_challenge_data(data_dir)
    features = build_full_feature_dataset(raw)
    scored = add_scores(features)
    scored = add_confidence(scored)
    scored = add_evidence(scored)
    scored = add_recommendations(scored)
    return rank_districts_by_gap(scored)
