/**
 * Types for processed/community_gap_outputs.json and the AI recommendation layer.
 * The pipeline is the source of truth; the AI only explains structured evidence.
 */

export type GapLevel = "High" | "Medium" | "Low";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type RecommendationPriority = "High" | "Medium" | "Low";

export interface CommunityMetrics {
  population_estimate: number;
  occupancy_rate: number;
  service_demand_index: number;
  mobility_score: number;
  resident_experience_score: number;
}

export interface AmenityCounts {
  education: number;
  healthcare: number;
  retail: number;
  services: number;
  community: number;
  mobility: number;
  total_amenities: number;
  amenity_diversity_count: number;
}

export interface SupportingContext {
  listing_count: number;
  available_listing_count: number;
  rent_listing_count: number;
  sale_listing_count: number;
  transaction_count: number;
  parcel_count: number;
  vacant_or_available_parcel_count: number;
}

export interface DistrictScores {
  community_need_score: number;
  amenity_adequacy_score: number;
  amenity_shortage_score: number;
  market_pressure_score: number;
  intervention_feasibility_score: number;
  community_gap_score: number;
  confidence_score: number;
  data_completeness_score: number;
}

export interface DistrictClassification {
  gap_level: GapLevel;
  confidence_level: ConfidenceLevel;
  confidence_reason: string;
  recommended_intervention_category: string;
  recommendation_priority: RecommendationPriority;
}

/** Full district object from processed/community_gap_outputs.json */
export interface DistrictRecord {
  district: string;
  area_type?: string;
  profile?: string;
  location?: { latitude: number; longitude: number };
  community_metrics: CommunityMetrics;
  amenity_counts: AmenityCounts;
  supporting_context?: SupportingContext;
  scores: DistrictScores;
  classification: DistrictClassification;
  evidence_bullets: string[];
  top_gap_drivers: string[];
  rank?: number;
}

/** Evidence payload passed to the LLM — no raw CSVs, no full 20-district dump */
export interface DistrictEvidencePayload {
  district: string;
  community_metrics: CommunityMetrics;
  amenity_counts: AmenityCounts;
  scores: DistrictScores;
  classification: DistrictClassification;
  evidence_bullets: string[];
  top_gap_drivers: string[];
  supporting_context?: SupportingContext;
}

/** Structured AI output consumed by the frontend */
export interface DistrictRecommendation {
  district_summary: string;
  main_gap: string;
  recommended_intervention: string;
  why_this_matters: string;
  confidence_note: string;
  uncertainty_note: string;
}

export interface RecommendationResponse {
  recommendation: DistrictRecommendation;
  source: "llm" | "fallback";
  district: string;
}

export interface RankedSummaryRow {
  district: string;
  rank: number;
  community_gap_score: number;
  confidence_level: ConfidenceLevel;
  recommended_intervention: string;
}

export interface CommunityGapOutputs {
  project: string;
  track: string;
  generated_at: string;
  methodology_version: string;
  scoring_weights?: Record<string, number>;
  district_count: number;
  districts: DistrictRecord[];
  ranked_summary?: RankedSummaryRow[];
}

/** Strip a full district record to the LLM-safe evidence payload */
export function toEvidencePayload(
  district: DistrictRecord
): DistrictEvidencePayload {
  const payload: DistrictEvidencePayload = {
    district: district.district,
    community_metrics: district.community_metrics,
    amenity_counts: district.amenity_counts,
    scores: district.scores,
    classification: district.classification,
    evidence_bullets: district.evidence_bullets,
    top_gap_drivers: district.top_gap_drivers,
  };

  if (district.supporting_context) {
    payload.supporting_context = district.supporting_context;
  }

  return payload;
}
