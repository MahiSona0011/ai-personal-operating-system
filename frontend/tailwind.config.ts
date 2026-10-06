import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// Every colour is `hsl(var(--token) / <alpha-value>)` so opacity modifiers (`bg-success/10`) work.
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const area = (name: string) => ({ DEFAULT: token(`area-${name}`), fg: token(`area-${name}-fg`) });

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        border: { DEFAULT: token("border"), strong: token("border-strong") },
        background: token("bg-base"),
        foreground: token("fg-primary"),
        surface: token("bg-surface"),
        elevated: token("bg-elevated"),
        fg: { secondary: token("fg-secondary"), muted: token("fg-muted") },
        muted: { DEFAULT: token("bg-elevated"), foreground: token("fg-secondary") },
        accent: {
          DEFAULT: token("accent"),
          fg: token("accent-fg"),
          solid: token("accent-solid"),
          2: token("accent-2"),
          foreground: token("accent-foreground"),
        },
        destructive: { DEFAULT: token("destructive"), fg: token("destructive-fg"), solid: token("destructive-solid") },
        success: { DEFAULT: token("success"), fg: token("success-fg") },
        warning: { DEFAULT: token("warning"), fg: token("warning-fg") },
        card: { DEFAULT: token("bg-surface"), foreground: token("fg-primary") },
        area: {
          health: area("health"),
          mind: area("mind"),
          relationships: area("relationships"),
          work: area("work"),
          money: area("money"),
          growth: area("growth"),
        },
        chart: {
          grid: token("chart-grid"),
          axis: token("chart-axis"),
          score: token("chart-score"),
          mood: token("chart-mood"),
          energy: token("chart-energy"),
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
