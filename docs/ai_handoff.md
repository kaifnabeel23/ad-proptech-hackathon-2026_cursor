# AI Layer Handoff — For Frontend & Judges

**Project:** Community Gap & Confidence Copilot  
**Track:** Future Communities — Abu Dhabi AI PropTech Challenge  
**Contract version:** 1.0.0

This document explains how the AI recommendation layer works, what it expects, and how the frontend should integrate it.

---

## 1. What the AI layer does

The AI layer turns **structured district evidence** from the data pipeline into a **concise, planner-style recommendation**.

It does **not** score districts or decide interventions. The deterministic pipeline (`community_gap/`) produces scores, classifications, evidence bullets, and intervention labels. The AI layer **explains** that output in plain language for planners, developers, and community operators.

**Core idea:** the pipeline is the source of truth. The AI is the interpreter.

---

## 2. What it consumes

```
processed/community_gap_outputs.json
```

Each item in `districts[]` is one aggregated district row (community CSVs are rolled up before scoring). The frontend loads this file for the dashboard; the AI layer receives **one selected district object** at a time.

**Related docs:** `docs/data_handoff.md`, `docs/data_methodology.md`, `docs/demo_districts.md`

---

## 3. Input

Pass **one district object** per recommendation request. Required fields:

| Field | Purpose |
|-------|---------|
| `district` | District name (join key) |
| `community_metrics` | Population, demand, mobility, resident experience |
| `amenity_counts` | OSM amenity counts by category |
| `supporting_context` | Listings, transactions, parcels (supporting only) |
| `scores` | All deterministic 0–100 pipeline scores |
| `classification` | Gap level, confidence, intervention label |
| `evidence_bullets` | Pre-written evidence strings |
| `top_gap_drivers` | Named reasons the district was flagged |

Optional but useful on the full object: `rank`, `area_type`, `profile`, `location`.

**Do not** send raw CSVs or the full 20-district payload unless building a comparison feature.

---

## 4. Output

The recommendation is always six string fields:

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

### API response shape

`POST /api/recommendation` wraps the recommendation for the frontend:

```json
{
  "recommendation": {
    "district_summary": "...",
    "main_gap": "...",
    "recommended_intervention": "...",
    "why_this_matters": "...",
    "confidence_note": "...",
    "uncertainty_note": "..."
  },
  "source": "llm",
  "district": "Al Ghadeer"
}
```

| Field | Meaning |
|-------|---------|
| `recommendation` | The six-field structured output above |
| `source` | `"llm"` when OpenRouter succeeded; `"fallback"` when deterministic fallback was used |
| `district` | District name echoed back for UI state |

---

## 5. Guardrails

The AI layer must **not**:

- Calculate or change scores
- Invent amenity counts, population, or other metrics
- Change `confidence_level` or override `recommended_intervention_category`
- Claim live or real-time data (this is pre-processed static analysis)
- Re-rank districts or present itself as the source of numbers

The AI layer **only** explains structured evidence from the data pipeline.

The server enforces `recommended_intervention` to match `classification.recommended_intervention_category` even if the LLM drifts.

**UI rule:** always show the AI recommendation **beside** `evidence_bullets` and the confidence badge. Do not show AI text without pipeline evidence.

---

## 6. OpenRouter

| Item | Detail |
|------|--------|
| Provider | [OpenRouter](https://openrouter.ai/) (OpenAI-compatible chat API) |
| Env var | `OPENROUTER_API_KEY` in `.env` / `.env.local` |
| Model | `OPENROUTER_MODEL` (optional; default `openai/gpt-4o-mini`) |
| Where it runs | **Server-side only** — `app/api/recommendation/route.ts` |
| Frontend | Calls `POST /api/recommendation` — **never OpenRouter directly** |

**Security:**

- Do **not** use `NEXT_PUBLIC_OPENROUTER_API_KEY`
- The API key is never sent to the browser or printed in logs
- Keys stay in server environment variables only

---

## 7. Fallback

If OpenRouter fails or `OPENROUTER_API_KEY` is missing, the system still returns a valid recommendation via **deterministic fallback**.

The fallback:

- Does **not** call OpenRouter
- Uses only pipeline fields (`evidence_bullets`, `top_gap_drivers`, `classification`, `scores.community_gap_score`, etc.)
- Returns the same six-field JSON shape
- Works with **zero API keys** — safe for demos and judging

Force fallback for testing: send `{ district: {...}, forceFallback: true }` to the API.

**Check scripts:**

```bash
python scripts/check_ai_recommendation.py
npm run check:ai
```

Both validate Al Ghadeer fallback output and optionally test OpenRouter when a key is present.

---

## 8. Demo wording

Use these three districts in the 2–3 minute demo walkthrough:

| Role | District | Key facts |
|------|----------|-----------|
| **Main walkthrough** | **Al Ghadeer** | Rank 1, gap score 70, `gap_level: Medium`, `confidence_level: High`, intervention: Education capacity |
| **Mixed evidence** | **Al Raha Beach** | Gap score 53, `confidence_level: Medium`, mixed signals — shows honest uncertainty |
| **Low urgency** | **Al Khalidiyah** | Gap score 29, `gap_level: Low`, intervention: Monitor / no urgent intervention |

### Al Ghadeer — important wording

- Call it **“top priority in the current dataset”**
- Do **not** call it **“High gap”** — its `gap_level` is **Medium** (High band starts at 75 per methodology)
- You can cite gap score 70 and High **confidence** — those are different from gap **level**

### Al Raha Beach

Use to demonstrate the confidence badge and `uncertainty_note` when evidence is mixed.

### Al Khalidiyah

Use to show the copilot does not over-flag every district and when to monitor rather than intervene.

---

## Frontend integration (quick start)

### Load district data

```typescript
import { districtRecords, getDistrictByName } from "@/lib/communityGapData";

const district = getDistrictByName("Al Ghadeer");
```

Or import / copy `processed/community_gap_outputs.json` into `public/data/` and fetch it.

### Request a recommendation

```typescript
import { fetchDistrictRecommendation } from "@/lib/recommendationClient";

const { recommendation, source } = await fetchDistrictRecommendation(district);

// recommendation.district_summary
// recommendation.main_gap
// recommendation.recommended_intervention
// ...
// source === "llm" | "fallback"
```

### API call (direct)

```http
POST /api/recommendation
Content-Type: application/json

{
  "district": { ...one district object from community_gap_outputs.json... }
}
```

---

## Code map

| Concern | Location |
|---------|----------|
| Prompt template | `lib/aiRecommendationPrompt.ts` |
| OpenRouter + fallback orchestration | `lib/aiRecommendation.ts` |
| Deterministic fallback | `lib/fallbackRecommendation.ts` |
| API route | `app/api/recommendation/route.ts` |
| Request validation | `lib/validateDistrictPayload.ts` |
| Frontend helper | `lib/recommendationClient.ts` |
| Types | `lib/communityGapTypes.ts` |
| Python parity | `ai/recommendation.py`, `ai/fallback.py` |

---

## Quick reference

| Teammate | Use |
|----------|-----|
| Frontend | `processed/community_gap_outputs.json` + `POST /api/recommendation` |
| Demo script | `docs/demo_districts.md` |
| Data / scoring | `docs/data_handoff.md` |
| AI check | `python scripts/check_ai_recommendation.py` or `npm run check:ai` |

**Questions?** See `docs/data_methodology.md` for how scores and confidence are computed, or run `python scripts/check_community_gap_data.py` to validate the JSON.
