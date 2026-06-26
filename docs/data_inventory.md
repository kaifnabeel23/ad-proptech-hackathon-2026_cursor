# Data Inventory — Community Gap & Confidence Copilot

**Generated:** 2026-06-26  
**Data path:** `data/`  
**Master district list:** `districts.csv` (20 districts)

This inventory documents every challenge CSV used by the project, join quality on the `district` column, and how each file should feed the scoring layer.

---

## Summary

| File | Rows | Unique districts | Lat/Lon | Role |
|------|------|------------------|---------|------|
| `districts.csv` | 20 | 20 | Yes | **Core** (master reference) |
| `sample_communities.csv` | 90 | 20 | No | **Core** (community need signals) |
| `osm_amenities.csv` | 3,155 | 20 | Yes | **Core** (real amenity coverage) |
| `sample_listings.csv` | 6,000 | 20 | Yes | **Supporting** (market context) |
| `sample_parcels.csv` | 600 | 20 | No | **Supporting** (feasibility context) |
| `sample_transactions.csv` | 5,000 | 20 | No | **Supporting** (market context) |
| `sample_investors.csv` | 200 | 20* | No | **Optional** (not used in scoring) |

\* `sample_investors.csv` has no `district` column; it uses `preferred_district` with 20 unique values matching the master list.

**Join health:** All district-keyed files align perfectly with `districts.csv` — no orphan district names, no missing districts, no whitespace or casing mismatches.

---

## File-by-file inventory

### 1. `districts.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 20 |
| **Unique districts** | 20 (one row per district) |
| **Latitude / longitude** | Yes — `latitude`, `longitude` (district centroids) |
| **Project role** | **Core** — master district dimension table |

**Columns:**

`district`, `area_type`, `profile`, `base_sale_aed_sqm`, `gross_yield_pct`, `infrastructure_score`, `latitude`, `longitude`, `established_year`

**Missing values by column:**

None — all 20 rows complete.

**Join notes:**

- Serves as the canonical district list for all joins.
- No duplicate `district` values.
- Provides metadata (`area_type`, `profile`, `infrastructure_score`) and map centroids for the frontend.

---

### 2. `sample_communities.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 90 |
| **Unique districts** | 20 |
| **Latitude / longitude** | No |
| **Project role** | **Core** — drives `community_need_score` |

**Columns:**

`community_id`, `district`, `population_estimate`, `occupancy_rate`, `service_demand_index`, `mobility_score`, `resident_experience_score`, `optimization_opportunity`

**Missing values by column:**

None.

**Join notes:**

- All 20 districts in this file exist in `districts.csv`. **0 orphans.**
- All 20 master districts are represented. **0 missing.**
- **Aggregation required:** 18 of 20 districts have multiple community rows (1–9 per district; avg 4.5). Pipeline must roll up to district level before joining.
- `optimization_opportunity` has 12 distinct values (e.g. `accelerate_transit_link`, `add_clinic_capacity`) — useful as a recommendation tie-breaker, not a primary score driver.
- No `community` name column — only `community_id` + `district`.

---

### 3. `osm_amenities.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 3,155 |
| **Unique districts** | 20 |
| **Latitude / longitude** | Yes — per-amenity coordinates |
| **Project role** | **Core** — drives `amenity_adequacy_score` / `amenity_shortage_score` |

**Columns:**

`amenity_id`, `category`, `subtype`, `name`, `latitude`, `longitude`, `district`

**Missing values by column:**

None.

**Category distribution:**

| Category | Count |
|----------|-------|
| community | 985 |
| mobility | 618 |
| healthcare | 527 |
| retail | 458 |
| services | 316 |
| education | 251 |

**Join notes:**

- All 20 districts match `districts.csv`. **0 orphans, 0 missing.**
- Counts per district range from 26 (Al Ghadeer) to 679 (Al Khalidiyah); avg ~158.
- This is **real OpenStreetMap data** — primary credibility layer for evidence bullets.
- Many `name` values are `(unnamed …)` — count by `category`/`subtype`, not by name.
- Suitable for map overlays using row-level lat/lon.

---

### 4. `sample_listings.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 6,000 |
| **Unique districts** | 20 |
| **Latitude / longitude** | Yes — per-listing coordinates |
| **Project role** | **Supporting** — market pressure context only (max 5% of gap score) |

**Columns:**

`listing_id`, `district`, `community`, `listing_type`, `property_type`, `bedrooms`, `bathrooms`, `size_sqm`, `price_aed`, `price_per_sqm_aed`, `furnished`, `amenities`, `latitude`, `longitude`, `listed_date`, `status`, `agency_type`

**Missing values by column:**

None.

**Join notes:**

- All 20 districts match `districts.csv`. **0 orphans, 0 missing.**
- Evenly distributed: 265–353 listings per district (avg 300).
- `community` is a sub-district label (e.g. "Al Bateen Park") — **not joinable** to a master community table; use only for display or future drill-down.
- `amenities` column describes **property features** (pool, gym, etc.) — distinct from OSM public amenities; do not merge with `osm_amenities.csv`.
- Synthetic market data — supports narrative ("active residential market") but must not overpower community + OSM logic.

---

### 5. `sample_parcels.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 600 |
| **Unique districts** | 20 |
| **Latitude / longitude** | No |
| **Project role** | **Supporting** — intervention feasibility context (max 5% of gap score) |

**Columns:**

`parcel_id`, `district`, `zone`, `land_use`, `parcel_size_sqm`, `current_status`, `infrastructure_score`, `development_potential_score`, `estimated_value_aed`, `recommended_use`

**Missing values by column:**

None.

**Join notes:**

- All 20 districts match `districts.csv`. **0 orphans, 0 missing.**
- 20–42 parcels per district (avg 30).
- `current_status` values include `vacant`, `under_development`, `developed` — useful for feasibility evidence.
- `land_use` includes `community`, `residential`, `commercial`, etc. — supports "where could intervention land?" story.
- No coordinates — cannot map parcels without geocoding; district-level aggregation only.

---

### 6. `sample_transactions.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 5,000 |
| **Unique districts** | 20 |
| **Latitude / longitude** | No |
| **Project role** | **Supporting** — market activity context (feeds market pressure score) |

**Columns:**

`transaction_id`, `date`, `district`, `asset_type`, `transaction_value_aed`, `size_sqm`, `price_per_sqm`, `buyer_type`

**Missing values by column:**

None.

**Join notes:**

- All 20 districts match `districts.csv`. **0 orphans, 0 missing.**
- 219–282 transactions per district (avg 250).
- Date range spans 2023 — useful for volume/density signals, not time-series forecasting in MVP.
- `asset_type` (apartment, villa, retail, office, etc.) can enrich evidence bullets but should not drive the main gap score.

---

### 7. `sample_investors.csv`

| Attribute | Value |
|-----------|-------|
| **Row count** | 200 |
| **Unique districts** | 20 (via `preferred_district`) |
| **Latitude / longitude** | No |
| **Project role** | **Optional** — excluded from current pipeline |

**Columns:**

`investor_id`, `investor_type`, `preferred_sector`, `preferred_district`, `capital_range_aed`, `risk_profile`, `investment_horizon`, `strategic_fit_score`

**Missing values by column:**

None.

**Join notes:**

- Uses `preferred_district`, not `district`. All 20 preferred districts match `districts.csv`. **0 orphans.**
- All 20 master districts appear at least once in investor preferences.
- Oriented toward **Investment Intelligence** track — does not strengthen the community-gap narrative.
- `capital_range_aed` is a string bucket (e.g. `15M-60M`), not numeric — awkward for scoring without parsing.
- **Recommendation:** skip unless demo explicitly needs an "investor interest" footnote.

---

## Join quality

Master list: **20 districts** in `districts.csv`.

### Districts in child files but not in `districts.csv`

| Source file | Orphan districts |
|-------------|------------------|
| `sample_communities.csv` | **None** |
| `osm_amenities.csv` | **None** |
| `sample_listings.csv` | **None** |
| `sample_parcels.csv` | **None** |
| `sample_transactions.csv` | **None** |
| `sample_investors.csv` (`preferred_district`) | **None** |

### Districts in `districts.csv` but missing from child files

| Source file | Missing districts |
|-------------|-------------------|
| `sample_communities.csv` | **None** |
| `osm_amenities.csv` | **None** |
| `sample_listings.csv` | **None** |
| `sample_parcels.csv` | **None** |
| `sample_transactions.csv` | **None** |

### Other join considerations

| Issue | Severity | Mitigation |
|-------|----------|------------|
| Multiple community rows per district | Expected | Aggregate (sum population, weighted demand) before join |
| `sample_listings.community` ≠ master key | Low | Do not join on `community`; district-level only |
| Listings `amenities` vs OSM `amenities` | Low | Different semantics — keep separate |
| No parcel coordinates | Low | District rollup only |
| Investors use `preferred_district` | N/A | Rename or map if ever used |
| District name whitespace/casing | **None detected** | Pipeline still normalizes as defensive step |

**Overall join quality: Excellent.** A single `district` key works cleanly across all files.

---

## District coverage matrix

All files cover the same 20 districts:

Al Bahia · Al Bateen · Al Ghadeer · Al Khalidiyah · Al Maqta · Al Maryah Island · Al Raha Beach · Al Reef · Al Reem Island · Al Shamkha · Al Zahiyah · Corniche · Danet Abu Dhabi · Khalifa City · Masdar City · Mohammed Bin Zayed City · Mussafah · Saadiyat Island · Yas Island · Zayed City

---

## Recommendation

### Files that should drive the main score

| File | Score components |
|------|------------------|
| **`sample_communities.csv`** | `community_need_score` — service demand, mobility, resident experience, population, occupancy |
| **`osm_amenities.csv`** | `amenity_adequacy_score`, `amenity_shortage_score` — population-adjusted OSM coverage by category |
| **`districts.csv`** | Master join key, infrastructure context, map centroids |

Together these account for **90%** of `community_gap_score` (55% need + 35% shortage) in the current pipeline.

### Files that should only support evidence and story

| File | Use |
|------|-----|
| **`sample_listings.csv`** | Listing density, rent/sale mix, price pressure — evidence bullets and 5% market weight |
| **`sample_transactions.csv`** | Transaction volume and price context — feeds market pressure evidence |
| **`sample_parcels.csv`** | Vacant/developable land, feasibility narrative — 5% feasibility weight + evidence |

These files strengthen confidence and intervention feasibility storytelling but must **not** override the community-need + amenity-shortage signal.

### File to skip (unless scope changes)

| File | Reason |
|------|--------|
| **`sample_investors.csv`** | Investment-track data; no `district` column; does not improve community gap detection |

---

## Related docs

- [methodology.md](./methodology.md) — scoring formulas and confidence logic
- [project-idea-1.md](./project-idea-1.md) — product concept and data tier strategy
- Pipeline output: `output/district_scores.json`, `output/district_scores_summary.csv`
