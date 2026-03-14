/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#081018",
          900: "#0f1724",
          800: "#182235",
          700: "#253248",
        },
        copper: {
          500: "#d97706",
          400: "#f59e0b",
          300: "#fcd34d",
        },
        cyanlab: {
          500: "#06b6d4",
          400: "#22d3ee",
          300: "#67e8f9",
        },
        moss: {
          500: "#22c55e",
          400: "#4ade80",
        },
      },
      fontFamily: {
        sans: ["'Segoe UI Variable Text'", "'Trebuchet MS'", "Verdana", "sans-serif"],
        display: ["'Segoe UI Variable Display'", "'Trebuchet MS'", "Verdana", "sans-serif"],
        mono: ["Consolas", "'Courier New'", "monospace"],
      },
      boxShadow: {
        panel: "0 24px 80px rgba(8, 16, 24, 0.35)",
        glow: "0 0 0 1px rgba(103, 232, 249, 0.15), 0 12px 40px rgba(34, 211, 238, 0.14)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)",
      },
      animation: {
        rise: "rise 0.45s ease-out",
      },
      keyframes: {
        rise: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};