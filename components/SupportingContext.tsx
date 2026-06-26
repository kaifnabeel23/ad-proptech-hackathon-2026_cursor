import { formatNumber, formatScore } from "@/lib/communityData";
import type { SupportingContext as SupportingContextData } from "@/lib/communityTypes";

const CONTEXT_FIELDS = [
  { key: "listing_count", label: "Listings" },
  { key: "available_listing_count", label: "Available listings" },
  { key: "transaction_count", label: "Transactions" },
  { key: "parcel_count", label: "Parcels" },
  { key: "vacant_or_available_parcel_count", label: "Vacant / available parcels" },
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
      className={`rounded-xl border border-white/[0.06] bg-night-800/25 px-5 py-4 ${className}`}
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-sand-50/90">
          Supporting context
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-sand-50/45">
          These signals support the story but do not replace the core gap score.
        </p>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-[7.5rem]">
            <dt className="text-xs text-sand-50/45">{item.label}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-sand-50/80">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
