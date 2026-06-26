import { formatScore, getPriorityLabel } from "@/lib/communityData";
import type {
  ConfidenceLevel,
  District,
  GapLevel,
} from "@/lib/communityTypes";

const CONFIDENCE_EXPLANATIONS: Record<ConfidenceLevel, string> = {
  High: "Multiple pipeline signals agree — stronger basis for action.",
  Medium: "Mixed evidence — some signals disagree; validate before acting.",
  Low: "Limited signal agreement — treat as a weak or inconclusive read.",
};

function levelTone(level: GapLevel | ConfidenceLevel): string {
  switch (level) {
    case "High":
      return "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30";
    case "Medium":
      return "bg-amber-400/15 text-amber-200 ring-amber-400/30";
    case "Low":
      return "bg-sky-400/15 text-sky-200 ring-sky-400/30";
  }
}

function LevelPill({
  label,
  level,
  large = false,
}: {
  label: string;
  level: GapLevel | ConfidenceLevel;
  large?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${levelTone(level)} ${
        large ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      {label}: {level}
    </span>
  );
}

export interface ConfidenceBadgeProps {
  district: District;
  className?: string;
}

export default function ConfidenceBadge({
  district,
  className = "",
}: ConfidenceBadgeProps) {
  const { classification, scores } = district;
  const priorityLabel = getPriorityLabel(district);

  return (
    <div
      className={`rounded-2xl border border-white/[0.1] bg-night-800/60 p-5 lg:p-6 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
        Classification &amp; confidence
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <LevelPill
          label="Confidence"
          level={classification.confidence_level}
          large
        />
        <LevelPill label="Gap level" level={classification.gap_level} />
      </div>

      <p className="mt-3 text-sm font-semibold leading-snug text-amber-300/95">
        {priorityLabel}
      </p>

      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-sand-50">
        {formatScore(scores.community_gap_score)}
        <span className="text-lg font-semibold text-sand-50/40">/100</span>
        <span className="ml-2 text-sm font-medium text-sand-50/50">
          gap score
        </span>
      </p>

      <p className="mt-3 text-sm leading-relaxed text-sand-50/70">
        {CONFIDENCE_EXPLANATIONS[classification.confidence_level]}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-sand-50/55">
        {classification.confidence_reason}
      </p>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-night-900/50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
          Recommended intervention
        </p>
        <p className="mt-1 text-sm font-semibold text-sand-50">
          {classification.recommended_intervention_category}
        </p>
        <p className="mt-1 text-xs text-sand-50/50">
          Priority: {classification.recommendation_priority}
        </p>
      </div>
    </div>
  );
}
