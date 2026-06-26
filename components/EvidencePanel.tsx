import GapDrivers from "./GapDrivers";
import SectionCard from "./SectionCard";

const MIXED_EVIDENCE_MARKERS = [
  "mixed evidence",
  "mixed",
  "disagree",
  "do not fully align",
  "cautiously",
] as const;

function hasMixedEvidence(
  evidence_bullets: string[],
  top_gap_drivers: string[]
): boolean {
  if (top_gap_drivers.includes("Mixed evidence")) {
    return true;
  }

  const combined = [...evidence_bullets, ...top_gap_drivers]
    .join(" ")
    .toLowerCase();

  return MIXED_EVIDENCE_MARKERS.some((marker) => combined.includes(marker));
}

export interface EvidencePanelProps {
  evidence_bullets: string[];
  top_gap_drivers: string[];
  confidence_reason?: string;
  id?: string;
  className?: string;
}

export default function EvidencePanel({
  evidence_bullets,
  top_gap_drivers,
  confidence_reason,
  id,
  className = "",
}: EvidencePanelProps) {
  const mixedEvidence = hasMixedEvidence(evidence_bullets, top_gap_drivers);

  return (
    <SectionCard
      id={id}
      accent="teal"
      eyebrow="Evidence stack"
      title="Why this district is flagged"
      description="Deterministic scoring before AI interpretation."
      className={`h-full ${className}`}
    >
      {mixedEvidence ? (
        <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 5.5v3M8 11h.01M8 1.5l6.5 11.5h-13L8 1.5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Mixed evidence — read carefully
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-700/80">
              Pipeline signals do not fully agree for this district. Review the
              evidence below before acting on the recommendation.
            </p>
          </div>
        </div>
      ) : null}

      {evidence_bullets.length > 0 ? (
        <ul className="flex flex-1 flex-col gap-2.5">
          {evidence_bullets.map((bullet, index) => (
            <li
              key={bullet}
              className="group/row flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] leading-relaxed text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[10px] font-bold text-teal-700 ring-1 ring-inset ring-teal-200">
                {index + 1}
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          No evidence bullets for this district.
        </p>
      )}

      <div className="mt-6 shrink-0 border-t border-slate-200 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Top gap drivers
        </p>
        <GapDrivers top_gap_drivers={top_gap_drivers} className="mt-3" />
      </div>

      {confidence_reason ? (
        <p className="mt-4 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-500">
          {confidence_reason}
        </p>
      ) : null}
    </SectionCard>
  );
}
