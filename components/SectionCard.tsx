import type { ReactNode } from "react";

export interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
  className?: string;
  /** Highlights primary sections such as the AI recommendation */
  featured?: boolean;
}

export default function SectionCard({
  title,
  description,
  children,
  id,
  className = "",
  featured = false,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={`rounded-2xl border p-6 ${
        featured
          ? "border-amber-400/25 bg-gradient-to-b from-amber-400/[0.08] to-night-800/50 shadow-[0_0_0_1px_rgba(251,191,36,0.06)]"
          : "border-white/[0.08] bg-night-800/40"
      } ${className}`}
    >
      <header>
        <h2
          className={`font-semibold tracking-tight text-sand-50 ${
            featured ? "text-lg" : "text-base"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-sand-50/55">
            {description}
          </p>
        ) : null}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}
