/**
 * Frontend types for processed/community_gap_outputs.json.
 * Keys match the pipeline JSON exactly — do not rename.
 */

export type GapLevel = "High" | "Medium" | "Low";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type RecommendationPriority = "High" | "Medium" | "Low";

export interface DistrictLocation {
  latitude: number;
  longitude: number;
}

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

/** One district row from processed/community_gap_outputs.json */
export interface District {
  district: string;
  area_type: string;
  profile: string;
  location: DistrictLocation;
  community_metrics: CommunityMetrics;
  amenity_counts: AmenityCounts;
  supporting_context: SupportingContext;
  scores: DistrictScores;
  classification: DistrictClassification;
  evidence_bullets: string[];
  top_gap_drivers: string[];
  rank?: number;
}

export interface RankedSummaryRow {
  district: string;
  rank: number;
  community_gap_score: number;
  confidence_level: ConfidenceLevel;
  recommended_intervention: string;
}

export interface ScoringWeights {
  community_need: number;
  amenity_shortage: number;
  market_pressure: number;
}

/** Top-level payload from processed/community_gap_outputs.json */
export interface CommunityGapOutputs {
  project: string;
  track: string;
  generated_at: string;
  methodology_version: string;
  scoring_weights: ScoringWeights;
  district_count: number;
  districts: District[];
  ranked_summary: RankedSummaryRow[];
}
