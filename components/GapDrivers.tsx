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
      <p className={`text-sm text-sand-50/55 ${className}`}>
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
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              isMixedEvidence
                ? "bg-amber-400/10 text-amber-200 ring-amber-400/25"
                : "border border-white/10 bg-night-900/60 text-sand-50/75 ring-transparent"
            }`}
          >
            {driver}
          </span>
        );
      })}
    </div>
  );
}
