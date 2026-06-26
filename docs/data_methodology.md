# Data & Scoring Methodology

**Project:** Community Gap & Confidence Copilot  
**Track:** Future Communities — Abu Dhabi AI PropTech Challenge  
**Version:** 1.0.0

This document explains how we turn challenge datasets into district scores, confidence levels, and evidence. All logic is deterministic Python (`community_gap/`). The same inputs always produce the same outputs.

---

## 1. Data sources

| Dataset | Role |
|---------|------|
| `sample_communities.csv` | Community demand, mobility, resident experience, population, and occupancy |
| `districts.csv` | District metadata and location |
| `osm_amenities.csv` | Real OpenStreetMap amenity coverage |
| `sample_listings.csv` | Residential activity context |
| `sample_parcels.csv` | Intervention feasibility context |
| `sample_transactions.csv` | Market activity context |

**Core inputs** (community need + amenity supply) drive the main gap score. **Supporting inputs** (listings, transactions, parcels) add context and secondary scores but do not override the need-vs-coverage comparison.

District names are normalized and joined across files. Community records in `sample_communities.csv` are **aggregated to one row per district** (population summed, demand population-weighted) before scoring. See `docs/data_inventory.md` for column-level detail and join quality.

---

## 2. Core idea

The main score answers a simple planning question:

> **Where does community need outpace real amenity coverage?**

We compare **how much a district needs services** (demand, mobility, resident experience, population pressure) against **what is actually on the ground** (OSM amenity counts by category, benchmarked to city medians).

High `community_gap_score` means need is elevated and amenity supply is comparatively weak — not that the district is “bad,” but that it may warrant targeted intervention.

---

## 3. Core scores

All scores are on a **0–100** scale. Higher always means *more* of that quantity (more need, more shortage, more pressure, etc.).

### `community_need_score`

How strongly community signals point toward elevated service demand.

Built from:

- Service demand index (40%)
- Weak mobility — inverted mobility score (20%)
- Weak resident experience — inverted experience score (20%)
- Population percentile within the city (10%)
- Occupancy rate, percentile-normalized (10%)

**Higher = greater community need.**

### `amenity_adequacy_score`

How well OSM amenity coverage compares to city medians, category by category.

Categories weighted: education and healthcare (22% each), mobility amenities (20%), community (16%), retail and services (10% each). Each category score is `min(district count ÷ city median, 1.5) ÷ 1.5 × 100`.

**Higher = better real-world coverage.**

### `amenity_shortage_score`

The inverse of adequacy:

```
amenity_shortage_score = 100 − amenity_adequacy_score
```

**Higher = larger amenity gap.**

### `market_pressure_score`

Supporting signal from residential market activity: listing volume, available listings, transaction count, and active listing share. Percentile-normalized across districts.

**Higher = more market activity / pressure.** This is context, not a pricing model.

### `intervention_feasibility_score`

Supporting signal from infrastructure score plus parcel data (vacant/available parcels, development potential) when present.

**Higher = more feasible to act.** Shown separately; it does **not** inflate the main gap rank.

### `community_gap_score` *(primary rank)*

Weighted blend of need, shortage, and a small market context term:

```
community_gap_score =
    0.55 × community_need_score
  + 0.35 × amenity_shortage_score
  + 0.10 × market_pressure_score
```

**Need + shortage = 90%** of the gap score. Feasibility is reported alongside the rank so decision-makers can pair *where* to intervene with *whether* delivery looks practical.

**Gap level bands:**

| Level | Score range |
|-------|-------------|
| High | 75–100 |
| Medium | 50–74 |
| Low | below 50 |

---

## 4. Confidence

**Confidence is not an ML probability.** It does not come from a trained classifier or a softmax output.

Instead, it measures **how many independent evidence signals agree** that a district has a meaningful gap:

| Signal | Fires when… |
|--------|-------------|
| High service demand | Above city median |
| Weak mobility | Below city median |
| Weak resident experience | Below city median |
| Low education amenities | OSM count below city median |
| Low healthcare amenities | OSM count below city median |
| Low mobility amenities | OSM count below city median |
| High market pressure | Market score ≥ 60 |
| Need and shortage agree | `community_need_score` and `amenity_shortage_score` both ≥ city median |

**Agreement count → level:**

| Signals agreeing | `confidence_level` |
|------------------|-------------------|
| 6–8 | High |
| 3–5 | Medium |
| 0–2 | Low |

A `confidence_score` (0–100) is the agreement count expressed as a percentage of the eight signals.

**Data completeness guardrail:** if core fields are missing for a district (`data_completeness_score` < 80%), confidence is capped at **Medium** even when signals align — sparse data should not read as certainty.

The UI and LLM may **explain** confidence; they must never **override** it.

---

## 5. AI guardrail

AI is used only to **summarize and recommend in plain language** based on structured evidence already produced by the pipeline.

The deterministic scoring layer:

- Computes all scores
- Sets gap and confidence levels
- Generates `evidence_bullets` and `top_gap_drivers`
- Suggests an intervention category

The LLM receives that structured object and narrates it for decision-makers. It must **not** invent metrics, recalculate scores, or re-rank districts. Numbers and classifications in the JSON are the source of truth.

---

## 6. Why this is honest

The system is designed to be **transparent about limits**, not to overclaim:

- **Decomposed scores** — judges and users can see need, adequacy, shortage, market, and feasibility separately instead of one opaque number.
- **Evidence bullets** — every flag ties back to a measurable comparison (e.g. district value vs city median).
- **Explicit uncertainty** — when signals genuinely disagree, `confidence_level` drops and `top_gap_drivers` may include Mixed evidence; `confidence_reason` is district-specific.
- **Completeness check** — districts with sparse core data cannot receive High confidence.
- **Supporting vs core** — listings and parcels inform context and feasibility; they do not dominate the need-vs-coverage story.

We would rather show “medium confidence, mixed evidence” than pretend certainty where the data does not support it.

---

## 7. OpenStreetMap attribution

Amenity coverage is derived from **OpenStreetMap** data via `osm_amenities.csv`.

> © OpenStreetMap contributors  
> Data available under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright).

Any public demo, slide, or UI that displays amenity maps or counts should include OSM attribution.

---

## Pipeline reference

```
data_loader → features → pipeline (scoring → evidence) → export
```

**Build output:** `python scripts/build_community_gap_data.py`  
**Validate:** `python scripts/check_community_gap_data.py`  
**Teammate handoff:** `docs/data_handoff.md`
