"use client";

import { useCallback, useEffect, useState } from "react";
import SectionCard from "@/components/SectionCard";
import type { ConfidenceLevel, District } from "@/lib/communityTypes";
import type {
  DistrictRecord,
  DistrictRecommendation,
} from "@/lib/communityGapTypes";
import { frontendFallbackRecommendation } from "@/lib/frontendFallbackRecommendation";
import { fetchRecommendationFromApi } from "@/lib/recommendationClient";

type DisplayStatus = "loading" | "local" | "ai" | "fallback";

const STATUS_META: Record<
  DisplayStatus,
  { label: string; source: string; tone: string; dot: string }
> = {
  loading: {
    label: "Generating",
    source: "Reading structured evidence",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400 animate-pulse",
  },
  ai: {
    label: "AI recommendation",
    source: "OpenRouter",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  fallback: {
    label: "Evidence-based fallback",
    source: "Deterministic pipeline",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  local: {
    label: "Generated from local evidence",
    source: "Offline fallback",
    tone: "border-amber-200 bg-amber-50/80 text-amber-700",
    dot: "bg-amber-400",
  },
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
      className={`rounded-xl border px-4 py-3.5 transition hover:-translate-y-0.5 ${
        primary
          ? "border-amber-200 bg-amber-50/80 shadow-sm sm:col-span-2 hover:border-amber-300 hover:shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          primary ? "text-amber-700" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 leading-relaxed ${
          primary
            ? "text-base font-medium text-slate-800"
            : "text-sm text-slate-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.tone}`}
      role="status"
      aria-live="polite"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-60">
        · {meta.source}
      </span>
    </span>
  );
}

export interface RecommendationPanelProps {
  district: District;
  confidenceLevel: ConfidenceLevel;
  id?: string;
  className?: string;
}

export default function RecommendationPanel({
  district,
  confidenceLevel,
  id,
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
        const result = await fetchRecommendationFromApi(
          target as DistrictRecord,
          { signal }
        );

        if (signal?.aborted) return;

        setRecommendation(result.recommendation);
        setDisplayStatus(result.source === "llm" ? "ai" : "fallback");
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
      id={id}
      featured
      accent="amber"
      eyebrow="Copilot · AI recommendation"
      title="Recommended next step"
      description="AI explains deterministic evidence from the data pipeline — never invents data."
      className={`h-full ${className}`}
      action={
        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
          Confidence: {confidenceLevel}
        </span>
      }
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <StatusBadge status={status} />
        <button
          type="button"
          onClick={() => loadFromApi(district)}
          disabled={isFetching}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
        >
          <svg
            className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Refresh
        </button>
      </div>

      {status === "loading" ? (
        <p className="mt-3 shrink-0 text-sm text-slate-500">
          Generating recommendation from structured evidence...
        </p>
      ) : null}

      <div className="mt-5 grid flex-1 gap-3 sm:grid-cols-2">
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
        <RecommendationField label="Main gap" value={recommendation.main_gap} />
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
