import { NextResponse } from "next/server";
import {
  generateRecommendation,
  generateRecommendationSync,
} from "@/lib/aiRecommendation";
import { loadServerEnv } from "@/lib/loadServerEnv";
import type { DistrictRecommendation } from "@/lib/communityGapTypes";
import {
  parseRecommendationRequestBody,
  validateDistrictRecord,
} from "@/lib/validateDistrictPayload";

export const runtime = "nodejs";

export interface RecommendationApiResponse {
  recommendation: DistrictRecommendation;
  source: "llm" | "fallback";
  district: string;
}

/**
 * POST /api/recommendation
 *
 * Accepts a district object from processed/community_gap_outputs.json.
 * Body formats:
 *   - { district: "...", community_metrics: {...}, ... }   (district object)
 *   - { district: { ...districtObject }, forceFallback?: boolean }
 *
 * OpenRouter is called server-side only via OPENROUTER_API_KEY.
 * On OpenRouter failure or missing key, returns deterministic fallback.
 */
export async function POST(req: Request) {
  loadServerEnv();

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", errors: ["Request body must be valid JSON."] },
      { status: 400 }
    );
  }

  const parsed = parseRecommendationRequestBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body.", errors: parsed.errors },
      { status: 400 }
    );
  }

  const validated = validateDistrictRecord(parsed.data.district);
  if (!validated.valid) {
    return NextResponse.json(
      {
        error: "Invalid district object.",
        errors: validated.errors,
      },
      { status: 400 }
    );
  }

  try {
    const { recommendation, source } = await generateRecommendation(
      validated.district,
      { forceFallback: parsed.data.forceFallback }
    );

    const response: RecommendationApiResponse = {
      recommendation,
      source,
      district: validated.district.district,
    };

    return NextResponse.json(response);
  } catch {
    const { recommendation, source } = generateRecommendationSync(
      validated.district
    );

    return NextResponse.json({
      recommendation,
      source,
      district: validated.district.district,
    });
  }
}
