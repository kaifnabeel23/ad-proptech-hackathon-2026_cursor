import GapDrivers from "./GapDrivers";

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
  /** Optional pipeline confidence_reason — shown verbatim for grounding */
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
    <section
      className={`rounded-xl border border-white/[0.08] bg-night-800/40 p-5 ${className}`}
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight text-sand-50">
          Why this district is flagged
        </h2>
        <p className="mt-1 text-sm text-sand-50/55">
          Generated from deterministic scoring before AI interpretation.
        </p>
      </div>

      {mixedEvidence ? (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
          <p className="text-sm font-medium text-amber-200/90">
            Mixed evidence
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sand-50/70">
            Pipeline signals do not fully agree for this district. Review the
            evidence below before acting on the recommendation.
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
          Evidence
        </p>
        {evidence_bullets.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {evidence_bullets.map((bullet) => (
              <li
                key={bullet}
                className="rounded-lg border border-white/[0.06] bg-night-900/50 px-4 py-3 text-sm leading-relaxed text-sand-50/90"
              >
                {bullet}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-sand-50/55">
            No evidence bullets for this district.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-sand-50/45">
          Top gap drivers
        </p>
        <GapDrivers
          top_gap_drivers={top_gap_drivers}
          className="mt-3"
        />
      </div>

      {confidence_reason ? (
        <p className="mt-5 text-sm leading-relaxed text-sand-50/60">
          {confidence_reason}
        </p>
      ) : null}
    </section>
  );
}
