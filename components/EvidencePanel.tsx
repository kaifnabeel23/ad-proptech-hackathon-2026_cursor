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
  className?: string;
}

export default function EvidencePanel({
  evidence_bullets,
  top_gap_drivers,
  confidence_reason,
  className = "",
}: EvidencePanelProps) {
  const mixedEvidence = hasMixedEvidence(evidence_bullets, top_gap_drivers);

  return (
    <SectionCard
      title="Why this district is flagged"
      description="Generated from deterministic scoring before AI interpretation."
      className={className}
    >
      {mixedEvidence ? (
        <div className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3">
          <p className="text-sm font-semibold text-amber-200">
            Mixed evidence
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sand-50/75">
            Pipeline signals do not fully agree for this district. Review the
            evidence below before acting on the recommendation.
          </p>
        </div>
      ) : null}

      {evidence_bullets.length > 0 ? (
        <ul className="space-y-2.5">
          {evidence_bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3 rounded-xl border border-white/[0.08] bg-night-900/55 px-4 py-3.5 text-[15px] leading-relaxed text-sand-50"
            >
              <span
                aria-hidden
                className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400"
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-sand-50/55">
          No evidence bullets for this district.
        </p>
      )}

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-sand-50/45">
          Top gap drivers
        </p>
        <GapDrivers top_gap_drivers={top_gap_drivers} className="mt-3" />
      </div>

      {confidence_reason ? (
        <p className="mt-5 rounded-lg bg-night-900/40 px-3 py-2 text-sm leading-relaxed text-sand-50/60">
          {confidence_reason}
        </p>
      ) : null}
    </SectionCard>
  );
}
