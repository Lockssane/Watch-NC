/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "var(--color-abyss)",
        navy: "var(--color-navy)",
        radar: "var(--color-radar)",
        phosphor: "var(--color-phosphor)",
        alert: "var(--color-alert)",
        ink: "var(--color-ink)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        radar: "0 0 15px var(--color-radar)",
        glass: "0 4px 30px rgba(0, 0, 0, 0.1)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1.5)", opacity: "1" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        glowSweep: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        drift: "drift 4s ease-in-out infinite",
        glowSweep: "glowSweep 3s ease-in-out infinite",
      },
      backgroundImage: {
        "radar-grid": "radial-gradient(circle, var(--color-radar) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
