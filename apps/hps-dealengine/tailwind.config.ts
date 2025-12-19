import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./constants/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css}",
    "./tests/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "../../packages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-display)", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "var(--leading-snug)", letterSpacing: "var(--tracking-normal)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-snug)", letterSpacing: "var(--tracking-normal)" }],
        base: ["var(--text-base)", { lineHeight: "var(--leading-normal)", letterSpacing: "var(--tracking-normal)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-normal)", letterSpacing: "var(--tracking-tight)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-tight)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-tighter)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-tighter)" }],
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        snug: "var(--leading-snug)",
        normal: "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
      },
      letterSpacing: {
        tighter: "var(--tracking-tighter)",
        tight: "var(--tracking-tight)",
        normal: "var(--tracking-normal)",
        wide: "var(--tracking-wide)",
        wider: "var(--tracking-wider)",
      },
    },
  },
  plugins: [],
} satisfies Config;
