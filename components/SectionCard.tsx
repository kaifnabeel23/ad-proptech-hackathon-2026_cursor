import type { ReactNode } from "react";

export type SectionAccent = "neutral" | "amber" | "teal" | "violet";

export interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  id?: string;
  className?: string;
  eyebrow?: string;
  action?: ReactNode;
  featured?: boolean;
  accent?: SectionAccent;
}

const ACCENT_RING: Record<SectionAccent, string> = {
  neutral: "before:from-slate-300",
  amber: "before:from-amber-400/60",
  teal: "before:from-teal-400/60",
  violet: "before:from-violet-400/60",
};

const EYEBROW_TONE: Record<SectionAccent, string> = {
  neutral: "text-slate-500",
  amber: "text-amber-700",
  teal: "text-teal-700",
  violet: "text-violet-700",
};

export default function SectionCard({
  title,
  description,
  children,
  id,
  className = "",
  eyebrow,
  action,
  featured = false,
  accent = "neutral",
}: SectionCardProps) {
  const hasHeader = Boolean(eyebrow || title || action);

  return (
    <section
      id={id}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 sm:p-6 ${
        featured
          ? "border-amber-300/50 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-[0_0_40px_-16px_rgba(251,191,36,0.35)]"
          : "glass shadow-[0_8px_30px_-18px_rgba(15,23,42,0.15)]"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r via-transparent to-transparent ${ACCENT_RING[accent]}`}
      />

      {hasHeader ? (
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${EYEBROW_TONE[accent]}`}
              >
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2
                className={`tracking-tight text-slate-900 ${
                  eyebrow ? "mt-1.5" : ""
                } ${featured ? "text-lg font-semibold" : "text-base font-semibold"}`}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={`flex flex-1 flex-col ${hasHeader ? "mt-5" : ""}`}>
        {children}
      </div>
    </section>
  );
}
