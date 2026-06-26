import { formatNumber } from "@/lib/communityData";
import type { AmenityCounts } from "@/lib/communityTypes";
import SectionCard from "./SectionCard";

const CATEGORY_ROWS = [
  { key: "education", label: "Education" },
  { key: "healthcare", label: "Healthcare" },
  { key: "retail", label: "Retail" },
  { key: "services", label: "Services" },
  { key: "community", label: "Community" },
  { key: "mobility", label: "Mobility" },
] as const satisfies ReadonlyArray<{
  key: keyof AmenityCounts;
  label: string;
}>;

export interface AmenityBreakdownProps {
  amenity_counts: AmenityCounts;
  className?: string;
}

const OSMBadge = (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
    OpenStreetMap
  </span>
);

export default function AmenityBreakdown({
  amenity_counts,
  className = "",
}: AmenityBreakdownProps) {
  const categoryValues = CATEGORY_ROWS.map((row) => amenity_counts[row.key]);
  const barMax = Math.max(...categoryValues, 1);

  return (
    <SectionCard
      accent="teal"
      eyebrow="OSM amenities"
      title="Amenity breakdown"
      description="Amenity counts from OpenStreetMap layer."
      action={OSMBadge}
      className={`h-full ${className}`}
    >
      <ul className="space-y-3">
        {CATEGORY_ROWS.map((row) => {
          const count = amenity_counts[row.key];
          const barWidth = `${(count / barMax) * 100}%`;
          const isZero = count === 0;

          return (
            <li key={row.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">{row.label}</span>
                <span
                  className={`font-semibold tabular-nums ${
                    isZero ? "text-slate-300" : "text-slate-800"
                  }`}
                >
                  {formatNumber(count)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                {isZero ? (
                  <div className="h-full w-full bg-[repeating-linear-gradient(90deg,rgba(148,163,184,0.2)_0,rgba(148,163,184,0.2)_4px,transparent_4px,transparent_8px)]" />
                ) : (
                  <div
                    className="h-full origin-left rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 animate-bar-grow"
                    style={{ width: barWidth }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total amenities
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-teal-700">
            {formatNumber(amenity_counts.total_amenities)}
          </p>
        </div>
        {"amenity_diversity_count" in amenity_counts ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Category diversity
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-teal-700">
              {formatNumber(amenity_counts.amenity_diversity_count)}
            </p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
