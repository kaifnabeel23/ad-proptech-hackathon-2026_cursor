"use client";

import { useEffect, useMemo, useState } from "react";
import CommunityHero from "@/components/CommunityHero";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import AmenityBreakdown from "@/components/AmenityBreakdown";
import EvidencePanel from "@/components/EvidencePanel";
import MetricCard from "@/components/MetricCard";
import RecommendationPanel from "@/components/RecommendationPanel";
import SectionCard from "@/components/SectionCard";
import SupportingContext from "@/components/SupportingContext";
import ScoreCard from "@/components/ScoreCard";
import { DEFAULT_DISTRICT_NAME } from "@/lib/communityData";
import type { District } from "@/lib/communityTypes";

const DEMO_PICKS = [
  {
    step: "1",
    name: "Al Ghadeer",
    hint: "Top priority in the current dataset",
  },
  { step: "2", name: "Al Raha Beach", hint: "Mixed evidence" },
  { step: "3", name: "Al Khalidiyah", hint: "Low urgency" },
] as const;

const SECTION_LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#evidence", label: "Evidence" },
  { href: "#copilot", label: "Copilot" },
  { href: "#details", label: "Details" },
] as const;

interface DashboardMeta {
  project: string;
  track: string;
  generated_at: string;
  methodology_version: string;
  district_count: number;
}

interface CommunityDashboardProps {
  districts: District[];
  defaultDistrict: District;
  districtCount: number;
  meta: DashboardMeta;
}

export default function CommunityDashboard({
  districts,
  defaultDistrict,
  districtCount,
  meta,
}: CommunityDashboardProps) {
  const [selectedName, setSelectedName] = useState(
    () => defaultDistrict.district || DEFAULT_DISTRICT_NAME
  );
  const [districtMissingMessage, setDistrictMissingMessage] = useState<
    string | null
  >(null);

  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.district.localeCompare(b.district);
    });
  }, [districts]);

  const selectedDistrict = useMemo(() => {
    const name = selectedName?.trim() || defaultDistrict.district;
    return districts.find((d) => d.district === name) ?? defaultDistrict;
  }, [districts, selectedName, defaultDistrict]);

  const isDistrictMissing = useMemo(() => {
    const name = selectedName?.trim();
    if (!name) return false;
    return !districts.some((d) => d.district === name);
  }, [districts, selectedName]);

  useEffect(() => {
    if (!selectedName?.trim()) {
      setSelectedName(defaultDistrict.district);
      return;
    }

    if (isDistrictMissing) {
      setDistrictMissingMessage(
        `"${selectedName}" is not in the pipeline dataset. Showing ${defaultDistrict.district} instead.`
      );
      setSelectedName(defaultDistrict.district);
    }
  }, [isDistrictMissing, selectedName, defaultDistrict.district]);

  const {
    community_metrics,
    amenity_counts,
    supporting_context,
    scores,
    classification,
  } = selectedDistrict;

  if (districts.length === 0) {
    return (
      <>
        <CommunityHero />
        <div className="mt-10 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6">
          <p className="text-sm text-sand-50/75">
            No district data is available. Regenerate{" "}
            <code className="rounded bg-night-900 px-1.5 py-0.5 text-xs">
              processed/community_gap_outputs.json
            </code>
            .
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <CommunityHero />

      <div id="dashboard" className="mt-10 space-y-6 lg:space-y-8">
        {districtMissingMessage ? (
          <div
            className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-sand-50/75"
            role="status"
          >
            {districtMissingMessage}
          </div>
        ) : null}

        <SectionCard
          title="Demo districts"
          description="Pick a walkthrough district — all panels update instantly."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {DEMO_PICKS.map((pick) => {
              const active = selectedDistrict.district === pick.name;
              const available = districts.some((d) => d.district === pick.name);
              return (
                <button
                  key={pick.name}
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    setDistrictMissingMessage(null);
                    setSelectedName(pick.name);
                  }}
                  className={`rounded-xl border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/25"
                      : "border-white/10 bg-night-900/40 hover:border-white/20"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        active
                          ? "bg-amber-400/20 text-amber-200"
                          : "bg-white/5 text-sand-50/50"
                      }`}
                    >
                      {pick.step}
                    </span>
                    <span className="font-semibold text-sand-50">
                      {pick.name}
                    </span>
                  </span>
                  <span className="mt-1.5 block pl-8 text-xs text-sand-50/55">
                    {available ? pick.hint : "Not in dataset"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-white/[0.06] pt-5">
            <label
              htmlFor="district-select"
              className="text-xs font-semibold uppercase tracking-wider text-sand-50/45"
            >
              All {districtCount} districts
            </label>
            <select
              id="district-select"
              value={selectedDistrict.district}
              onChange={(e) => {
                setDistrictMissingMessage(null);
                setSelectedName(e.target.value);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-night-900 px-3 py-2.5 text-sm text-sand-50 outline-none focus:border-amber-400/40 lg:max-w-md"
            >
              {sortedDistricts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.rank != null ? `#${d.rank} — ` : ""}
                  {d.district}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:gap-6">
          <div
            id="overview"
            className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-night-800/30 px-6 py-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-sand-50/45">
              Selected district
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-sand-50 lg:text-4xl">
              {selectedDistrict.district}
            </h2>
            <p className="mt-2 text-sm text-sand-50/60">
              {selectedDistrict.area_type} · {selectedDistrict.profile}
              {selectedDistrict.rank != null
                ? ` · Rank ${selectedDistrict.rank} of ${districtCount}`
                : ""}
            </p>
          </div>
          <ConfidenceBadge district={selectedDistrict} />
        </div>

        <nav
          aria-label="Dashboard sections"
          className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-night-900/95 px-2 py-2 backdrop-blur"
        >
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-sand-50/60 transition hover:bg-white/5 hover:text-sand-50 aria-[current]:bg-amber-400/15 aria-[current]:text-amber-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <SectionCard
          title="Pipeline scores"
          description="Deterministic 0–100 scores from the data layer — not recalculated here."
          className="scroll-mt-24"
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
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <EvidencePanel
            id="evidence"
            className="order-2 scroll-mt-24 lg:order-1"
            evidence_bullets={selectedDistrict.evidence_bullets}
            top_gap_drivers={selectedDistrict.top_gap_drivers}
            confidence_reason={classification.confidence_reason}
          />

          <div
            id="copilot"
            className="order-1 scroll-mt-24 lg:sticky lg:top-16 lg:order-2"
          >
            <RecommendationPanel
              key={selectedDistrict.district}
              id="copilot-panel"
              district={selectedDistrict}
              confidenceLevel={classification.confidence_level}
            />
          </div>
        </div>

        <div id="details" className="scroll-mt-24 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Community metrics"
              description="Demand, mobility, and resident experience."
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
            </SectionCard>

            <AmenityBreakdown amenity_counts={amenity_counts} />
          </div>

          <SupportingContext
            supporting_context={supporting_context}
            intervention_feasibility_score={scores.intervention_feasibility_score}
          />
        </div>
      </div>

      <footer className="mt-14 border-t border-white/[0.06] pt-6 text-xs text-sand-50/40">
        <p>
          {meta.project} · {meta.track}
        </p>
        <p className="mt-1">
          Methodology {meta.methodology_version} · Generated{" "}
          {meta.generated_at
            ? new Date(meta.generated_at).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "—"}
        </p>
      </footer>
    </>
  );
}
