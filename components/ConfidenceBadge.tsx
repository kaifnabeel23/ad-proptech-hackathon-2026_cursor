import { getPriorityLabel } from "@/lib/communityData";
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
      return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25";
    case "Medium":
      return "bg-amber-400/10 text-amber-300 ring-amber-400/25";
    case "Low":
      return "bg-sky-400/10 text-sky-300 ring-sky-400/25";
  }
}

function LevelPill({
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

export interface ConfidenceBadgeProps {
  district: District;
  className?: string;
}

export default function ConfidenceBadge({
  district,
  className = "",
}: ConfidenceBadgeProps) {
  const { classification } = district;
  const priorityLabel = getPriorityLabel(district);

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-night-800/40 p-5 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
        Classification &amp; confidence
      </p>

      <p className="mt-2 text-sm font-semibold text-amber-300/90">
        {priorityLabel}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <LevelPill label="Gap level" level={classification.gap_level} />
        <LevelPill
          label="Confidence"
          level={classification.confidence_level}
        />
        <span className="inline-flex items-center rounded-full bg-night-900/80 px-2.5 py-1 text-xs font-semibold text-sand-50/75 ring-1 ring-inset ring-white/10">
          Priority: {classification.recommendation_priority}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-sand-50/70">
        {CONFIDENCE_EXPLANATIONS[classification.confidence_level]}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-sand-50/60">
        {classification.confidence_reason}
      </p>

      <div className="mt-4 rounded-lg border border-white/[0.06] bg-night-900/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
          Recommended intervention
        </p>
        <p className="mt-1 text-sm font-semibold text-sand-50">
          {classification.recommended_intervention_category}
        </p>
      </div>
    </div>
  );
}
