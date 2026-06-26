import { formatScore } from "@/lib/communityData";

export interface ScoreCardProps {
  label: string;
  value: number;
  /** Visually emphasise primary scores such as community_gap_score */
  emphasized?: boolean;
  className?: string;
}

export default function ScoreCard({
  label,
  value,
  emphasized = false,
  className = "",
}: ScoreCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        emphasized
          ? "border-amber-400/25 bg-amber-400/[0.06]"
          : "border-white/[0.08] bg-night-800/40"
      } ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
        {label}
      </p>
      <p
        className={`mt-2 font-semibold tabular-nums tracking-tight text-sand-50 ${
          emphasized ? "text-3xl" : "text-2xl"
        }`}
      >
        {formatScore(value)}
        <span className="text-base font-medium text-sand-50/40">/100</span>
      </p>
    </div>
  );
}
