# Demo Districts

**Generated:** run `python scripts/find_demo_districts.py` to refresh.
**Source:** `processed/community_gap_outputs.json`

Recommended districts for the 2–3 minute hackathon demo video.

---

## 1. High urgency (main walkthrough)

**District:** Al Ghadeer
**Gap score:** 70
**Gap level:** Medium
**Confidence level:** High
**Recommended intervention:** Education capacity

**Top evidence bullets:**
- Service demand is above the city median (80 vs 63).
- Mobility score is below the city median (56 vs 72).
- Resident experience is weaker than the city median (75 vs 87).
- Education amenity coverage is below the city median (0 OSM amenities vs median 10).

**Why it is useful in the demo:**
Use Al Ghadeer as the main walkthrough: gap score 70 with High confidence, clear OSM-backed evidence, and a concrete recommendation (Education capacity). Shows the full need → shortage → evidence → confidence story.

## 2. Mixed evidence (confidence / uncertainty)

**District:** Al Raha Beach
**Gap score:** 53
**Gap level:** Medium
**Confidence level:** Medium
**Recommended intervention:** Mobility improvement

**Top evidence bullets:**
- Education amenity coverage is below the city median (0 OSM amenities vs median 10).
- Healthcare amenity coverage is below the city median (5 OSM amenities vs median 10).
- Mobility-related amenities are limited compared with other districts (10 OSM vs median 19).
- Parcel/infrastructure context suggests the intervention may be feasible (15 vacant or developable parcels).

**Why it is useful in the demo:**
Use Al Raha Beach to demonstrate honest uncertainty: gap score 53 with Medium confidence and mixed amenity signals. Explains why the confidence badge matters and when decision-makers should validate before acting.

## 3. Low urgency (monitor / balanced reference)

**District:** Al Khalidiyah
**Gap score:** 29
**Gap level:** Low
**Confidence level:** Low
**Recommended intervention:** Monitor / no urgent intervention

**Top evidence bullets:**
- Parcel/infrastructure context suggests the intervention may be feasible (18 vacant or developable parcels).
- District has 275 mapped OSM amenities across six categories.
- Community need score is 45 and amenity shortage score is 2.
- Estimated district population: 487,073.

**Why it is useful in the demo:**
Use Al Khalidiyah as the balanced reference: low gap score 29 (Low confidence). Shows the copilot does not over-flag every district and when to monitor rather than intervene.

---

## Regenerate

```bash
python scripts/build_community_gap_data.py
python scripts/find_demo_districts.py
```

## Manual override

Edit this file directly if auto-selected districts are not demo-friendly.
