export interface GapDriversProps {
  top_gap_drivers: string[];
  className?: string;
}

export default function GapDrivers({
  top_gap_drivers,
  className = "",
}: GapDriversProps) {
  if (top_gap_drivers.length === 0) {
    return (
      <p className={`text-sm text-slate-500 ${className}`}>
        No gap drivers flagged for this district.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {top_gap_drivers.map((driver) => {
        const isMixedEvidence = driver === "Mixed evidence";

        return (
          <span
            key={driver}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition hover:-translate-y-0.5 ${
              isMixedEvidence
                ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                : "bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isMixedEvidence ? "bg-amber-500" : "bg-teal-500"
              }`}
            />
            {driver}
          </span>
        );
      })}
    </div>
  );
}
