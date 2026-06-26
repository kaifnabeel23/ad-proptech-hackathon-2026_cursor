import { formatNumber, formatScore } from "@/lib/communityData";

export type MetricFormat = "count" | "index";

export interface MetricCardProps {
  label: string;
  value: number;
  format?: MetricFormat;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  format = "index",
  className = "",
}: MetricCardProps) {
  const isIndex = format === "index";
  const display = isIndex ? formatScore(value) : formatNumber(value);
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`card-interactive rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {display}
        {isIndex ? (
          <span className="text-sm font-semibold text-slate-300"> /100</span>
        ) : null}
      </p>
      {isIndex ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-sky-400 to-teal-400 animate-bar-grow"
            style={{ width: `${clamped}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
