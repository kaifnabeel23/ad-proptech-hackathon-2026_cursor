import type { District } from "./communityTypes";
import type { DistrictRecord, DistrictRecommendation } from "./communityGapTypes";
import { fallbackRecommendation } from "./fallbackRecommendation";

/**
 * Immediate client-side recommendation from pipeline evidence only.
 * No API call, no score calculation, no invented data.
 */
export function frontendFallbackRecommendation(
  district: District
): DistrictRecommendation {
  return fallbackRecommendation(district as DistrictRecord);
}
