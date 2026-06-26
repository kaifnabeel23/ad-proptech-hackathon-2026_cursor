export type RingAccent = "amber" | "teal" | "violet" | "sky" | "emerald";

const STROKE: Record<RingAccent, string> = {
  amber: "#fbbf24",
  teal: "#2dd4bf",
  violet: "#a78bfa",
  sky: "#38bdf8",
  emerald: "#34d399",
};

export interface ProgressRingProps {
  /** 0–100 value */
  value: number;
  size?: number;
  stroke?: number;
  accent?: RingAccent;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Pure SVG progress ring — displays a 0–100 value.
 * Does not calculate anything; renders the value as provided.
 */
export default function ProgressRing({
  value,
  size = 120,
  stroke = 9,
  accent = "amber",
  children,
  className = "",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = STROKE[accent];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: `drop-shadow(0 0 6px ${color}55)`,
          }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
