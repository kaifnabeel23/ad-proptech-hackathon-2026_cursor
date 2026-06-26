import { formatScore } from "@/lib/communityData";
import ProgressRing, { type RingAccent } from "./ProgressRing";

export interface ScoreCardProps {
  label: string;
  value: number;
  emphasized?: boolean;
  accent?: RingAccent;
  caption?: string;
  className?: string;
}

export default function ScoreCard({
  label,
  value,
  emphasized = false,
  accent = "amber",
  caption,
  className = "",
}: ScoreCardProps) {
  const clamped = Math.max(0, Math.min(100, value));

  if (emphasized) {
    return (
      <div
        className={`card-interactive flex h-full flex-col justify-center rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-white p-5 lg:p-6 ${className}`}
      >
        <div className="flex items-center gap-5">
          <ProgressRing value={clamped} accent={accent} size={100} stroke={9}>
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {formatScore(value)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              / 100
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              {label}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-slate-500">
              {caption ?? "Composite priority signal from the data pipeline."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const barColor =
    accent === "teal"
      ? "from-teal-400 to-teal-300"
      : accent === "violet"
        ? "from-violet-400 to-violet-300"
        : accent === "sky"
          ? "from-sky-400 to-sky-300"
          : accent === "emerald"
            ? "from-emerald-400 to-emerald-300"
            : "from-amber-400 to-amber-300";

  return (
    <div
      className={`card-interactive flex h-full flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {formatScore(value)}
        <span className="text-sm font-semibold text-slate-300"> /100</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full origin-left rounded-full bg-gradient-to-r ${barColor} animate-bar-grow`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
