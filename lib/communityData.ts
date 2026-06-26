import type { CommunityGapOutputs, District } from "./communityTypes";
import communityGapOutputs from "@/processed/community_gap_outputs.json";

const payload = communityGapOutputs as CommunityGapOutputs;

const TOP_PRIORITY_DISTRICT_NAME = "Al Ghadeer";
const TOP_PRIORITY_LABEL = "Top priority in the current dataset";

const DEMO_DISTRICT_NAMES = [
  "Al Ghadeer",
  "Al Raha Beach",
  "Al Khalidiyah",
] as const;

/** Payload metadata from processed/community_gap_outputs.json */
export const communityMeta = {
  project: payload.project,
  track: payload.track,
  generated_at: payload.generated_at,
  methodology_version: payload.methodology_version,
  scoring_weights: payload.scoring_weights,
  district_count: payload.district_count,
  ranked_summary: payload.ranked_summary,
} as const;

/** All district rows — read-only adapter over pipeline JSON */
export function getAllDistricts(): readonly District[] {
  return payload.districts;
}

/** Lookup a district by exact name match */
export function getDistrictByName(name: string): District | undefined {
  return payload.districts.find((d) => d.district === name);
}

/** Demo walkthrough districts in recommended order */
export function getDemoDistricts(): District[] {
  return DEMO_DISTRICT_NAMES.map((name) => {
    const district = getDistrictByName(name);
    if (!district) {
      throw new Error(`Demo district not found in pipeline output: ${name}`);
    }
    return district;
  });
}

/** Highest-ranked district in the current dataset (Al Ghadeer) */
export function getTopPriorityDistrict(): District {
  const district = getDistrictByName(TOP_PRIORITY_DISTRICT_NAME);
  if (!district) {
    throw new Error(
      `Top priority district not found in pipeline output: ${TOP_PRIORITY_DISTRICT_NAME}`
    );
  }
  return district;
}

/** Format counts and population for display — does not alter stored values */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** Format a pipeline score for display — does not recalculate or round stored values */
export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Human-readable priority label from pipeline fields only.
 * Al Ghadeer is rank 1 with gap_level Medium — never labeled "High gap".
 */
export function getPriorityLabel(district: District): string {
  if (district.district === TOP_PRIORITY_DISTRICT_NAME) {
    return TOP_PRIORITY_LABEL;
  }

  return `${district.classification.gap_level} community gap`;
}
