# Community Gap & Confidence Copilot

**Abu Dhabi AI PropTech Challenge — Future Communities track**

A hackathon prototype that identifies underserved Abu Dhabi districts by comparing **community need signals** with **real OpenStreetMap amenity coverage** — then explains the result with **evidence** and **confidence**, not just an AI guess.

> Which district needs intervention, what is missing, why do we believe that, and how much should the decision-maker trust the recommendation?

---

## What this repo contains

| Layer | Purpose |
|-------|---------|
| **`community_gap/`** | Deterministic Python pipeline — load, aggregate, score, evidence, export |
| **`processed/`** | Frontend-ready JSON + debug CSV (regenerate with build script) |
| **`app/` + `components/`** | Next.js dashboard (template UI — wire to `processed/`) |
| **`docs/`** | Methodology, handoff, demo districts, Cursor build log |

**Design rule:** scores and evidence come from the data pipeline. The UI and LLM only display and explain them.

---

## Quick start

### Frontend (dashboard)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### Data pipeline (Python)

```bash
pip install -r requirements.txt
python scripts/build_community_gap_data.py
python scripts/check_community_gap_data.py
python scripts/find_demo_districts.py
```

**Outputs:**

- `processed/community_gap_outputs.json` — main handoff for frontend + AI
- `processed/community_gap_scores.csv` — flat table for judges / debugging

Optional smoke tests:

```bash
python -m community_gap.data_loader
python -m community_gap.features
```

---

## Data pipeline overview

```
data/*.csv  →  data_loader  →  features  →  scoring  →  evidence  →  export
                     │              │
                     │              └── communities aggregated to district level
                     └── core CSVs required; listings/parcels/transactions optional
```

**Core inputs:** `sample_communities.csv`, `districts.csv`, `osm_amenities.csv`  
**Supporting context:** listings, parcels, transactions (market pressure & feasibility only)

**Main score:** `community_gap_score` = 55% community need + 35% amenity shortage + 10% market pressure

See **`docs/data_methodology.md`** for judges and **`docs/data_handoff.md`** for frontend/AI integration.

---

## Project structure

```
community_gap/          Python package (scoring layer)
  data_loader.py        Load + validate CSVs
  features.py           District aggregation + OSM amenity counts
  scoring.py            Deterministic scores + confidence
  evidence.py           Evidence bullets + interventions
  export.py             JSON/CSV export contract
  pipeline.py           End-to-end orchestration

scripts/
  build_community_gap_data.py
  check_community_gap_data.py
  find_demo_districts.py

processed/
  community_gap_outputs.json
  community_gap_scores.csv

data/                   Challenge CSVs (from starter kit)

docs/
  data_handoff.md       Teammate contract (fields, guardrails, example JSON)
  data_methodology.md   Judge-facing scoring methodology
  data_inventory.md     CSV inventory + join quality
  demo_districts.md     Suggested demo walkthrough districts
  cursor-build-log.md   How Cursor was used (Best Use of Cursor award)

app/                    Next.js app
components/             Dashboard UI
```

---

## Teammate integration

### Frontend

1. Use `processed/community_gap_outputs.json` (or copy to `public/data/`)
2. District dropdown from `payload.districts` or `payload.ranked_summary`
3. Show `scores`, `classification`, `evidence_bullets`, `top_gap_drivers`, confidence badge

### AI / copilot

Pass one district object to the LLM (`district`, `community_metrics`, `amenity_counts`, `scores`, `classification`, `evidence_bullets`, `top_gap_drivers`).

**Guardrail:** the LLM must not invent metrics or recalculate scores — only explain structured pipeline output.

Details: **`docs/data_handoff.md`**

---

## Demo districts

Run `python scripts/find_demo_districts.py` to refresh **`docs/demo_districts.md`**.

| Slot | District (current build) |
|------|--------------------------|
| High urgency | Al Ghadeer |
| Mixed evidence | Al Raha Beach |
| Low urgency | Al Khalidiyah |

---

## Branch workflow

- `main` — stable demo
- `data-scoring` — pipeline work
- `frontend-dashboard` — UI work
- `ai-recommendation` — copilot / README

Before committing data changes:

```bash
python scripts/build_community_gap_data.py
python scripts/check_community_gap_data.py
```

---

## OSM attribution

Amenity data uses [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL). Include attribution in any public demo that shows amenity coverage.

---

## Event links

- Website: https://challenge.evoost.ai
- Discord: https://discord.gg/jy3QDxQ3jK
- GitHub Org: https://github.com/abu-dhabi-ai-proptech-challenge
- Starter kit: https://github.com/abu-dhabi-ai-proptech-challenge/starter-kit
- Submissions: https://github.com/abu-dhabi-ai-proptech-challenge/submissions

**Cursor:** project rules live in `.cursor/rules/` — see `docs/cursor-build-log.md` for the data-layer build story.

---

Licensed under the [MIT License](LICENSE).
