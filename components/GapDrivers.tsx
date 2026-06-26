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
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
              isMixedEvidence
                ? "bg-amber-400/12 text-amber-200 ring-amber-400/25"
                : "bg-night-900/70 text-sand-50/80 ring-white/10"
            }`}
          >
            {driver}
          </span>
        );
      })}
    </div>
  );
}
