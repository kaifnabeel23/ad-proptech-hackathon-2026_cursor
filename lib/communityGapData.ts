import type { CommunityGapOutputs, DistrictRecord } from "./communityGapTypes";
import communityGapData from "@/processed/community_gap_outputs.json";

const payload = communityGapData as CommunityGapOutputs;

/** All districts from processed/community_gap_outputs.json */
export const districtRecords: DistrictRecord[] = payload.districts;

/** Lookup a district by name */
export function getDistrictByName(name: string): DistrictRecord | undefined {
  return districtRecords.find((d) => d.district === name);
}

/** Payload metadata (generated_at, methodology_version, etc.) */
export const communityGapMeta = {
  project: payload.project,
  track: payload.track,
  generated_at: payload.generated_at,
  methodology_version: payload.methodology_version,
  district_count: payload.district_count,
  ranked_summary: payload.ranked_summary,
};
