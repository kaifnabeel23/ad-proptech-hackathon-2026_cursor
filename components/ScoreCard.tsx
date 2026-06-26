import { formatScore } from "@/lib/communityData";

export interface ScoreCardProps {
  label: string;
  value: number;
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
      className={`rounded-xl border p-4 lg:p-5 ${
        emphasized
          ? "border-amber-400/30 bg-amber-400/[0.08]"
          : "border-white/[0.08] bg-night-900/40"
      } ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-50/50">
        {label}
      </p>
      <p
        className={`mt-2 font-bold tabular-nums tracking-tight text-sand-50 ${
          emphasized ? "text-4xl" : "text-3xl"
        }`}
      >
        {formatScore(value)}
        <span
          className={`font-semibold text-sand-50/35 ${
            emphasized ? "text-xl" : "text-lg"
          }`}
        >
          /100
        </span>
      </p>
    </div>
  );
}
