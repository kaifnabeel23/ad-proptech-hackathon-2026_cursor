"use client";

import { useCallback, useEffect, useState } from "react";
import SectionCard from "@/components/SectionCard";
import type { ConfidenceLevel, District } from "@/lib/communityTypes";
import type { DistrictRecord, DistrictRecommendation } from "@/lib/communityGapTypes";
import { frontendFallbackRecommendation } from "@/lib/frontendFallbackRecommendation";
import { fetchRecommendationFromApi } from "@/lib/recommendationClient";

type DisplayStatus = "loading" | "local" | "ai" | "ready";

const STATUS_LABELS: Record<Exclude<DisplayStatus, "ready">, string> = {
  loading: "Generating recommendation from structured evidence...",
  local: "Generated from local evidence",
  ai: "AI recommendation",
};

function RecommendationField({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        primary
          ? "border-amber-400/20 bg-amber-400/[0.05] sm:col-span-2"
          : "border-white/[0.06] bg-night-900/40"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-50/45">
        {label}
      </p>
      <p
        className={`mt-2 leading-relaxed text-sand-50 ${
          primary ? "text-base font-medium" : "text-sm text-sand-50/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBanner({ status }: { status: DisplayStatus }) {
  if (status === "ready") return null;

  const tone =
    status === "loading"
      ? "border-white/10 bg-night-900/50 text-sand-50/70"
      : status === "ai"
        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
        : "border-white/10 bg-night-900/50 text-sand-50/55";

  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
      role="status"
      aria-live="polite"
    >
      {STATUS_LABELS[status]}
    </p>
  );
}

export interface RecommendationPanelProps {
  district: District;
  confidenceLevel: ConfidenceLevel;
  className?: string;
}

export default function RecommendationPanel({
  district,
  confidenceLevel,
  className = "",
}: RecommendationPanelProps) {
  const [recommendation, setRecommendation] = useState<DistrictRecommendation>(
    () => frontendFallbackRecommendation(district)
  );
  const [displayStatus, setDisplayStatus] = useState<DisplayStatus>("local");
  const [isFetching, setIsFetching] = useState(false);

  const loadFromApi = useCallback(
    async (target: District, signal?: AbortSignal) => {
      setIsFetching(true);
      setDisplayStatus("loading");

      try {
        const result = await fetchRecommendationFromApi(target as DistrictRecord, {
          signal,
        });

        if (signal?.aborted) return;

        setRecommendation(result.recommendation);
        setDisplayStatus(result.source === "llm" ? "ai" : "ready");
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;

        setRecommendation(frontendFallbackRecommendation(target));
        setDisplayStatus("local");
      } finally {
        if (!signal?.aborted) {
          setIsFetching(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    setRecommendation(frontendFallbackRecommendation(district));
    setDisplayStatus("local");

    const controller = new AbortController();
    loadFromApi(district, controller.signal);

    return () => controller.abort();
  }, [district, loadFromApi]);

  const status: DisplayStatus = isFetching ? "loading" : displayStatus;

  return (
    <SectionCard
      featured
      title="Copilot recommendation"
      description="Planner-style next step from pipeline evidence — always shown beside deterministic scores."
      className={className}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="inline-flex w-fit items-center rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200 ring-1 ring-inset ring-amber-400/30">
            Confidence: {confidenceLevel}
          </span>
          <StatusBanner status={status} />
        </div>
        <button
          type="button"
          onClick={() => loadFromApi(district)}
          disabled={isFetching}
          className="shrink-0 rounded-lg border border-white/15 bg-night-900/50 px-3 py-1.5 text-xs font-semibold text-sand-50/90 hover:border-white/30 disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <RecommendationField
          label="District summary"
          value={recommendation.district_summary}
          primary
        />
        <RecommendationField
          label="Recommended intervention"
          value={recommendation.recommended_intervention}
          primary
        />
        <RecommendationField
          label="Main gap"
          value={recommendation.main_gap}
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
    </SectionCard>
  );
}
