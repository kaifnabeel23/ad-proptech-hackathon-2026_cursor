import type {
  DistrictEvidencePayload,
  DistrictRecommendation,
  DistrictRecord,
} from "./communityGapTypes";
import { toEvidencePayload } from "./communityGapTypes";
import { fallbackRecommendation } from "./fallbackRecommendation";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "./aiRecommendationPrompt";

export { SYSTEM_PROMPT, buildUserPrompt, JSON_OUTPUT_SCHEMA, SPECIAL_WORDING_RULE } from "./aiRecommendationPrompt";

/** Default OpenRouter model — override via OPENROUTER_MODEL in .env */
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const REQUIRED_KEYS: (keyof DistrictRecommendation)[] = [
  "district_summary",
  "main_gap",
  "recommended_intervention",
  "why_this_matters",
  "confidence_note",
  "uncertainty_note",
];

const MIXED_EVIDENCE_MARKERS = [
  "mixed",
  "disagree",
  "cautiously",
  "do not fully align",
];

export interface GenerateRecommendationOptions {
  forceFallback?: boolean;
  apiKey?: string;
  model?: string;
}

export interface GenerateRecommendationResult {
  recommendation: DistrictRecommendation;
  source: "llm" | "fallback";
}

/** Build the LLM-safe evidence payload from a full district record. */
export function buildEvidencePayload(
  district: DistrictRecord
): DistrictEvidencePayload {
  return toEvidencePayload(district);
}

/** Parse and validate raw LLM JSON text into the six required fields. */
export function parseRecommendationJson(raw: string): DistrictRecommendation {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  for (const key of REQUIRED_KEYS) {
    if (typeof parsed[key] !== "string" || !(parsed[key] as string).trim()) {
      throw new Error(`LLM response missing or invalid field: ${key}`);
    }
  }

  return {
    district_summary: (parsed.district_summary as string).trim(),
    main_gap: (parsed.main_gap as string).trim(),
    recommended_intervention: (parsed.recommended_intervention as string).trim(),
    why_this_matters: (parsed.why_this_matters as string).trim(),
    confidence_note: (parsed.confidence_note as string).trim(),
    uncertainty_note: (parsed.uncertainty_note as string).trim(),
  };
}

function hasMixedEvidence(
  evidenceBullets: string[],
  topGapDrivers: string[]
): boolean {
  const combined = [...evidenceBullets, ...topGapDrivers]
    .join(" ")
    .toLowerCase();
  return MIXED_EVIDENCE_MARKERS.some((m) => combined.includes(m));
}

/**
 * Enforce pipeline truth and demo-safe wording over LLM drift.
 */
export function validateAndEnforceOutput(
  recommendation: DistrictRecommendation,
  district: DistrictRecord
): DistrictRecommendation {
  const evidence = toEvidencePayload(district);
  const { classification, scores, evidence_bullets, top_gap_drivers } =
    district;
  const enforced = { ...recommendation };

  if (
    enforced.recommended_intervention !==
    classification.recommended_intervention_category
  ) {
    enforced.recommended_intervention =
      classification.recommended_intervention_category;
  }

  const level = classification.confidence_level;
  if (!enforced.confidence_note.toLowerCase().includes(level.toLowerCase())) {
    enforced.confidence_note = `${level} confidence. ${classification.confidence_reason}`;
  }

  const gapLevel = classification.gap_level;
  const gapLower = gapLevel.toLowerCase();
  if (!enforced.district_summary.toLowerCase().includes(gapLower)) {
    enforced.district_summary = `${enforced.district_summary} Gap level: ${gapLevel}.`;
  }

  if (
    district.district === "Al Ghadeer" ||
    (district.rank === 1 && gapLevel === "Medium")
  ) {
    enforced.district_summary = enforced.district_summary.replace(
      /\bhigh gap\b/gi,
      "top priority in the current dataset"
    );
    if (
      !enforced.district_summary
        .toLowerCase()
        .includes("top priority in the current dataset")
    ) {
      enforced.district_summary =
        `${district.district} is the top priority in the current dataset ` +
        `(gap level ${gapLevel}, community gap score ${scores.community_gap_score}/100). ` +
        enforced.district_summary;
    }
  }

  if (gapLevel !== "High") {
    enforced.district_summary = enforced.district_summary.replace(
      /\bhigh gap\b/gi,
      `${gapLower} gap`
    );
  }

  const uncertaintyLower = enforced.uncertainty_note.toLowerCase();
  if (
    (classification.confidence_level === "Medium" ||
      classification.confidence_level === "Low") &&
    !uncertaintyLower.includes("caution") &&
    !uncertaintyLower.includes("uncertain") &&
    !uncertaintyLower.includes("mixed")
  ) {
    enforced.uncertainty_note =
      `Pipeline confidence is ${classification.confidence_level}. ${enforced.uncertainty_note}`;
  }

  if (hasMixedEvidence(evidence_bullets, top_gap_drivers)) {
    if (!uncertaintyLower.includes("mixed")) {
      enforced.uncertainty_note =
        "Evidence signals are mixed. " + enforced.uncertainty_note;
    }
  }

  if (scores.data_completeness_score < 80) {
    if (!uncertaintyLower.includes("completeness")) {
      enforced.uncertainty_note +=
        ` Data completeness is ${scores.data_completeness_score}/100.`;
    }
  }

  if (
    !enforced.uncertainty_note.toLowerCase().includes("pre-processed") &&
    !enforced.uncertainty_note.toLowerCase().includes("static")
  ) {
    enforced.uncertainty_note +=
      " Based on pre-processed pipeline data, not live feeds.";
  }

  // Re-validate required fields after mutations
  for (const key of REQUIRED_KEYS) {
    if (!enforced[key]?.trim()) {
      throw new Error(`Validation failed after enforcement: ${key}`);
    }
  }

  // Silence unused variable — evidence used implicitly via district
  void evidence;

  return enforced;
}

/** Server-side OpenRouter chat completion. */
export async function callOpenRouter(
  district: DistrictRecord,
  apiKey: string,
  model: string
): Promise<DistrictRecommendation> {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/abu-dhabi-ai-proptech-challenge",
      "X-Title": "Community Gap Copilot",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(district) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty response");
  }

  return parseRecommendationJson(content);
}

function resolveModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
}

/**
 * Generate a structured district recommendation.
 * Uses OpenRouter when OPENROUTER_API_KEY is set; otherwise deterministic fallback.
 */
export async function generateRecommendation(
  districtObject: DistrictRecord,
  options: GenerateRecommendationOptions = {}
): Promise<GenerateRecommendationResult> {
  const evidence = buildEvidencePayload(districtObject);
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY?.trim();
  const model = options.model ?? resolveModel();

  if (!options.forceFallback && apiKey) {
    try {
      const raw = await callOpenRouter(districtObject, apiKey, model);
      const recommendation = validateAndEnforceOutput(raw, districtObject);
      return { recommendation, source: "llm" };
    } catch {
      // Fall through to deterministic fallback
    }
  }

  void evidence;

  return {
    recommendation: fallbackRecommendation(districtObject),
    source: "fallback",
  };
}

/** Synchronous fallback-only entry (no API key, client-side safe). */
export function generateRecommendationSync(
  districtObject: DistrictRecord
): GenerateRecommendationResult {
  return {
    recommendation: fallbackRecommendation(districtObject),
    source: "fallback",
  };
}
