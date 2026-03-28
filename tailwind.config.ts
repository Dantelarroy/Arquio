import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Arqu brand palette ──────────────────────────────
        // Primary
        bronze: {
          DEFAULT: "#C85A3C",   // terracotta
          dark:    "#A5452B",   // terracotta dark
          light:   "#D4704E",   // terracotta light
        },
        // Neutral / text
        stone: {
          warm: "#6B6C6B",      // charcoal muted
        },
        // Backgrounds & borders
        cream: {
          50:  "#FAF8F4",
          100: "#F4F1EA",       // main background
          200: "#E8E2D8",
          300: "#E0DCD3",       // borders
        },
        // Accent
        forest:  "#2A4A35",
        mustard: "#D4B830",
      },
      fontFamily: {
        sans:    ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono:    ["var(--font-space-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
