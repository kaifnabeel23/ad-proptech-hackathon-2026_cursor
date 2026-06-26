import type { DistrictRecord, DistrictRecommendation } from "./communityGapTypes";

const MIXED_EVIDENCE_MARKERS = [
  "mixed",
  "disagree",
  "cautiously",
  "do not fully align",
];

function hasMixedEvidence(
  evidenceBullets: string[],
  topGapDrivers: string[]
): boolean {
  const combined = [...evidenceBullets, ...topGapDrivers]
    .join(" ")
    .toLowerCase();
  return MIXED_EVIDENCE_MARKERS.some((marker) => combined.includes(marker));
}

function isTopPriority(district: DistrictRecord): boolean {
  return (
    district.district === "Al Ghadeer" ||
    (district.rank === 1 && district.classification.gap_level === "Medium")
  );
}

function buildDistrictSummary(district: DistrictRecord): string {
  const { district: name, scores, classification } = district;
  const gapLevel = classification.gap_level;
  const gapScore = scores.community_gap_score;

  if (isTopPriority(district)) {
    return (
      `${name} is the top priority in the current dataset with a ${gapLevel} community gap ` +
      `(community gap score ${gapScore}/100). Summary based on pre-processed pipeline data.`
    );
  }

  return (
    `${name} has a ${gapLevel} community gap (community gap score ${gapScore}/100). ` +
    `Summary based on pre-processed pipeline data.`
  );
}

function buildMainGap(district: DistrictRecord): string {
  const { top_gap_drivers, classification } = district;

  if (top_gap_drivers.length === 0) {
    return (
      `No dominant gap driver was flagged by the pipeline for ${district.district}.`
    );
  }

  const drivers = top_gap_drivers.slice(0, 3).join(", ");
  return `The main gap drivers are: ${drivers}. Pipeline gap level: ${classification.gap_level}.`;
}

function buildWhyThisMatters(evidenceBullets: string[]): string {
  if (evidenceBullets.length === 0) {
    return "The pipeline did not attach evidence bullets for this district.";
  }

  return evidenceBullets.slice(0, 3).join(" ");
}

function buildConfidenceNote(district: DistrictRecord): string {
  const { confidence_level, confidence_reason } = district.classification;

  if (confidence_level === "High") {
    return (
      `High confidence — multiple pipeline signals agree. ${confidence_reason}`
    );
  }

  return (
    `${confidence_level} confidence — treat this recommendation with caution. ${confidence_reason}`
  );
}

function buildUncertaintyNote(district: DistrictRecord): string {
  const { classification, evidence_bullets, top_gap_drivers } = district;
  const notes: string[] = [];

  if (
    classification.confidence_level === "Medium" ||
    classification.confidence_level === "Low"
  ) {
    notes.push(
      `Pipeline confidence is ${classification.confidence_level}; validate before acting.`
    );
  }

  if (hasMixedEvidence(evidence_bullets, top_gap_drivers)) {
    notes.push("Evidence signals are mixed — core indicators do not fully agree.");
  }

  if (classification.confidence_level === "High" && notes.length === 0) {
    notes.push("Multiple pipeline signals agree on the gap story.");
  }

  notes.push("Based on pre-processed static data, not a live feed.");
  return notes.join(" ");
}

/**
 * Deterministic recommendation — no OpenRouter, no invented facts.
 * Uses only pipeline fields listed in the handoff contract.
 */
export function fallbackRecommendation(
  districtObject: DistrictRecord
): DistrictRecommendation {
  const { classification, evidence_bullets } = districtObject;

  return {
    district_summary: buildDistrictSummary(districtObject),
    main_gap: buildMainGap(districtObject),
    recommended_intervention:
      classification.recommended_intervention_category,
    why_this_matters: buildWhyThisMatters(evidence_bullets),
    confidence_note: buildConfidenceNote(districtObject),
    uncertainty_note: buildUncertaintyNote(districtObject),
  };
}

/** @deprecated Use fallbackRecommendation */
export const buildFallbackRecommendation = fallbackRecommendation;
