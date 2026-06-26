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

export default function AmenityBreakdown({
  amenity_counts,
  className = "",
}: AmenityBreakdownProps) {
  const categoryValues = CATEGORY_ROWS.map((row) => amenity_counts[row.key]);
  const barMax = Math.max(...categoryValues, 1);

  return (
    <SectionCard
      title="OSM amenity breakdown"
      description="Amenity counts from OpenStreetMap layer."
      className={className}
    >
      <div className="mb-4 flex justify-end">
        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
          OpenStreetMap
        </span>
      </div>

      <ul className="space-y-2.5">
        {CATEGORY_ROWS.map((row) => {
          const count = amenity_counts[row.key];
          const barWidth = `${(count / barMax) * 100}%`;

          return (
            <li key={row.key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-sand-50/70">{row.label}</span>
                <span className="font-semibold tabular-nums text-sand-50">
                  {formatNumber(count)}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-night-900/80"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-emerald-400/45"
                  style={{ width: barWidth }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
        <div className="rounded-lg bg-night-900/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-50/45">
            Total amenities
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-sand-50">
            {formatNumber(amenity_counts.total_amenities)}
          </p>
        </div>
        {"amenity_diversity_count" in amenity_counts ? (
          <div className="rounded-lg bg-night-900/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-50/45">
              Category diversity
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-sand-50">
              {formatNumber(amenity_counts.amenity_diversity_count)}
            </p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
