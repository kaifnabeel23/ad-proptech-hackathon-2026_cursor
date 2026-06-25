# Abu Dhabi AI PropTech Challenge — Hackathon Context

## Purpose of this file

This document is the **working context brief** for our team repo. It summarizes the challenge, constraints, judging priorities, data environment, and build principles so that teammates and AI coding assistants have a single source of truth.

---

# 1. Challenge Overview

## Event

**Abu Dhabi AI PropTech Challenge**
Theme: **Building the Intelligence Layer for Land, Investment & Communities**

## Goal

Build a focused AI prototype in one of the challenge tracks using the provided datasets and starter resources.

## Tracks

1. **Land Intelligence**
2. **Investment Intelligence**
3. **Future Communities**
4. **Decision Intelligence**

---

# 2. Time Constraint and Working Assumption

This is effectively a **~3 hour build sprint** once hacking begins.

## Practical assumption

We should optimize for:

* **one clear use case**
* **one working demo flow**
* **one strong recommendation / intelligence layer**
* **clear evidence and explanation**
* **submission readiness before the final minutes**

## What we should not optimize for

* large architecture
* lots of screens
* “platform” scope
* complicated multi-service infrastructure
* speculative features with weak evidence

---

# 3. Judging Priorities

The challenge judges projects across five areas:

1. **Problem & relevance**
2. **Technical execution**
3. **Use of AI**
4. **Demo quality**
5. **Potential impact**

## Practical interpretation for this repo

To score well, our project should:

* solve a **specific problem for a clear user**
* work end-to-end in at least **one reliable flow**
* use AI for **real reasoning / recommendation / explanation**, not decoration
* be easy to understand in a **short demo video**
* feel credible enough to extend beyond the hackathon

---

# 4. Data Environment

## Official challenge data structure

The challenge provides a mix of **synthetic** and **real** data.

### Synthetic challenge datasets

* `districts.csv`
* `sample_parcels.csv`
* `sample_investors.csv`
* `sample_transactions.csv`
* `sample_communities.csv`
* `sample_listings.csv`

### Real dataset included in the kit

* `osm_amenities.csv` — **real Abu Dhabi amenity data from OpenStreetMap**

### Optional additional data

The challenge also mentions:

* optional **live Abu Dhabi listings API** via eVoost
* optional public/open datasets such as Abu Dhabi Open Data, WorldPop, Overture, etc.

## Important repo rule

The MVP should be able to run **entirely on the official challenge datasets**.
Optional live/open data is a bonus only if it can be added safely without risking the main build.

---

# 5. Repo Working Strategy

## Our repo is for the actual product build

This repo should stay focused on:

* project docs
* app code
* lightweight data notes
* submission-ready materials

## We are **not** copying the entire starter kit into this repo

The official starter kit should be treated as a **reference repo**, not as the codebase we submit from and it might or might no be referenced.

---

# 6. Current Project Direction

## Current front-runner concept

**Track:** Future Communities
**Project:** **Community Gap & Confidence Copilot**

## Core idea

Identify under-served Abu Dhabi districts by combining:

* community demand / mobility / resident experience signals
* real amenity coverage from OpenStreetMap
* optional listing context if time allows

Then produce:

* an evidence-backed recommendation
* a confidence badge / uncertainty explanation

See `docs/project-idea-1.md` for the full concept.

---

# 7. Build Principles for This Repo

## 7.1 One strong flow > many weak features

We should aim for:

1. user selects a district
2. system analyzes district signals + amenity coverage
3. system produces a recommendation
4. system shows confidence + evidence

If that works well, the project is already viable.

---

## 7.2 Evidence over hype

The project should avoid making broad speculative claims.
Recommendations should be tied to:

* visible metrics
* district evidence
* amenity counts / comparisons
* explicit confidence logic

---

## 7.3 AI should interpret, not fabricate

The deterministic layer should produce structured signals and evidence first.
The LLM should then:

* summarize the district issue
* recommend an intervention
* explain uncertainty

The LLM should **not** invent the raw scoring logic.

---

## 7.4 MVP first, optional enhancements later

### MVP should rely on:

* `sample_communities.csv`
* `districts.csv`
* `osm_amenities.csv`

### Optional additions (needs to be discussed):

* `sample_listings.csv`
* live eVoost listings API
* small charts / map layer

---

# 8. Recommended Tech Direction

For speed and simplicity, the project should stay lean.

## Preferred stack

* **Frontend / App:** React / Next.js + TypeScript + Tailwind
* **Hosting:** (Front-End) Vercel + (Back-End) Render
* **LLM API:** OpenRouter
* **Data layer:** local CSV / preprocessed JSON
* **Scoring / logic:** lightweight in-app logic or a small preprocessing script

## Avoid

* unnecessary databases
* complex orchestration layers
* heavy backend architecture unless absolutely required

---

# 9. Submission Mindset

We should assume the final submission needs:

* a clean repo
* a working app or backup demo video
* a concise README
* a clear explanation of what the product does and what was built during the hackathon
* optional slide material (if needed)

## Operational rule

Submission materials should begin **before the final 30 minutes**.

---

# 10. Immediate Use of This Repo

This repo should help us do three things quickly:

1. **Align the team** on the chosen concept and constraints
2. **Give Cursor / AI coding tools context** so they scaffold the right thing
3. **Keep the build focused** on a small, demoable MVP rather than an overbuilt platform

---

# 11. Related Files in This Repo

* `docs/project-idea-1.md` — full concept for **Community Gap & Confidence Copilot**
* `README.md` — lightweight repo overview and current project status
