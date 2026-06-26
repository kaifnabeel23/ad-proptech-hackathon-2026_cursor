import { formatNumber, formatScore } from "@/lib/communityData";

export type MetricFormat = "count" | "index";

export interface MetricCardProps {
  label: string;
  value: number;
  /** count = population-style integers; index = 0–100 pipeline indices */
  format?: MetricFormat;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  format = "index",
  className = "",
}: MetricCardProps) {
  const display =
    format === "count" ? formatNumber(value) : `${formatScore(value)}/100`;

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-night-800/40 p-4 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-sand-50">
        {display}
      </p>
    </div>
  );
}
