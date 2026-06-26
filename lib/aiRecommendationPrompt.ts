import type { DistrictRecord } from "./communityGapTypes";

/**
 * Exact prompt template for the AI recommendation layer.
 * Used by lib/aiRecommendation.ts and mirrored in ai/prompt.py.
 */

export const SYSTEM_PROMPT = `You are an Abu Dhabi community planning copilot.

You help planners, developers, and community operators understand district-level community gaps.

Use only the structured district evidence provided.
Do not invent data.
Do not calculate new scores.
Do not change confidence levels.
Do not claim live data.
If evidence is mixed, say so clearly.
Keep the response concise, practical, and suitable for a 2-minute hackathon demo.

Return valid JSON only.`;

export const JSON_OUTPUT_SCHEMA = `{
  "district_summary": string,
  "main_gap": string,
  "recommended_intervention": string,
  "why_this_matters": string,
  "confidence_note": string,
  "uncertainty_note": string
}`;

export const SPECIAL_WORDING_RULE = `If the district is Al Ghadeer, or if it is the highest-scoring district but gap_level is Medium, call it "top priority in the current dataset," not "High gap."`;

/** Evidence object embedded in the user prompt — exact fields required by the handoff. */
export interface UserPromptEvidence {
  district: string;
  community_metrics: DistrictRecord["community_metrics"];
  amenity_counts: DistrictRecord["amenity_counts"];
  supporting_context: DistrictRecord["supporting_context"];
  scores: DistrictRecord["scores"];
  classification: DistrictRecord["classification"];
  evidence_bullets: string[];
  top_gap_drivers: string[];
}

export function buildUserPromptEvidence(
  district: DistrictRecord
): UserPromptEvidence {
  return {
    district: district.district,
    community_metrics: district.community_metrics,
    amenity_counts: district.amenity_counts,
    supporting_context: district.supporting_context,
    scores: district.scores,
    classification: district.classification,
    evidence_bullets: district.evidence_bullets,
    top_gap_drivers: district.top_gap_drivers,
  };
}

function isTopPriorityWording(district: DistrictRecord): boolean {
  return (
    district.district === "Al Ghadeer" ||
    (district.rank === 1 && district.classification.gap_level === "Medium")
  );
}

/** Build the exact user prompt for OpenRouter. */
export function buildUserPrompt(district: DistrictRecord): string {
  const evidence = buildUserPromptEvidence(district);
  const { classification } = evidence;
  const topPriorityHint = isTopPriorityWording(district)
    ? "This district qualifies for the special wording rule — use \"top priority in the current dataset,\" not \"High gap.\""
    : SPECIAL_WORDING_RULE;

  return `Write a short, polished, planner-friendly recommendation for the district below.

Use only the structured evidence provided. Do not invent data, calculate new scores, change confidence levels, or claim live data.

District evidence (JSON):
${JSON.stringify(evidence, null, 2)}

Special wording rule:
${topPriorityHint}

Output requirements:
- Return valid JSON only — no markdown fences.
- recommended_intervention must exactly match classification.recommended_intervention_category: "${classification.recommended_intervention_category}"
- confidence_note must reflect classification.confidence_level (${classification.confidence_level}) and confidence_reason without changing the level.
- district_summary must reflect classification.gap_level (${classification.gap_level}) without changing it.
- main_gap should draw from top_gap_drivers and evidence_bullets.
- why_this_matters should synthesize evidence_bullets in readable prose.
- uncertainty_note should flag mixed evidence, Medium/Low confidence, or incomplete data when applicable.
- Keep each field concise and suitable for a 2-minute hackathon demo.

Required JSON output shape:
${JSON_OUTPUT_SCHEMA}`;
}
