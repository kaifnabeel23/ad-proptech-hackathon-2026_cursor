import type {
  DistrictRecord,
  RecommendationResponse,
} from "./communityGapTypes";
import { fallbackRecommendation } from "./fallbackRecommendation";

export interface FetchRecommendationOptions {
  /** Skip LLM and use deterministic fallback (works without API key) */
  forceFallback?: boolean;
}

/**
 * Request a structured recommendation for the selected district.
 * Calls POST /api/recommendation — never OpenRouter directly from the browser.
 */
export async function fetchDistrictRecommendation(
  district: DistrictRecord,
  options: FetchRecommendationOptions = {}
): Promise<RecommendationResponse> {
  try {
    const res = await fetch("/api/recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        district,
        forceFallback: options.forceFallback ?? false,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const detail =
        Array.isArray(data.errors) && data.errors.length > 0
          ? data.errors.join(" ")
          : data.error ?? `Recommendation API failed (${res.status})`;
      throw new Error(detail);
    }

    return data as RecommendationResponse;
  } catch {
    return {
      recommendation: fallbackRecommendation(district),
      source: "fallback",
      district: district.district,
    };
  }
}
