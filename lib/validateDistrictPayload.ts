import type { DistrictRecord } from "./communityGapTypes";

const REQUIRED_DISTRICT_FIELDS = [
  "district",
  "community_metrics",
  "amenity_counts",
  "supporting_context",
  "scores",
  "classification",
  "evidence_bullets",
  "top_gap_drivers",
] as const;

export interface DistrictValidationResult {
  valid: true;
  district: DistrictRecord;
}

export interface DistrictValidationError {
  valid: false;
  errors: string[];
}

export type ValidateDistrictResult =
  | DistrictValidationResult
  | DistrictValidationError;

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate a district payload from processed/community_gap_outputs.json.
 * Returns a list of clear, field-level errors when invalid.
 */
export function validateDistrictRecord(
  value: unknown
): ValidateDistrictResult {
  const errors: string[] = [];

  if (!isNonNullObject(value)) {
    return { valid: false, errors: ["District must be a non-null object."] };
  }

  for (const field of REQUIRED_DISTRICT_FIELDS) {
    if (!(field in value)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    const fieldValue = value[field];

    switch (field) {
      case "district":
        if (typeof fieldValue !== "string" || !fieldValue.trim()) {
          errors.push("district must be a non-empty string.");
        }
        break;
      case "community_metrics":
      case "amenity_counts":
      case "supporting_context":
      case "scores":
      case "classification":
        if (!isNonNullObject(fieldValue)) {
          errors.push(`${field} must be an object.`);
        }
        break;
      case "evidence_bullets":
      case "top_gap_drivers":
        if (!Array.isArray(fieldValue)) {
          errors.push(`${field} must be an array.`);
        }
        break;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, district: value as unknown as DistrictRecord };
}

export interface ParsedRecommendationRequest {
  forceFallback: boolean;
  district: unknown;
}

/**
 * Accept either a raw district object or { district, forceFallback? }.
 */
export function parseRecommendationRequestBody(
  body: unknown
): { ok: true; data: ParsedRecommendationRequest } | { ok: false; errors: string[] } {
  if (!isNonNullObject(body)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const forceFallback = Boolean(body.forceFallback);

  const wrappedDistrict = body.district;
  if (
    isNonNullObject(wrappedDistrict) &&
    "community_metrics" in wrappedDistrict
  ) {
    return {
      ok: true,
      data: { district: wrappedDistrict, forceFallback },
    };
  }

  if (
    typeof body.district === "string" &&
    "community_metrics" in body
  ) {
    return {
      ok: true,
      data: { district: body, forceFallback },
    };
  }

  return {
    ok: false,
    errors: [
      "Invalid request body. Send the district object directly, or wrap it as { district: { ... } }.",
      `Required district fields: ${REQUIRED_DISTRICT_FIELDS.join(", ")}.`,
    ],
  };
}
