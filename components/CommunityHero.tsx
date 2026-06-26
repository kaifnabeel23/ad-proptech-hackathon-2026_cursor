import TrackBadge from "./TrackBadge";

const VALUE_PILLS = [
  { label: "Evidence-backed scores", dot: "bg-amber-500" },
  { label: "Real OSM amenities", dot: "bg-teal-500" },
  { label: "AI + confidence", dot: "bg-violet-500" },
  { label: "Honest uncertainty", dot: "bg-sky-500" },
] as const;

export default function CommunityHero() {
  return (
    <header className="relative isolate overflow-hidden pb-10 pt-12 sm:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18%] -z-10 h-[380px] w-[760px] max-w-[120vw] -translate-x-1/2 rounded-full bg-amber-300/25 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-amber-500/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          Abu Dhabi AI PropTech Challenge
        </span>
        <TrackBadge track="communities" />
      </div>

      <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3rem] lg:leading-[1.05]">
        Community Gap &amp;{" "}
        <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent">
          Confidence Copilot
        </span>
      </h1>

      <p className="mt-3 max-w-2xl text-balance text-base leading-relaxed text-slate-600 lg:text-lg">
        Which district needs intervention, what is missing, why we believe it,
        and how much to trust the recommendation.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2.5">
        {VALUE_PILLS.map((pill) => (
          <li
            key={pill.label}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
            {pill.label}
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <a
          href="#dashboard"
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-amber-500 hover:to-amber-600"
        >
          Start demo
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 3v10M8 13l4-4M8 13l-4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <p className="text-xs text-slate-400">
          Live demo · 20 Abu Dhabi districts · deterministic scoring + AI
          explanation
        </p>
      </div>
    </header>
  );
}
