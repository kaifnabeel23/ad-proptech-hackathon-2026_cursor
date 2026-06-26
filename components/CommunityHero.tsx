import TrackBadge from "./TrackBadge";

const CAPABILITIES = [
  {
    title: "Evidence-backed intelligence",
    description:
      "District gap scores, drivers, and evidence bullets from the deterministic pipeline.",
    icon: (
      <svg
        aria-hidden
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108v8.892a2.25 2.25 0 002.25 2.25h.75m0-13.5h.75"
        />
      </svg>
    ),
  },
  {
    title: "Real OSM amenity coverage",
    description:
      "Education, healthcare, retail, and mobility counts mapped from OpenStreetMap.",
    icon: (
      <svg
        aria-hidden
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </svg>
    ),
  },
  {
    title: "AI recommendation with confidence",
    description:
      "Planner-style next-step guidance paired with a pipeline confidence badge.",
    icon: (
      <svg
        aria-hidden
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    ),
  },
  {
    title: "Honest when evidence is mixed",
    description:
      "Uncertainty is surfaced clearly — the copilot does not overclaim weak signals.",
    icon: (
      <svg
        aria-hidden
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
] as const;

export default function CommunityHero() {
  return (
    <header className="relative pt-14">
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

      <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-sand-50 sm:text-5xl">
        Community Gap &amp; Confidence Copilot
      </h1>

      <p className="mt-4 max-w-2xl text-base leading-relaxed text-sand-50/70 sm:text-lg">
        Identify underserved Abu Dhabi districts, explain the evidence, and
        recommend the next community intervention with a confidence badge.
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {CAPABILITIES.map((item) => (
          <li
            key={item.title}
            className="flex gap-3 rounded-xl border border-white/[0.08] bg-night-800/40 p-4"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/20">
              {item.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-sand-50">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-sand-50/55">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <a
          href="#demo"
          className="inline-flex items-center rounded-lg bg-sand-50 px-5 py-2.5 text-sm font-semibold text-night-900 transition hover:bg-sand-100"
        >
          Explore districts
        </a>
      </div>
    </header>
  );
}
