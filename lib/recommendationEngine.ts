export {
  generateRecommendation,
  generateRecommendationSync,
  type GenerateRecommendationOptions,
  type GenerateRecommendationResult,
} from "./aiRecommendation";

import {
  generateRecommendation,
  generateRecommendationSync,
  type GenerateRecommendationOptions,
} from "./aiRecommendation";
import type { DistrictRecord, RecommendationResponse } from "./communityGapTypes";

/** @deprecated Use GenerateRecommendationOptions */
export type RecommendOptions = GenerateRecommendationOptions;

/** Backward-compatible wrapper returning RecommendationResponse */
export async function recommendForDistrict(
  district: DistrictRecord,
  options: GenerateRecommendationOptions = {}
): Promise<RecommendationResponse> {
  const result = await generateRecommendation(district, options);
  return {
    recommendation: result.recommendation,
    source: result.source,
    district: district.district,
  };
}

export function recommendForDistrictSync(
  district: DistrictRecord
): RecommendationResponse {
  const result = generateRecommendationSync(district);
  return {
    recommendation: result.recommendation,
    source: result.source,
    district: district.district,
  };
}
