import type { CommunityGapOutputs, District } from "./communityTypes";
import communityGapOutputs from "@/processed/community_gap_outputs.json";

const TOP_PRIORITY_DISTRICT_NAME = "Al Ghadeer";
const TOP_PRIORITY_LABEL = "Top priority in the current dataset";

const DEMO_DISTRICT_NAMES = [
  "Al Ghadeer",
  "Al Raha Beach",
  "Al Khalidiyah",
] as const;

let payload: CommunityGapOutputs | null = null;
let payloadLoadError: string | null = null;

try {
  const raw = communityGapOutputs as CommunityGapOutputs;
  if (
    !raw ||
    !Array.isArray(raw.districts) ||
    raw.districts.length === 0
  ) {
    payloadLoadError =
      "processed/community_gap_outputs.json is empty or has no districts.";
  } else {
    payload = raw;
  }
} catch {
  payloadLoadError =
    "processed/community_gap_outputs.json could not be read. Run: python scripts/build_community_gap_data.py";
}

export interface SafeCommunityData {
  districts: District[];
  defaultDistrict: District;
  meta: {
    project: string;
    track: string;
    generated_at: string;
    methodology_version: string;
    scoring_weights: CommunityGapOutputs["scoring_weights"];
    district_count: number;
    ranked_summary: CommunityGapOutputs["ranked_summary"];
  };
}

export type CommunityDataLoadResult =
  | { success: true; data: SafeCommunityData }
  | { success: false; error: string };

/** Safe loader for the dashboard — never throws to the page boundary */
export function loadCommunityDataSafe(): CommunityDataLoadResult {
  if (payloadLoadError || !payload) {
    return {
      success: false,
      error:
        payloadLoadError ??
        "Community gap data is unavailable. Run: python scripts/build_community_gap_data.py",
    };
  }

  const defaultDistrict =
    payload.districts.find((d) => d.district === TOP_PRIORITY_DISTRICT_NAME) ??
    payload.districts[0];

  if (!defaultDistrict) {
    return {
      success: false,
      error: "No districts found in processed/community_gap_outputs.json.",
    };
  }

  return {
    success: true,
    data: {
      districts: payload.districts,
      defaultDistrict,
      meta: {
        project: payload.project,
        track: payload.track,
        generated_at: payload.generated_at,
        methodology_version: payload.methodology_version,
        scoring_weights: payload.scoring_weights,
        district_count: payload.district_count,
        ranked_summary: payload.ranked_summary,
      },
    },
  };
}

/** Payload metadata — only valid after successful load */
export const communityMeta = payload
  ? {
      project: payload.project,
      track: payload.track,
      generated_at: payload.generated_at,
      methodology_version: payload.methodology_version,
      scoring_weights: payload.scoring_weights,
      district_count: payload.district_count,
      ranked_summary: payload.ranked_summary,
    }
  : {
      project: "Community Gap & Confidence Copilot",
      track: "Future Communities",
      generated_at: "",
      methodology_version: "",
      scoring_weights: {
        community_need: 0,
        amenity_shortage: 0,
        market_pressure: 0,
      },
      district_count: 0,
      ranked_summary: [],
    };

/** All district rows — read-only adapter over pipeline JSON */
export function getAllDistricts(): readonly District[] {
  if (!payload) return [];
  return payload.districts;
}

/** Lookup a district by exact name match */
export function getDistrictByName(name: string): District | undefined {
  if (!payload) return undefined;
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

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function getPriorityLabel(district: District): string {
  if (district.district === TOP_PRIORITY_DISTRICT_NAME) {
    return TOP_PRIORITY_LABEL;
  }

  return `${district.classification.gap_level} community gap`;
}

export const DEFAULT_DISTRICT_NAME = TOP_PRIORITY_DISTRICT_NAME;
