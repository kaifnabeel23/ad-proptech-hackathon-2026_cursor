"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConfidenceLevel, District } from "@/lib/communityTypes";
import type { DistrictRecord, DistrictRecommendation } from "@/lib/communityGapTypes";
import { frontendFallbackRecommendation } from "@/lib/frontendFallbackRecommendation";
import { fetchRecommendationFromApi } from "@/lib/recommendationClient";

type RecommendationSource = "local" | "llm" | "fallback";

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
  const [source, setSource] = useState<RecommendationSource>("local");
  const [apiFailed, setApiFailed] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const loadFromApi = useCallback(
    async (target: District, signal?: AbortSignal) => {
      setIsFetching(true);
      setApiFailed(false);

      try {
        const result = await fetchRecommendationFromApi(target as DistrictRecord, {
          signal,
        });

        if (signal?.aborted) return;

        setRecommendation(result.recommendation);
        setSource(result.source);
        setApiFailed(false);
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;

        setRecommendation(frontendFallbackRecommendation(target));
        setSource("local");
        setApiFailed(true);
      } finally {
        if (!signal?.aborted) {
          setIsFetching(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const local = frontendFallbackRecommendation(district);
    setRecommendation(local);
    setSource("local");
    setApiFailed(false);

    const controller = new AbortController();
    loadFromApi(district, controller.signal);

    return () => controller.abort();
  }, [district, loadFromApi]);

  const handleRefresh = () => {
    loadFromApi(district);
  };

  return (
    <section
      className={`rounded-xl border border-white/[0.08] bg-night-800/40 p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-sand-50">
            AI recommendation
          </h2>
          <p className="mt-1 text-sm text-sand-50/55">
            Planner-style guidance from pipeline evidence — shown alongside
            deterministic scores.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-sand-50/90 transition hover:border-white/30 disabled:opacity-40"
        >
          {isFetching ? "Updating…" : "Refresh"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/25">
          Pipeline confidence: {confidenceLevel}
        </span>
        {source === "llm" ? (
          <span className="inline-flex items-center rounded-full bg-night-900 px-2.5 py-1 text-xs font-medium text-sand-50/70 ring-1 ring-inset ring-white/10">
            AI interpretation
          </span>
        ) : null}
        {apiFailed ? (
          <span className="text-xs text-sand-50/45">
            Generated from local evidence
          </span>
        ) : null}
        {isFetching && !apiFailed ? (
          <span className="text-xs text-sand-50/40">Updating recommendation…</span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
    </section>
  );
}
