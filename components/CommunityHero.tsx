import TrackBadge from "./TrackBadge";

const VALUE_PILLS = [
  "Evidence-backed scores",
  "Real OSM amenities",
  "AI + confidence",
  "Honest uncertainty",
] as const;

export default function CommunityHero() {
  return (
    <header className="relative border-b border-white/[0.06] pb-10 pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
      />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sand-50/45">
          Abu Dhabi AI PropTech Challenge
        </p>
        <TrackBadge track="communities" />
      </div>

      <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-sand-50 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
        Community Gap &amp; Confidence Copilot
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-relaxed text-sand-50/70 lg:text-lg">
        Which district needs intervention, what is missing, why we believe it,
        and how much to trust the recommendation.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {VALUE_PILLS.map((pill) => (
          <li
            key={pill}
            className="rounded-full border border-white/10 bg-night-800/60 px-3 py-1 text-xs font-medium text-sand-50/70"
          >
            {pill}
          </li>
        ))}
      </ul>

      <a
        href="#dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-sand-50 px-5 py-2.5 text-sm font-semibold text-night-900 transition hover:bg-sand-100"
      >
        Start demo
      </a>
    </header>
  );
}
