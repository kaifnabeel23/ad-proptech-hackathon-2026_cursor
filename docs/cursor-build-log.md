# Cursor Build Log — Community Gap & Confidence Copilot

How we used Cursor to build the deterministic data layer during the Abu Dhabi AI PropTech hackathon. This log supports the **Best Use of Cursor** award and gives teammates context on what was generated vs. hand-reviewed.

**Repo:** `ad-proptech-hackathon-2026`  
**Branch workflow:** data work on `data-scoring` (see `.cursor/rules/005-hackathon-workflow.mdc`)

---

## 1. Initial project understanding

**Goal**  
Align on the product question, data tiers (core vs supporting), and non-negotiables: deterministic scores, evidence + confidence, no LLM-invented numbers.

**Cursor prompt used**
> We are building a hackathon prototype for the Abu Dhabi AI PropTech Challenge… Goal: Build a data/scoring layer that identifies underserved Abu Dhabi districts by comparing community demand signals with real amenity coverage… The main community_gap_score should be driven by community need + amenity shortage… Do not add a database. Do not call external APIs. Do not let the LLM invent scores.

**Output created**
- Shared understanding captured in `.cursor/rules/` and `docs/hackathon-context.md`
- Early exploration of CSV schemas (row counts, district names, OSM categories)
- Decision to skip `sample_investors.csv` unless it clearly strengthens the demo

**Why it helped the team move faster**  
Cursor read the starter-kit files and challenge brief in one pass instead of each teammate opening six CSVs manually. We locked the scoring philosophy early — need + OSM shortage as core, listings/parcels as supporting — so later modules did not drift into a generic “real estate dashboard.”

---

## 2. Data inventory and validation

**Goal**  
Document every challenge CSV before writing joins: columns, nulls, district coverage, lat/lon, and join mismatches.

**Cursor prompt used**
> Inspect all CSV files in the data folder. Create docs/data_inventory.md… For each file, include row count, column names, missing values, unique districts, lat/lon presence, core vs supporting vs optional… Also create a join quality section… End with a recommendation: which files should drive the main score?

**Output created**
- `docs/data_inventory.md` — full inventory + join quality tables
- Findings: 20 districts in master `districts.csv`; some spelling variants in supporting files; OSM is the real amenity ground truth

**Why it helped the team move faster**  
We caught join issues on paper before they became silent `NaN` scores. Frontend and AI teammates could read one doc instead of guessing which datasets were authoritative.

---

## 3. Feature engineering

**Goal**  
Turn raw CSVs into one district-level feature table: OSM amenity pivots, city medians, and supporting context from listings, parcels, and transactions.

**Cursor prompts used** (implemented in sequence)
> Create this data pipeline structure: community_gap/ with data_loader, features, scoring, evidence, export… placeholder functions first.

> Implement community_gap/data_loader.py — load_challenge_data(), validate required columns, clean district names.

> Implement build_amenity_counts() and build_core_dataset() — pivot OSM categories, merge communities + districts, add city median columns.

> Implement build_listing_context() / add_listing_context() — district listing counts; rent vs sale price metrics separately.

> Implement build_parcel_context() — robust to missing columns; feasibility only.

> Implement build_transaction_context() — market activity, not a pricing dashboard.

> Implement build_full_feature_dataset() — orchestrate core + supporting; add `python -m community_gap.features` smoke test.

**Output created**
- `community_gap/data_loader.py` — load + validate + district cleaning
- `community_gap/features.py` — amenity pivots, medians, listing/parcel/transaction aggregations
- Module smoke test: `python -m community_gap.features` prints shape and sample rows

**Why it helped the team move faster**  
Each prompt targeted one aggregation concern. Cursor generated boilerplate pandas groupbys and merge logic; we reviewed weights and column names against `data_inventory.md`. The incremental prompts kept diffs reviewable — important when three teammates are working in parallel.

---

## 4. Explainable scoring

**Goal**  
Implement transparent 0–100 scores with documented weights. `community_gap_score` must be dominated by need + amenity shortage.

**Cursor prompt used**
> Implement community_gap/scoring.py… normalize_series()… add_scores()… community_need_score (demand 40%, inverse mobility 20%, inverse experience 20%, population 10%, occupancy 10%)… amenity_adequacy_score vs city medians… amenity_shortage_score = 100 − adequacy… market_pressure_score from listings/transactions… intervention_feasibility_score from parcels/infrastructure… community_gap_score = 0.55 need + 0.35 shortage + 0.10 market. Feasibility excluded from main gap.

**Output created**
- `community_gap/scoring.py` — `normalize_series()`, `add_scores()`, `score_all_districts()`
- `GAP_WEIGHTS` constant exported for JSON metadata
- Gap level bands: High 75–100, Medium 50–74, Low below 50

**Why it helped the team move faster**  
Cursor encoded the formula spec directly into tested functions. We did not lose hackathon time on score design debates in a spreadsheet — the weights live in code and `docs/data_methodology.md`, and re-running the build script updates every district consistently.

---

## 5. Confidence logic

**Goal**  
Add a confidence layer that reflects **evidence agreement**, not fake ML probability.

**Cursor prompt used**
> In community_gap/scoring.py, implement add_confidence()… boolean signal columns (high demand, weak mobility, weak experience, low education/healthcare/mobility amenities, high market pressure, high gap)… signal_agreement_count… High if ≥6, Medium if 3–5, else Low… cap at Medium if data_completeness_score is below 80%.

**Output created**
- Eight `signal_*` boolean columns per district
- `confidence_score`, `confidence_level`, `confidence_reason`
- `data_completeness_score` over nine core fields

**Why it helped the team move faster**  
This was the product differentiator — “how much should I trust this?” — and Cursor implemented the full signal matrix in one pass. Judges can trace every confidence level back to explicit comparisons vs city medians, not a black-box model.

---

## 6. Evidence generation

**Goal**  
Produce demo-friendly evidence bullets and intervention labels from row values only — no invented facts.

**Cursor prompts used**
> Implement generate_evidence_for_row() — 4–7 bullets from actual values; prioritize strongest evidence; mention OSM coverage; say when evidence is mixed.

> Implement recommend_intervention_category() — Education capacity, Healthcare access, Mobility improvement, etc.; respect gap_level Low → Monitor.

> Implement add_evidence() and add_recommendations() on the full dataframe.

**Output created**
- `community_gap/evidence.py` — bullets, `top_gap_drivers`, intervention category + priority
- Mixed-evidence handling when amenity signals disagree

**Why it helped the team move faster**  
Evidence copy is tedious to write by hand for 20 districts. Cursor generated the template logic once; we spot-checked Al Ghadeer and Al Raha Beach to confirm bullets matched the underlying numbers. The AI teammate can now narrate these bullets instead of inventing new ones.

---

## 7. JSON export for frontend

**Goal**  
Define a stable JSON contract for the Next.js dashboard and wire a one-command build.

**Cursor prompts used**
> In export.py, create row_to_output() with nested community_metrics, amenity_counts, supporting_context, scores, classification, evidence_bullets, top_gap_drivers.

> Implement build_scored_dataset(), build_all_district_outputs(), analyze_district(), export_outputs() — pretty JSON + flat CSV + top-5 summary.

> Implement scripts/build_community_gap_data.py — run full pipeline from repo root.

**Output created**
- `community_gap/export.py` — `row_to_output()`, `build_frontend_payload()`, `export_outputs()`
- `processed/community_gap_outputs.json` (20 districts + `ranked_summary`)
- `processed/community_gap_scores.csv` (flat debug table)
- `scripts/build_community_gap_data.py`

**Why it helped the team move faster**  
Frontend integration could start as soon as the JSON shape was frozen. `analyze_district("al ghadeer")` gave the AI teammate a single-district lookup without re-running pandas in the browser. One build command became the pre-commit check in team workflow rules.

---

## 8. Methodology documentation

**Goal**  
Give judges and teammates readable docs: methodology for scoring, handoff for integration.

**Cursor prompts used**
> Create docs/data_handoff.md for teammates — generated files, important fields, AI guardrail, commands, example Al Ghadeer object.

> Create docs/data_methodology.md for judges — data sources, core scores, confidence, honesty, OSM attribution.

**Output created**
- `docs/data_handoff.md` — frontend + AI contract with example payload
- `docs/data_methodology.md` — judge-facing scoring methodology (v1.0.0)

**Why it helped the team move faster**  
Documentation usually slips at hackathon hour 20. Cursor drafted both docs from the actual code weights and JSON shape, so they stayed in sync with `scoring.py` instead of describing an earlier plan.

---

## 9. Debugging and sanity checks

**Goal**  
Catch schema drift and bad scores before teammates integrate broken JSON.

**Cursor prompts used**
> Implement scripts/check_community_gap_data.py — validate every district object, scores 0–100, gap/confidence levels, non-empty evidence_bullets, print top 5 and sample JSON.

**Output created**
- `scripts/check_community_gap_data.py` — standalone validator (no pytest)
- Fixes discovered during implementation:
  - Check script initially expected `confidence_level` inside `scores`; moved to `classification` to match export shape
  - Build script wired from stub metadata to real `export_outputs()`
  - PowerShell: use `;` not `&&` when chaining commands on Windows

**Why it helped the team move faster**  
The check script acted as a cheap CI step. When export shape changed, validation failed immediately with a clear missing-key message instead of a blank React panel in demo rehearsal.

---

## 10. Final demo district selection

**Goal**  
Pick three walkthrough districts for the 2–3 minute video: high urgency, mixed evidence, low urgency.

**Cursor prompt used**
> Implement scripts/find_demo_districts.py — read processed JSON, select high urgency (high gap, high/medium confidence, ≥4 bullets), mixed evidence (medium gap or confidence), low urgency (low gap)… write docs/demo_districts.md.

**Output created**
- `scripts/find_demo_districts.py`
- `docs/demo_districts.md` — auto-generated demo script notes
- Selected districts (current build):
  - **Al Ghadeer** — main walkthrough (gap 74, High confidence, Education capacity)
  - **Al Raha Beach** — mixed evidence (gap 57, Medium confidence)
  - **Al Khalidiyah** — low urgency reference (gap 30, Low confidence, Monitor)

**Why it helped the team move faster**  
We did not argue in standup about which district “looks best.” The script ranked candidates against explicit criteria and wrote the demo narrative into markdown. One syntax typo in the first draft (`extra )`) was caught on first run — normal hackathon debugging, fixed in seconds.

---

## How we worked with Cursor (honest notes)

- **Small prompts, small modules** — scaffold first, then implement `data_loader` → `features` → `scoring` → `evidence` → `export` in order.
- **Human review mattered** — we checked that market/listing data stayed supporting-only and that evidence bullets quoted real medians.
- **Rules files helped** — `.cursor/rules/002-data-layer.mdc` and `005-hackathon-workflow.mdc` kept output paths and guardrails consistent across sessions.
- **Run after every step** — `python scripts/build_community_gap_data.py` and `python scripts/check_community_gap_data.py` from repo root.

---

Cursor helped us move from raw challenge datasets to a working, explainable community intelligence data layer in a short hackathon window.
