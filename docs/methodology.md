# Methodology — Community Gap & Confidence Copilot

**Track:** Future Communities  
**Version:** 1.0.0  
**Pipeline:** `python -m pipeline.run`

This document explains how the deterministic scoring layer works. All scores are computed from the official challenge CSVs — no LLM, no external APIs, no database.

---

## 1. Purpose

The pipeline answers four questions for each Abu Dhabi district:

1. **Which district needs intervention?** — ranked by `community_gap_score`
2. **What is missing?** — weakest OSM amenity category + recommended intervention label
3. **Why do we believe that?** — evidence bullets tied to metrics
4. **How much should a decision-maker trust it?** — `confidence_level` with explanation

The main differentiator is **evidence + confidence**, not opaque AI recommendations.

---

## 2. Data Sources

| Dataset | Role | Weight in core gap |
|---------|------|-------------------|
| `sample_communities.csv` | Community need signals | **Core** |
| `districts.csv` | District metadata, infrastructure | Context |
| `osm_amenities.csv` | Real amenity coverage (OSM) | **Core** |
| `sample_listings.csv` | Market activity context | Supporting (5%) |
| `sample_parcels.csv` | Intervention feasibility | Supporting (5%) |
| `sample_transactions.csv` | Market activity context | Supporting (via market score) |

`sample_investors.csv` is intentionally excluded — it does not strengthen the community-gap story.

---

## 3. Pipeline Steps

```
Load CSVs → Validate schemas → Clean district names → Aggregate by district
    → Count OSM amenities → Build supporting context → Compute scores
    → Generate evidence → Recommend intervention → Export JSON + CSV
```

### 3.1 District name cleaning

District labels are trimmed, whitespace-normalized, alias-mapped (e.g. "MBZ City" → "Mohammed Bin Zayed City"), and validated against `districts.csv` as the master list.

### 3.2 Community aggregation

Multiple community rows per district are rolled up:

- **Population** — sum
- **Occupancy, mobility, experience** — mean
- **Service demand** — population-weighted mean
- **Optimization opportunity** — statistical mode (tie-breaker for recommendations)

### 3.3 Amenity counting

Real OSM amenities are counted per district across six categories:

`education`, `healthcare`, `mobility`, `retail`, `community`, `services`

Counts are normalized to **amenities per 10,000 residents** so large and small districts are comparable.

---

## 4. Scoring Formulas

All component scores are on a **0–100** scale unless noted.

### 4.1 Community Need Score

Measures demand pressure and resident strain. **Higher = more need.**

| Input | Weight | Direction |
|-------|--------|-----------|
| `service_demand_index` | 30% | Higher increases need |
| `100 − mobility_score` | 25% | Lower mobility increases need |
| `100 − resident_experience_score` | 20% | Lower experience increases need |
| Population percentile (across districts) | 15% | Larger population increases need |
| `occupancy_rate × 100` | 10% | Higher occupancy increases need |

### 4.2 Amenity Adequacy Score

For each amenity category:

```
adequacy_category = min(100, (district_per_10k / city_median_per_10k) × 100)
```

`amenity_adequacy_score` = mean of the six category adequacy scores.

### 4.3 Amenity Shortage Score

```
amenity_shortage_score = 100 − amenity_adequacy_score
```

**Higher = worse coverage relative to peer districts.**

### 4.4 Market Pressure Score (supporting)

Percentile-based blend of:

- Listings per 10k residents (45%)
- Transactions per 10k residents (35%)
- Average listing price per sqm (20%)

### 4.5 Intervention Feasibility Score (supporting)

Blend of:

- Vacant / under-development parcel count percentile (35%)
- Average development potential score (30%)
- District infrastructure score (20%)
- Community-zoned parcel count percentile (15%)

### 4.6 Community Gap Score (primary output)

**Community need + amenity shortage dominate:**

| Component | Weight |
|-----------|--------|
| Community need | **55%** |
| Amenity shortage | **35%** |
| Market pressure | 5% |
| Intervention feasibility | 5% |

```
community_gap_score = 0.55×need + 0.35×shortage + 0.05×market + 0.05×feasibility
```

Districts are ranked by this score (descending).

---

## 5. Confidence Logic

Confidence reflects **evidence quality**, not model certainty.

### High

- `community_need_score ≥ 60`
- `amenity_shortage_score ≥ 55`
- ≥ 2 amenity categories with shortage ≥ 40 (and ≥ 5 OSM observations each)
- ≥ 15 total OSM amenities in district
- ≥ 3 aligned signals (elevated demand, weak mobility, weak experience, or high shortage)

### Medium

- Partial alignment of need and shortage signals
- At least one weak amenity category with sufficient observations
- ≥ 2 aligned signals

### Low

- Sparse, mixed, or contradictory evidence
- Recommends field validation before major decisions

---

## 6. Intervention Recommendation

1. Compute per-category shortage (100 − adequacy).
2. Weight categories using community signals (e.g. low mobility boosts mobility weight).
3. Pick the category with the highest **weighted shortage**.
4. If the district's dominant `optimization_opportunity` from community data points to a similar gap (within 15% of top weighted shortage), use it as a tie-breaker.

Intervention keys map to human labels, e.g. `mobility_infrastructure` → "Accelerate transit and mobility links".

---

## 7. Evidence Bullets

Each district receives deterministic bullets covering:

- Service demand vs city median
- Mobility and resident experience vs median
- Population and community count
- Top 3 weak amenity categories with OSM counts and per-10k rates
- Combined need + shortage → gap score
- Optional market and feasibility context

These bullets are designed to feed the LLM interpretation layer — the LLM summarizes; it does **not** invent scores.

---

## 8. Outputs

| File | Purpose |
|------|---------|
| `output/district_scores.json` | Frontend-ready district objects with scores, evidence, recommendations |
| `output/district_scores_summary.csv` | Flat table for debugging and judge review |

### Run

```bash
pip install -r requirements.txt
python -m pipeline.run
```

Optional flags: `--data-dir ./data` `--output-dir ./output`

---

## 9. Design Principles

1. **Deterministic** — same inputs always produce same outputs
2. **Explainable** — every score decomposes to visible metrics
3. **Evidence-first** — recommendations cite OSM counts and community indices
4. **Honest uncertainty** — confidence badge downgrades weak or mixed signals
5. **No overpowering context** — listings/parcels/transactions capped at 10% of gap score combined

---

## 10. Limitations (for judges)

- Community metrics are **synthetic** challenge data; OSM amenities are **real** but may be incomplete in sparse districts.
- Per-capita normalization assumes population estimates are reasonable proxies for service load.
- The pipeline identifies **statistical gaps**, not ground-truth service quality (e.g. clinic capacity vs clinic pin count).
- Low-confidence districts should trigger human site visits, not automatic capital allocation.
