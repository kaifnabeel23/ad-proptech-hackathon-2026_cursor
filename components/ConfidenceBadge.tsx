import { formatScore, getPriorityLabel } from "@/lib/communityData";
import type {
  ConfidenceLevel,
  District,
  GapLevel,
} from "@/lib/communityTypes";
import ProgressRing from "./ProgressRing";

const CONFIDENCE_EXPLANATIONS: Record<ConfidenceLevel, string> = {
  High: "Multiple pipeline signals agree — stronger basis for action.",
  Medium: "Mixed evidence — some signals disagree; validate before acting.",
  Low: "Limited signal agreement — treat as a weak or inconclusive read.",
};

function levelTone(level: GapLevel | ConfidenceLevel): string {
  switch (level) {
    case "High":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Low":
      return "bg-sky-50 text-sky-700 ring-sky-200";
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
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${levelTone(level)} ${
        large ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
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
      className={`card-interactive flex h-full flex-col rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/80 via-white to-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)] lg:p-6 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        Classification &amp; confidence
      </p>

      <div className="mt-4 flex flex-1 flex-col justify-center gap-4">
        <div className="flex items-center gap-4">
          <ProgressRing
            value={Math.max(0, Math.min(100, scores.community_gap_score))}
            accent="amber"
            size={88}
            stroke={8}
          >
            <span className="text-xl font-bold tabular-nums text-slate-900">
              {formatScore(scores.community_gap_score)}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              gap /100
            </span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <LevelPill
                label="Confidence"
                level={classification.confidence_level}
                large
              />
              <LevelPill label="Gap" level={classification.gap_level} />
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-amber-700">
              {priorityLabel}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          {CONFIDENCE_EXPLANATIONS[classification.confidence_level]}
        </p>

        {classification.confidence_reason ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            {classification.confidence_reason}
          </p>
        ) : null}

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Recommended intervention
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {classification.recommended_intervention_category}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
            Priority
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${levelTone(
                classification.recommendation_priority as GapLevel
              )}`}
            >
              {classification.recommendation_priority}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
