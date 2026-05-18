import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--bg-base))",
        foreground: "hsl(var(--fg-primary))",
        surface: "hsl(var(--bg-surface))",
        elevated: "hsl(var(--bg-elevated))",
        muted: { DEFAULT: "hsl(var(--bg-elevated))", foreground: "hsl(var(--fg-secondary))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))" },
        card: { DEFAULT: "hsl(var(--bg-surface))", foreground: "hsl(var(--fg-primary))" },
        areas: {
          discipline: "hsl(var(--area-discipline))",
          focus: "hsl(var(--area-focus))",
          learning: "hsl(var(--area-learning))",
          career: "hsl(var(--area-career))",
          health: "hsl(var(--area-health))",
          mental: "hsl(var(--area-mental))",
          social: "hsl(var(--area-social))",
          financial: "hsl(var(--area-financial))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "skeleton-pulse": { "0%, 100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        skeleton: "skeleton-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
