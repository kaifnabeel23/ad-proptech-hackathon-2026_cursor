# Community Gap & Confidence Copilot

**Abu Dhabi AI PropTech Challenge — Future Communities Track**

Community Gap & Confidence Copilot is an AI-assisted district intelligence prototype that helps planners, developers, and community decision-makers identify underserved Abu Dhabi districts.

It compares **community need signals** with **real OpenStreetMap amenity coverage**, then produces an evidence-backed recommendation with an explicit **confidence level**.

> Which district needs intervention, what is missing, why do we believe that, and how much should the decision-maker trust the recommendation?

---

## Why this matters

Most AI dashboards give recommendations without showing the reasoning behind them.

This prototype does the opposite.

It shows:

* the district-level data
* the amenity coverage
* the calculated community gap score
* the evidence behind the flag
* the recommended intervention
* the confidence level and uncertainty note

The goal is not to make the AI sound confident.
The goal is to help decision-makers understand **when the evidence is strong, mixed, or limited**.

---

## Core demo flow

The demo focuses on three districts:

| Demo slot      | District      | Purpose                                                |
| -------------- | ------------- | ------------------------------------------------------ |
| Top priority   | Al Ghadeer    | Highest-priority district in the current dataset       |
| Mixed evidence | Al Raha Beach | Shows how the system handles mixed signals             |
| Low urgency    | Al Khalidiyah | Shows that the model does not over-flag every district |

Important demo wording:

**Al Ghadeer is the top priority in the current dataset.**
It should not be described as a “High gap” district because its `gap_level` is **Medium**, even though it ranks #1.

---

## What this repo contains

| Layer                     | Purpose                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `community_gap/`          | Deterministic Python data pipeline: loading, aggregation, scoring, evidence, export |
| `processed/`              | Frontend-ready JSON and CSV outputs                                                 |
| `app/` + `components/`    | Next.js dashboard frontend                                                          |
| `lib/`                    | Frontend data helpers and AI recommendation logic                                   |
| `app/api/recommendation/` | Server-side recommendation API route                                                |
| `scripts/`                | Data, AI, and demo check scripts                                                    |
| `docs/`                   | Methodology, handoff docs, demo flow, Cursor build log                              |

Design rule:

> Scores and evidence come from the deterministic data pipeline.
> The frontend and LLM only display and explain them.

---

## Quick start

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Run the dashboard

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 3. Build check

```bash
npm run build
```

### 4. AI recommendation check

```bash
npm run check:ai
```

The AI check should pass even if OpenRouter is unavailable, because the app includes a deterministic fallback recommendation.

---

## Environment variables

Create a `.env` or `.env.local` file in the project root.

```env
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=your_preferred_openrouter_model_optional
```

Rules:

* Do not commit `.env` or `.env.local`.
* Do not expose the OpenRouter key client-side.
* Do not use `NEXT_PUBLIC_OPENROUTER_API_KEY`.
* The frontend must call the server route, not OpenRouter directly.

Optional live market pulse:

```env
UAE_DATA_API_KEY=your_live_data_key_here
```

Live data is optional supporting context only. It must not affect the core community gap score.

---

## Data pipeline

Run the full data pipeline:

```bash
pip install -r requirements.txt
python scripts/build_community_gap_data.py
python scripts/check_community_gap_data.py
python scripts/find_demo_districts.py
```

Optional smoke tests:

```bash
python -m community_gap.data_loader
python -m community_gap.features
```

Generated outputs:

| Output                                 | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `processed/community_gap_outputs.json` | Main frontend and AI handoff file           |
| `processed/community_gap_scores.csv`   | Flat scoring table for debugging and judges |
| `docs/demo_districts.md`               | Recommended demo walkthrough districts      |

---

## Data pipeline overview

```text
data/*.csv
   ↓
data_loader
   ↓
features
   ↓
scoring
   ↓
evidence
   ↓
export
   ↓
processed/community_gap_outputs.json
```

The pipeline aggregates community records to **district level** before scoring.

Core inputs:

* `sample_communities.csv`
* `districts.csv`
* `osm_amenities.csv`

Supporting context:

* `sample_listings.csv`
* `sample_parcels.csv`
* `sample_transactions.csv`

The supporting datasets help explain market pressure and intervention feasibility, but they do not replace the core community gap logic.

---

## Scoring methodology

The main score is:

```text
community_gap_score =
55% community need
+ 35% amenity shortage
+ 10% market pressure
```

The score is deterministic and explainable.

### Community need score

Uses:

* service demand
* mobility weakness
* resident experience weakness
* population
* occupancy

### Amenity shortage score

Uses real OpenStreetMap amenity counts:

* education
* healthcare
* retail
* services
* community
* mobility

### Confidence logic

Confidence is not an ML probability.

It reflects how many independent evidence signals agree, such as:

* high service demand
* weak mobility
* weak resident experience
* low education amenity coverage
* low healthcare amenity coverage
* limited mobility amenities
* market pressure alignment

This allows the product to show honest uncertainty when signals are weak or mixed.

Full methodology:

```text
docs/data_methodology.md
```

---

## AI recommendation layer

The AI layer is connected through:

```text
POST /api/recommendation
```

The frontend passes one selected district object from:

```text
processed/community_gap_outputs.json
```

The API returns:

```json
{
  "district_summary": "...",
  "main_gap": "...",
  "recommended_intervention": "...",
  "why_this_matters": "...",
  "confidence_note": "...",
  "uncertainty_note": "..."
}
```

AI guardrails:

* The LLM must not calculate scores.
* The LLM must not invent amenity counts.
* The LLM must not change confidence levels.
* The LLM must not claim live data unless live data is actually provided.
* The LLM only explains structured evidence from the pipeline.

If OpenRouter fails or the key is unavailable, the app uses a deterministic fallback recommendation so the demo still works.

Details:

```text
docs/ai_handoff.md
```

---

## Frontend dashboard

The frontend is a Next.js dashboard designed for a short hackathon demo.

It shows:

* Future Communities hero section
* demo district quick selector
* all-district dropdown
* selected district profile
* community metrics
* community gap score
* confidence badge
* pipeline scores
* AI recommendation panel
* evidence bullets
* top gap drivers
* OSM amenity breakdown
* supporting context

The frontend must not recalculate scores.
It displays values from the processed JSON and calls the recommendation API for the explanation layer.

---

## Optional Live Market Pulse

If enabled, the live market pulse is a supporting feature only.

It may show:

* live listing count
* rent/sale split
* median price per sqm
* refreshed timestamp
* data availability status

Rules:

* Live data must not change `community_gap_score`.
* Live data must not change district ranking.
* Live data must not replace the validated challenge datasets.
* If live data is unavailable, the app should still work normally.

Recommended fallback message:

```text
Live market pulse unavailable — using validated challenge datasets.
```

---

## Project structure

```text
community_gap/
  data_loader.py        Load and validate CSVs
  features.py           District aggregation and feature engineering
  scoring.py            Deterministic scores and confidence logic
  evidence.py           Evidence bullets and intervention categories
  export.py             JSON/CSV export contract
  pipeline.py           End-to-end orchestration

scripts/
  build_community_gap_data.py
  check_community_gap_data.py
  find_demo_districts.py
  check_ai_recommendation.py

processed/
  community_gap_outputs.json
  community_gap_scores.csv

app/
  page.tsx
  api/recommendation/route.ts

components/
  CommunityDashboard.tsx
  CommunityHero.tsx
  DistrictSelector.tsx
  MetricCard.tsx
  ScoreCard.tsx
  ConfidenceBadge.tsx
  AmenityBreakdown.tsx
  EvidencePanel.tsx
  SupportingContext.tsx
  RecommendationPanel.tsx

lib/
  communityData.ts
  communityTypes.ts
  aiRecommendation.ts
  fallbackRecommendation.ts
  validateDistrictPayload.ts
  loadServerEnv.ts

docs/
  data_handoff.md
  data_methodology.md
  data_inventory.md
  demo_districts.md
  ai_handoff.md
  frontend_demo_flow.md
  cursor-build-log.md
```

---

## Teammate integration

### Frontend

Use:

```text
processed/community_gap_outputs.json
```

Display:

* `district`
* `community_metrics`
* `amenity_counts`
* `supporting_context`
* `scores`
* `classification`
* `evidence_bullets`
* `top_gap_drivers`

Call:

```text
POST /api/recommendation
```

with the selected district object.

### AI

Input:

* selected district object from `processed/community_gap_outputs.json`

Output:

* district summary
* main gap
* recommended intervention
* why it matters
* confidence note
* uncertainty note

Guardrail:

> AI explains the evidence.
> It does not create the evidence.

### Data

Before committing data changes:

```bash
python scripts/build_community_gap_data.py
python scripts/check_community_gap_data.py
python scripts/find_demo_districts.py
```

---

## Demo script

Recommended flow:

1. Open the dashboard.
2. Select **Al Ghadeer**.
3. Explain that it is the **top priority in the current dataset**.
4. Show the gap score and confidence.
5. Show evidence bullets.
6. Show OSM amenity shortages.
7. Show the AI recommendation.
8. Switch to **Al Raha Beach** to show mixed evidence.
9. Switch to **Al Khalidiyah** to show low urgency.
10. Close with:

```text
The product does not just recommend an intervention. It shows why, and it tells the decision-maker how confident the system is.
```

---

## Branch workflow

Recommended branches:

| Branch               | Purpose                           |
| -------------------- | --------------------------------- |
| `main`               | Stable demo                       |
| `data-scoring`       | Data pipeline                     |
| `ai-recommendation`  | AI route and recommendation logic |
| `frontend-dashboard` | UI and product experience         |
| `live-market-pulse`  | Optional live data feature        |

Before merging, run:

```bash
npm run build
npm run check:ai
```

For data changes, also run:

```bash
python scripts/build_community_gap_data.py
python scripts/check_community_gap_data.py
```

---

## OSM attribution

Amenity data uses OpenStreetMap contributors.

Any public demo that shows amenity coverage should include attribution:

```text
Amenity data © OpenStreetMap contributors.
```

OpenStreetMap license:

```text
https://www.openstreetmap.org/copyright
```

---

## Cursor usage

Cursor was used to accelerate:

* data inventory and validation
* deterministic scoring pipeline
* district aggregation
* confidence logic
* evidence generation
* AI guardrails
* frontend dashboard implementation
* demo documentation

Project rules live in:

```text
.cursor/rules/
```

Cursor build story:

```text
docs/cursor-build-log.md
```

---

## Event links

* Website: https://challenge.evoost.ai
* Discord: https://discord.gg/jy3QDxQ3jK
* GitHub Org: https://github.com/abu-dhabi-ai-proptech-challenge
* Starter Kit: https://github.com/abu-dhabi-ai-proptech-challenge/starter-kit
* Submissions: https://github.com/abu-dhabi-ai-proptech-challenge/submissions

---

## License

Licensed under the [MIT License](LICENSE).
