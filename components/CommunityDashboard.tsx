"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import CommunityHero from "@/components/CommunityHero";
import {
  communityMeta,
  formatNumber,
  formatScore,
  getPriorityLabel,
} from "@/lib/communityData";
import type {
  ConfidenceLevel,
  District,
  GapLevel,
} from "@/lib/communityTypes";
import type { DistrictRecord } from "@/lib/communityGapTypes";
import type { DistrictRecommendation } from "@/lib/communityGapTypes";
import { fetchDistrictRecommendation } from "@/lib/recommendationClient";

const DEMO_PICKS = [
  { name: "Al Ghadeer", hint: "Top priority" },
  { name: "Al Raha Beach", hint: "Mixed evidence" },
  { name: "Al Khalidiyah", hint: "Low urgency" },
] as const;

interface CommunityDashboardProps {
  districts: District[];
  defaultDistrict: District;
}

function levelTone(level: GapLevel | ConfidenceLevel): string {
  switch (level) {
    case "High":
      return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25";
    case "Medium":
      return "bg-amber-400/10 text-amber-300 ring-amber-400/25";
    case "Low":
      return "bg-sky-400/10 text-sky-300 ring-sky-400/25";
  }
}

function LevelBadge({
  label,
  level,
}: {
  label: string;
  level: GapLevel | ConfidenceLevel;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${levelTone(level)}`}
    >
      {label}: {level}
    </span>
  );
}

function Panel({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-white/[0.08] bg-night-800/40 p-5"
    >
      <h2 className="text-sm font-semibold tracking-tight text-sand-50">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-sand-50/55">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-night-900/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-sand-50">
        {formatScore(value)}
      </p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-2.5 last:border-0">
      <span className="text-sm text-sand-50/60">{label}</span>
      <span className="text-sm font-medium tabular-nums text-sand-50">
        {value}
      </span>
    </div>
  );
}

function RecommendationField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-sand-50/85">{value}</p>
    </div>
  );
}

export default function CommunityDashboard({
  districts,
  defaultDistrict,
}: CommunityDashboardProps) {
  const [selectedName, setSelectedName] = useState(defaultDistrict.district);
  const [recommendation, setRecommendation] =
    useState<DistrictRecommendation | null>(null);
  const [recommendationSource, setRecommendationSource] = useState<
    "llm" | "fallback" | null
  >(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );

  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.district.localeCompare(b.district);
    });
  }, [districts]);

  const selectedDistrict = useMemo(
    () =>
      districts.find((d) => d.district === selectedName) ?? defaultDistrict,
    [districts, selectedName, defaultDistrict]
  );

  const loadRecommendation = useCallback(async (district: District) => {
    setLoadingRecommendation(true);
    setRecommendationError(null);

    try {
      const result = await fetchDistrictRecommendation(
        district as DistrictRecord
      );
      setRecommendation(result.recommendation);
      setRecommendationSource(result.source);
    } catch (err) {
      setRecommendation(null);
      setRecommendationSource(null);
      setRecommendationError(
        err instanceof Error ? err.message : "Failed to load recommendation."
      );
    } finally {
      setLoadingRecommendation(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendation(selectedDistrict);
  }, [selectedDistrict, loadRecommendation]);

  const { community_metrics, amenity_counts, supporting_context, scores, classification } =
    selectedDistrict;

  return (
    <>
      <CommunityHero />

      <div id="dashboard" className="mt-12 space-y-8">
        {/* District controls */}
        <section
          id="demo"
          className="rounded-xl border border-white/[0.08] bg-night-800/30 p-5"
        >
          <h2 className="text-sm font-semibold tracking-tight text-sand-50">
            District selection
          </h2>
          <p className="mt-1 text-sm text-sand-50/55">
            Choose a district to update scores, evidence, and the AI
            recommendation.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_PICKS.map((pick) => {
              const active = selectedName === pick.name;
              return (
                <button
                  key={pick.name}
                  type="button"
                  onClick={() => setSelectedName(pick.name)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-amber-400/40 bg-amber-400/10 text-sand-50"
                      : "border-white/10 bg-night-900/40 text-sand-50/80 hover:border-white/20"
                  }`}
                >
                  <span className="font-semibold">{pick.name}</span>
                  <span className="mt-0.5 block text-xs text-sand-50/50">
                    {pick.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label
              htmlFor="district-select"
              className="text-xs font-medium uppercase tracking-wider text-sand-50/45"
            >
              All districts
            </label>
            <select
              id="district-select"
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-night-900 px-3 py-2.5 text-sm text-sand-50 outline-none transition focus:border-amber-400/40 sm:max-w-md"
            >
              {sortedDistricts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.rank != null ? `#${d.rank} — ` : ""}
                  {d.district}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* District header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
              Selected district
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-sand-50">
              {selectedDistrict.district}
            </h2>
            <p className="mt-1 text-sm text-sand-50/60">
              {selectedDistrict.area_type} · {selectedDistrict.profile}
              {selectedDistrict.rank != null
                ? ` · Rank ${selectedDistrict.rank}`
                : ""}
            </p>
            <p className="mt-2 text-sm font-medium text-amber-300/90">
              {getPriorityLabel(selectedDistrict)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LevelBadge
              label="Gap level"
              level={classification.gap_level}
            />
            <LevelBadge
              label="Confidence"
              level={classification.confidence_level}
            />
          </div>
        </div>

        {/* Main dashboard scores */}
        <Panel
          title="Gap & confidence scores"
          description="All values from the deterministic pipeline — not recalculated in the browser."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              label="Community gap score"
              value={scores.community_gap_score}
            />
            <ScoreCard
              label="Community need"
              value={scores.community_need_score}
            />
            <ScoreCard
              label="Amenity shortage"
              value={scores.amenity_shortage_score}
            />
            <ScoreCard
              label="Confidence score"
              value={scores.confidence_score}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              label="Amenity adequacy"
              value={scores.amenity_adequacy_score}
            />
            <ScoreCard
              label="Market pressure"
              value={scores.market_pressure_score}
            />
            <ScoreCard
              label="Intervention feasibility"
              value={scores.intervention_feasibility_score}
            />
            <ScoreCard
              label="Data completeness"
              value={scores.data_completeness_score}
            />
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.06] bg-night-900/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
              Recommended intervention
            </p>
            <p className="mt-1 text-sm font-semibold text-sand-50">
              {classification.recommended_intervention_category}
            </p>
            <p className="mt-1 text-sm text-sand-50/55">
              Priority: {classification.recommendation_priority}
            </p>
          </div>
        </Panel>

        {/* Community metrics + OSM amenities */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Community metrics">
            <MetricRow
              label="Population estimate"
              value={formatNumber(community_metrics.population_estimate)}
            />
            <MetricRow
              label="Occupancy rate"
              value={String(community_metrics.occupancy_rate)}
            />
            <MetricRow
              label="Service demand index"
              value={formatScore(community_metrics.service_demand_index)}
            />
            <MetricRow
              label="Mobility score"
              value={formatScore(community_metrics.mobility_score)}
            />
            <MetricRow
              label="Resident experience"
              value={formatScore(community_metrics.resident_experience_score)}
            />
          </Panel>

          <Panel title="OSM amenity coverage">
            <MetricRow
              label="Education"
              value={formatNumber(amenity_counts.education)}
            />
            <MetricRow
              label="Healthcare"
              value={formatNumber(amenity_counts.healthcare)}
            />
            <MetricRow
              label="Retail"
              value={formatNumber(amenity_counts.retail)}
            />
            <MetricRow
              label="Services"
              value={formatNumber(amenity_counts.services)}
            />
            <MetricRow
              label="Community"
              value={formatNumber(amenity_counts.community)}
            />
            <MetricRow
              label="Mobility"
              value={formatNumber(amenity_counts.mobility)}
            />
            <MetricRow
              label="Total amenities"
              value={formatNumber(amenity_counts.total_amenities)}
            />
            <MetricRow
              label="Category diversity"
              value={formatNumber(amenity_counts.amenity_diversity_count)}
            />
          </Panel>
        </div>

        {/* AI recommendation */}
        <Panel
          title="AI recommendation"
          description="Planner-style guidance from POST /api/recommendation, shown alongside pipeline evidence."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <LevelBadge
                label="Pipeline confidence"
                level={classification.confidence_level}
              />
              {recommendationSource ? (
                <span className="inline-flex items-center rounded-full bg-night-900 px-2.5 py-1 text-xs font-medium text-sand-50/70 ring-1 ring-inset ring-white/10">
                  Source: {recommendationSource}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => loadRecommendation(selectedDistrict)}
              disabled={loadingRecommendation}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-sand-50/90 transition hover:border-white/30 disabled:opacity-40"
            >
              {loadingRecommendation ? "Generating…" : "Refresh"}
            </button>
          </div>

          {loadingRecommendation ? (
            <p className="text-sm text-sand-50/60">Generating recommendation…</p>
          ) : recommendationError ? (
            <p className="text-sm text-red-300/90">{recommendationError}</p>
          ) : recommendation ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <RecommendationField
                label="District summary"
                value={recommendation.district_summary}
              />
              <RecommendationField
                label="Main gap"
                value={recommendation.main_gap}
              />
              <RecommendationField
                label="Recommended intervention"
                value={recommendation.recommended_intervention}
              />
              <RecommendationField
                label="Why this matters"
                value={recommendation.why_this_matters}
              />
              <RecommendationField
                label="Confidence note"
                value={recommendation.confidence_note}
              />
              <RecommendationField
                label="Uncertainty note"
                value={recommendation.uncertainty_note}
              />
            </div>
          ) : (
            <p className="text-sm text-sand-50/60">
              No recommendation loaded yet.
            </p>
          )}
        </Panel>

        {/* Evidence */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Evidence bullets">
            {selectedDistrict.evidence_bullets.length > 0 ? (
              <ul className="space-y-2">
                {selectedDistrict.evidence_bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-2 text-sm leading-relaxed text-sand-50/80"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-sand-50/55">
                No evidence bullets for this district.
              </p>
            )}
          </Panel>

          <Panel title="Gap drivers & confidence">
            {selectedDistrict.top_gap_drivers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedDistrict.top_gap_drivers.map((driver) => (
                  <span
                    key={driver}
                    className="rounded-full border border-white/10 bg-night-900/60 px-3 py-1 text-xs font-medium text-sand-50/75"
                  >
                    {driver}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sand-50/55">
                No gap drivers flagged for this district.
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-sand-50/70">
              {classification.confidence_reason}
            </p>
          </Panel>
        </div>

        {/* Supporting context */}
        <Panel
          title="Supporting context"
          description="Listings, transactions, and parcel counts — supporting signals only."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricRow
              label="Listing count"
              value={formatNumber(supporting_context.listing_count)}
            />
            <MetricRow
              label="Available listings"
              value={formatNumber(supporting_context.available_listing_count)}
            />
            <MetricRow
              label="Rent listings"
              value={formatNumber(supporting_context.rent_listing_count)}
            />
            <MetricRow
              label="Sale listings"
              value={formatNumber(supporting_context.sale_listing_count)}
            />
            <MetricRow
              label="Transactions"
              value={formatNumber(supporting_context.transaction_count)}
            />
            <MetricRow
              label="Parcels"
              value={formatNumber(supporting_context.parcel_count)}
            />
            <MetricRow
              label="Vacant / available parcels"
              value={formatNumber(
                supporting_context.vacant_or_available_parcel_count
              )}
            />
            <MetricRow
              label="Location"
              value={`${selectedDistrict.location.latitude}, ${selectedDistrict.location.longitude}`}
            />
          </div>
        </Panel>
      </div>

      <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-sand-50/40">
        <p>
          {communityMeta.project} · {communityMeta.track}
        </p>
        <p className="mt-1">
          Methodology {communityMeta.methodology_version} · Generated{" "}
          {new Date(communityMeta.generated_at).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          · {communityMeta.district_count} districts
        </p>
      </footer>
    </>
  );
}
