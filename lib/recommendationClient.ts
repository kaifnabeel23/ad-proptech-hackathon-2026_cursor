import type {
  DistrictRecord,
  RecommendationResponse,
} from "./communityGapTypes";
import { fallbackRecommendation } from "./fallbackRecommendation";

export interface FetchRecommendationOptions {
  /** Skip LLM and use deterministic fallback (works without API key) */
  forceFallback?: boolean;
  signal?: AbortSignal;
}

/**
 * POST /api/recommendation — throws on network or HTTP failure.
 * Never calls OpenRouter from the browser.
 */
export async function fetchRecommendationFromApi(
  district: DistrictRecord,
  options: FetchRecommendationOptions = {}
): Promise<RecommendationResponse> {
  const res = await fetch("/api/recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      district,
      forceFallback: options.forceFallback ?? false,
    }),
    signal: options.signal,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Recommendation API returned an invalid response.");
  }

  if (!res.ok) {
    const payload = data as { errors?: string[]; error?: string };
    const detail =
      Array.isArray(payload.errors) && payload.errors.length > 0
        ? payload.errors.join(" ")
        : payload.error ?? `Recommendation API failed (${res.status})`;
    throw new Error(detail);
  }

  const response = data as RecommendationResponse;
  if (!response.recommendation) {
    throw new Error("Recommendation API response missing recommendation.");
  }

  return response;
}

/**
 * Request a structured recommendation for the selected district.
 * On failure, returns deterministic fallback (legacy helper).
 */
export async function fetchDistrictRecommendation(
  district: DistrictRecord,
  options: FetchRecommendationOptions = {}
): Promise<RecommendationResponse> {
  try {
    return await fetchRecommendationFromApi(district, options);
  } catch {
    return {
      recommendation: fallbackRecommendation(district),
      source: "fallback",
      district: district.district,
    };
  }
}
