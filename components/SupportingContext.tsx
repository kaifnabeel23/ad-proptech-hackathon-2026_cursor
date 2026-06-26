import { formatNumber, formatScore } from "@/lib/communityData";
import type { SupportingContext as SupportingContextData } from "@/lib/communityTypes";

const CONTEXT_FIELDS = [
  { key: "listing_count", label: "Listings" },
  { key: "available_listing_count", label: "Available listings" },
  { key: "transaction_count", label: "Transactions" },
  { key: "parcel_count", label: "Parcels" },
  {
    key: "vacant_or_available_parcel_count",
    label: "Vacant / available parcels",
  },
] as const satisfies ReadonlyArray<{
  key: keyof SupportingContextData;
  label: string;
}>;

export interface SupportingContextProps {
  supporting_context: SupportingContextData;
  intervention_feasibility_score: number;
  className?: string;
}

export default function SupportingContext({
  supporting_context,
  intervention_feasibility_score,
  className = "",
}: SupportingContextProps) {
  const contextItems = CONTEXT_FIELDS.filter(
    (field) => field.key in supporting_context
  ).map((field) => ({
    label: field.label,
    value: formatNumber(supporting_context[field.key]),
  }));

  const items = [
    ...contextItems,
    {
      label: "Intervention feasibility",
      value: `${formatScore(intervention_feasibility_score)}/100`,
    },
  ];

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/60 px-5 py-5 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Supporting context
        </h2>
        <p className="text-xs text-slate-400">
          Supporting signals only — core score remains community need vs amenity
          shortage.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition hover:border-slate-300 hover:shadow-sm"
          >
            <dt className="text-[11px] leading-tight text-slate-400">
              {item.label}
            </dt>
            <dd className="mt-1.5 text-base font-bold tabular-nums text-slate-700">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
