# Data Handoff — For Frontend & AI Teammates

**Project:** Community Gap & Confidence Copilot  
**Track:** Future Communities  
**Contract version:** 1.0.0

This doc explains what the data layer produces and how to use it without breaking the pipeline.

---

## 1. What I built

A **deterministic data/scoring layer** for Community Gap & Confidence Copilot.

It:

- Loads the official challenge CSVs
- Compares **community need signals** with **real OSM amenity coverage**
- Computes explainable scores and confidence (no LLM, no external APIs, no database)
- Generates evidence bullets and intervention recommendations
- Exports frontend-ready JSON

**Core idea:** scores and evidence come from the pipeline. The UI and LLM only **display and explain** them.

**Data grain:** each JSON district object is **one aggregated district row**. Community CSVs with multiple communities per district are rolled up before scoring (population summed, service demand population-weighted). OSM amenity counts and supporting context are already district-level.

**Code lives in:** `community_gap/`  
**Docs:** `docs/data_methodology.md`, `docs/data_inventory.md`, `docs/demo_districts.md`

---

## 2. Generated files

| File | Purpose |
|------|---------|
| `processed/community_gap_outputs.json` | **Main handoff** — 20 districts, full objects for UI + AI |
| `processed/community_gap_scores.csv` | Flat debug table for judges / quick inspection |

Regenerate both from repo root:

```bash
pip install -r requirements.txt
python scripts/build_community_gap_data.py
```

---

## 3. Frontend should use

```
processed/community_gap_outputs.json
```

**Suggested integration:**

1. Copy to `public/data/community_gap_outputs.json` (or import in `lib/`)
2. District dropdown → `payload.districts` or `payload.ranked_summary`
3. Detail panel → one district object matched by `district` name
4. Show `scores`, `classification`, `evidence_bullets`, `top_gap_drivers`

Top-level JSON also includes:

- `project`, `track`, `generated_at`, `methodology_version`
- `scoring_weights`
- `district_count`
- `ranked_summary` — lightweight leaderboard rows

---

## 4. Important fields (per district)

Each item in `districts[]` has:

| Field | What it is |
|-------|------------|
| `district` | District name (join key) |
| `community_metrics` | Demand, mobility, experience, population |
| `amenity_counts` | Real OSM counts by category |
| `supporting_context` | Listings, transactions, parcels (supporting only) |
| `scores` | All 0–100 deterministic scores |
| `classification` | Gap level, confidence, intervention label |
| `evidence_bullets` | Short demo-friendly evidence list |
| `top_gap_drivers` | Main reasons the district was flagged |

Also useful for UI:

- `area_type`, `profile`, `location` (lat/lon for maps)
- `rank` — intervention priority (1 = highest gap)

### `scores` object

| Key | Meaning |
|-----|---------|
| `community_need_score` | How much the community needs services |
| `amenity_adequacy_score` | OSM coverage vs city medians |
| `amenity_shortage_score` | `100 − adequacy` |
| `market_pressure_score` | Listing/transaction activity (supporting) |
| `intervention_feasibility_score` | Parcels + infrastructure (supporting) |
| `community_gap_score` | **Main rank** — need + shortage dominate |
| `confidence_score` | Evidence agreement (0–100) |
| `data_completeness_score` | % of core fields present |

### `classification` object

| Key | Values |
|-----|--------|
| `gap_level` | `High`, `Medium`, `Low` |
| `confidence_level` | `High`, `Medium`, `Low` |
| `confidence_reason` | One-sentence explanation |
| `recommended_intervention_category` | e.g. `Education capacity` |
| `recommendation_priority` | `High`, `Medium`, `Low` |

---

## 5. AI teammate — pass these fields to the LLM

When calling the LLM for narrative / copilot text, send **only**:

```json
{
  "district": "...",
  "community_metrics": { ... },
  "amenity_counts": { ... },
  "scores": { ... },
  "classification": { ... },
  "evidence_bullets": [ ... ],
  "top_gap_drivers": [ ... ]
}
```

Do **not** need to send raw CSVs or the full 20-district payload unless doing a comparison prompt.

`supporting_context` is optional for the LLM — include only if the prompt needs market/feasibility colour.

---

## 6. Important AI guardrail

**The LLM must not invent data or calculate scores.**

It should only:

- Summarize the district situation in plain language
- Explain why the pipeline flagged the district
- Rephrase `evidence_bullets` and `confidence_reason`
- Suggest next steps for a decision-maker

It must **not**:

- Make up amenity counts, population, or scores
- Re-rank districts
- Override `confidence_level` or `recommended_intervention_category`
- Present itself as the source of the numbers

The data pipeline is the source of truth. The LLM is the interpreter.

---

## 7. Commands

From **repo root**:

```bash
# Build JSON + CSV
python scripts/build_community_gap_data.py

# Validate output shape and scores
python scripts/check_community_gap_data.py

# Pick demo districts + update docs/demo_districts.md
python scripts/find_demo_districts.py
```

Optional module smoke tests:

```bash
python -m community_gap.data_loader
python -m community_gap.features
```

---

## 8. Example district object

Highest-gap district from the current build (**Al Ghadeer**):

```json
{
  "district": "Al Ghadeer",
  "area_type": "border",
  "profile": "affordable",
  "location": {
    "latitude": 24.3,
    "longitude": 54.78
  },
  "community_metrics": {
    "population_estimate": 77098,
    "occupancy_rate": 0.91,
    "service_demand_index": 78,
    "mobility_score": 45,
    "resident_experience_score": 69
  },
  "amenity_counts": {
    "education": 0,
    "healthcare": 1,
    "retail": 14,
    "services": 0,
    "community": 10,
    "mobility": 1,
    "total_amenities": 26,
    "amenity_diversity_count": 4
  },
  "supporting_context": {
    "listing_count": 315,
    "available_listing_count": 211,
    "rent_listing_count": 203,
    "sale_listing_count": 112,
    "transaction_count": 281,
    "parcel_count": 27,
    "vacant_or_available_parcel_count": 13
  },
  "scores": {
    "community_need_score": 61,
    "amenity_adequacy_score": 10,
    "amenity_shortage_score": 90,
    "market_pressure_score": 93,
    "intervention_feasibility_score": 52,
    "community_gap_score": 74,
    "confidence_score": 88,
    "data_completeness_score": 100
  },
  "classification": {
    "gap_level": "Medium",
    "confidence_level": "High",
    "confidence_reason": "High confidence: multiple demand, experience, mobility, amenity, and market signals point in the same direction.",
    "recommended_intervention_category": "Education capacity",
    "recommendation_priority": "Medium"
  },
  "evidence_bullets": [
    "Service demand is above the city median (78 vs 60).",
    "Mobility score is below the city median (45 vs 76).",
    "Resident experience is weaker than the city median (69 vs 90).",
    "Education amenity coverage is below the city median (0 OSM amenities vs median 10).",
    "Healthcare amenity coverage is below the city median (1 OSM amenities vs median 10).",
    "Mobility-related amenities are limited compared with other districts (1 OSM vs median 19).",
    "Residential listing activity suggests added community pressure (315 listings in district)."
  ],
  "top_gap_drivers": [
    "Service demand",
    "Mobility weakness",
    "Resident experience",
    "Education shortage",
    "Healthcare shortage",
    "Mobility amenity shortage",
    "Market pressure"
  ],
  "rank": 1
}
```

---

## Quick reference

| Teammate | Read this | Use this file |
|----------|-----------|---------------|
| Frontend | Sections 3–4 | `processed/community_gap_outputs.json` |
| AI / copilot | Sections 5–6 | One district object per prompt |
| Demo video | `docs/demo_districts.md` | Pre-selected walkthrough districts |
| Debugging | `processed/community_gap_scores.csv` | Spreadsheet-friendly |

**Questions?** Check `docs/data_methodology.md` for scoring formulas or run the check script to validate your local JSON.
