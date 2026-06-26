import { formatNumber } from "@/lib/communityData";
import type { AmenityCounts } from "@/lib/communityTypes";

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
    <section
      className={`rounded-xl border border-white/[0.08] bg-night-800/40 p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-sand-50">
            Amenity breakdown
          </h2>
          <p className="mt-1 text-xs text-sand-50/50">
            Amenity counts from OpenStreetMap layer
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
          OSM
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {CATEGORY_ROWS.map((row) => {
          const count = amenity_counts[row.key];
          const barWidth = `${(count / barMax) * 100}%`;

          return (
            <li key={row.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-sand-50/70">{row.label}</span>
                <span className="font-semibold tabular-nums text-sand-50">
                  {formatNumber(count)}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-night-900/80"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-emerald-400/50"
                  style={{ width: barWidth }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.06] bg-night-900/50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
            Total amenities
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-sand-50">
            {formatNumber(amenity_counts.total_amenities)}
          </p>
        </div>
        {"amenity_diversity_count" in amenity_counts ? (
          <div className="rounded-lg border border-white/[0.06] bg-night-900/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
              Category diversity
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-sand-50">
              {formatNumber(amenity_counts.amenity_diversity_count)}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
