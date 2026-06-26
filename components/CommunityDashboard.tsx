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
    tag: "Priority",
  },
  { step: "2", name: "Al Raha Beach", hint: "Mixed evidence", tag: "Mixed" },
  { step: "3", name: "Al Khalidiyah", hint: "Low urgency", tag: "Low" },
] as const;

const SECTION_LINKS = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "copilot", label: "Copilot" },
  { id: "details", label: "Details" },
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
  const [activeSection, setActiveSection] = useState<string>("overview");

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

  useEffect(() => {
    const sections = SECTION_LINKS.map((link) =>
      document.getElementById(link.id)
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
        <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-800">
            No district data is available. Regenerate{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-amber-200">
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

      <div id="dashboard" className="mt-6 space-y-6 lg:space-y-7">
        {districtMissingMessage ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="status"
          >
            {districtMissingMessage}
          </div>
        ) : null}

        <SectionCard
          eyebrow="Demo walkthrough"
          title="Pick a district"
          description="Quick picks for the demo — all panels update instantly."
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
                  aria-pressed={active}
                  className={`card-interactive group relative overflow-hidden rounded-xl border px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-md ring-1 ring-amber-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                          active
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}
                      >
                        {pick.step}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {pick.name}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                        active
                          ? "bg-amber-100 text-amber-700 ring-amber-200"
                          : "bg-slate-50 text-slate-400 ring-slate-200"
                      }`}
                    >
                      {pick.tag}
                    </span>
                  </span>
                  <span className="mt-2.5 block text-xs leading-relaxed text-slate-500">
                    {available ? pick.hint : "Not in dataset"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <label
              htmlFor="district-select"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Browse all {districtCount} districts
            </label>
            <div className="relative mt-2 lg:max-w-md">
              <select
                id="district-select"
                value={selectedDistrict.district}
                onChange={(e) => {
                  setDistrictMissingMessage(null);
                  setSelectedName(e.target.value);
                }}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              >
                {sortedDistricts.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.rank != null ? `#${d.rank} — ` : ""}
                    {d.district}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </SectionCard>

        <nav
          aria-label="Dashboard sections"
          className="glass sticky top-3 z-20 flex gap-1 overflow-x-auto rounded-xl p-1.5 shadow-sm scrollbar-thin"
        >
          {SECTION_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "text-amber-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {link.label}
                {isActive ? (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-amber-500" />
                ) : null}
              </a>
            );
          })}
        </nav>

        <div id="overview" className="scroll-mt-20 space-y-6 lg:space-y-7">
          {/* Equal-height row: district profile + classification */}
          <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_360px] lg:gap-6">
            <div className="card-interactive glass flex h-full flex-col justify-center rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Selected district
                </span>
                {selectedDistrict.rank != null ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                    Rank #{selectedDistrict.rank} of {districtCount}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 lg:text-[2.5rem] lg:leading-tight">
                {selectedDistrict.district}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  {selectedDistrict.area_type}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  {selectedDistrict.profile}
                </span>
              </div>
            </div>

            <ConfidenceBadge district={selectedDistrict} />
          </div>

          <SectionCard
            eyebrow="Pipeline scores"
            title="Deterministic 0–100 scores"
            description="Scores come straight from the data layer — not recalculated in the UI."
          >
            <div className="grid items-stretch gap-4 lg:grid-cols-[1.4fr_1fr]">
              <ScoreCard
                label="Community gap score"
                value={scores.community_gap_score}
                emphasized
                accent="amber"
                caption="Composite priority — community need vs amenity shortage."
                className="h-full"
              />
              <div className="grid h-full gap-3 sm:grid-cols-3">
                <ScoreCard
                  label="Community need"
                  value={scores.community_need_score}
                  accent="sky"
                  className="h-full"
                />
                <ScoreCard
                  label="Amenity shortage"
                  value={scores.amenity_shortage_score}
                  accent="teal"
                  className="h-full"
                />
                <ScoreCard
                  label="Confidence"
                  value={scores.confidence_score}
                  accent="emerald"
                  className="h-full"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Equal-height row: evidence + copilot */}
        <div
          id="evidence-copilot"
          className="grid items-stretch gap-6 scroll-mt-20 lg:grid-cols-2"
        >
          <EvidencePanel
            id="evidence"
            className="order-2 h-full lg:order-1"
            evidence_bullets={selectedDistrict.evidence_bullets}
            top_gap_drivers={selectedDistrict.top_gap_drivers}
            confidence_reason={classification.confidence_reason}
          />

          <div id="copilot" className="order-1 h-full lg:order-2">
            <RecommendationPanel
              key={selectedDistrict.district}
              id="copilot-panel"
              district={selectedDistrict}
              confidenceLevel={classification.confidence_level}
              className="h-full"
            />
          </div>
        </div>

        <div id="details" className="scroll-mt-20 space-y-6">
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <SectionCard
              eyebrow="Community metrics"
              title="Demand & resident experience"
              description="Demand, mobility, and resident experience indices."
              className="h-full"
            >
              <div className="grid h-full gap-3 sm:grid-cols-2">
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

            <AmenityBreakdown
              amenity_counts={amenity_counts}
              className="h-full"
            />
          </div>

          <SupportingContext
            supporting_context={supporting_context}
            intervention_feasibility_score={scores.intervention_feasibility_score}
          />
        </div>
      </div>

      <footer className="mt-16 border-t border-slate-200 pt-6 text-xs text-slate-400">
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
