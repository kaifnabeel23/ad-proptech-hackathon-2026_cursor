"use client";

import { useMemo, useState, type ReactNode } from "react";
import CommunityHero from "@/components/CommunityHero";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import AmenityBreakdown from "@/components/AmenityBreakdown";
import EvidencePanel from "@/components/EvidencePanel";
import MetricCard from "@/components/MetricCard";
import RecommendationPanel from "@/components/RecommendationPanel";
import SupportingContext from "@/components/SupportingContext";
import ScoreCard from "@/components/ScoreCard";
import {
  communityMeta,
} from "@/lib/communityData";
import type { District } from "@/lib/communityTypes";

const DEMO_PICKS = [
  { name: "Al Ghadeer", hint: "Top priority" },
  { name: "Al Raha Beach", hint: "Mixed evidence" },
  { name: "Al Khalidiyah", hint: "Low urgency" },
] as const;

interface CommunityDashboardProps {
  districts: District[];
  defaultDistrict: District;
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

export default function CommunityDashboard({
  districts,
  defaultDistrict,
}: CommunityDashboardProps) {
  const [selectedName, setSelectedName] = useState(defaultDistrict.district);

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

  const { community_metrics, amenity_counts, supporting_context, scores, classification } =
    selectedDistrict;

  return (
    <>
      <CommunityHero />

      <div id="dashboard" className="mt-12 space-y-8">
        {/* District controls */}
        <section className="rounded-xl border border-white/[0.08] bg-night-800/30 p-5">
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

        {/* District summary */}
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
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
          </div>
          <ConfidenceBadge district={selectedDistrict} />
        </div>

        {/* Community metrics */}
        <Panel
          title="Community metrics"
          description="Demand, mobility, and experience signals from the pipeline."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Population estimate"
              value={community_metrics.population_estimate}
              format="count"
            />
            <MetricCard
              label="Service demand index"
              value={community_metrics.service_demand_index}
            />
            <MetricCard
              label="Mobility score"
              value={community_metrics.mobility_score}
            />
            <MetricCard
              label="Resident experience"
              value={community_metrics.resident_experience_score}
            />
          </div>
        </Panel>

        {/* Pipeline scores */}
        <Panel
          title="Gap & confidence scores"
          description="All values from the deterministic pipeline — not recalculated in the browser."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              label="Community gap score"
              value={scores.community_gap_score}
              emphasized
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
        </Panel>

        <AmenityBreakdown amenity_counts={amenity_counts} />

        <RecommendationPanel
          district={selectedDistrict}
          confidenceLevel={classification.confidence_level}
        />

        <EvidencePanel
          evidence_bullets={selectedDistrict.evidence_bullets}
          top_gap_drivers={selectedDistrict.top_gap_drivers}
          confidence_reason={classification.confidence_reason}
        />

        <SupportingContext
          supporting_context={supporting_context}
          intervention_feasibility_score={scores.intervention_feasibility_score}
        />
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
