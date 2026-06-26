/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium civic-intelligence palette
        sand: {
          50: "#f8f7f4",
          100: "#efece4",
          200: "#ddd8cb",
          300: "#bcb4a1",
        },
        night: {
          700: "#1a1d27",
          750: "#161922",
          800: "#12141c",
          850: "#0d0f16",
          900: "#090b11",
          950: "#05060a",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(251, 191, 36, 0.35)",
        "glow-amber": "0 0 50px -14px rgba(251, 191, 36, 0.45)",
        "glow-teal": "0 0 48px -14px rgba(45, 212, 191, 0.38)",
        "glow-violet": "0 0 48px -14px rgba(167, 139, 250, 0.40)",
        card: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 18px 40px -24px rgba(0,0,0,0.85)",
        lift: "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 30px 60px -28px rgba(0,0,0,0.9)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(60% 60% at 50% 0%, rgba(255,255,255,0.06), transparent 70%)",
      },
      backgroundSize: {
        grid: "56px 56px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bar-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.6s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "bar-grow": "bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.2s linear infinite",
        "glow-pulse": "glow-pulse 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
