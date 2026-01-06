import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// Import design tokens for Tailwind integration
import { keyframes, animation } from "./lib/design-tokens/motion";

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
      // ═══════════════════════════════════════════════════════════════════════════
      // COLORS - Command Center V2.1
      // ═══════════════════════════════════════════════════════════════════════════
      colors: {
        // Verdict Colors
        verdict: {
          go: {
            DEFAULT: "var(--color-verdict-go)",
            soft: "var(--color-verdict-go-soft)",
            glow: "var(--color-verdict-go-glow)",
            text: "var(--color-verdict-go-text)",
            border: "var(--color-verdict-go-border)",
          },
          caution: {
            DEFAULT: "var(--color-verdict-caution)",
            soft: "var(--color-verdict-caution-soft)",
            glow: "var(--color-verdict-caution-glow)",
            text: "var(--color-verdict-caution-text)",
            border: "var(--color-verdict-caution-border)",
          },
          hold: {
            DEFAULT: "var(--color-verdict-hold)",
            soft: "var(--color-verdict-hold-soft)",
            glow: "var(--color-verdict-hold-glow)",
            text: "var(--color-verdict-hold-text)",
            border: "var(--color-verdict-hold-border)",
          },
          pass: {
            DEFAULT: "var(--color-verdict-pass)",
            soft: "var(--color-verdict-pass-soft)",
            glow: "var(--color-verdict-pass-glow)",
            text: "var(--color-verdict-pass-text)",
            border: "var(--color-verdict-pass-border)",
          },
        },

        // Urgency Colors
        urgency: {
          emergency: {
            DEFAULT: "var(--color-urgency-emergency)",
            soft: "var(--color-urgency-emergency-soft)",
            pulse: "var(--color-urgency-emergency-pulse)",
            text: "var(--color-urgency-emergency-text)",
            border: "var(--color-urgency-emergency-border)",
          },
          critical: {
            DEFAULT: "var(--color-urgency-critical)",
            soft: "var(--color-urgency-critical-soft)",
            pulse: "var(--color-urgency-critical-pulse)",
            text: "var(--color-urgency-critical-text)",
            border: "var(--color-urgency-critical-border)",
          },
          active: {
            DEFAULT: "var(--color-urgency-active)",
            soft: "var(--color-urgency-active-soft)",
            pulse: "var(--color-urgency-active-pulse)",
            text: "var(--color-urgency-active-text)",
            border: "var(--color-urgency-active-border)",
          },
          steady: {
            DEFAULT: "var(--color-urgency-steady)",
            soft: "var(--color-urgency-steady-soft)",
            pulse: "var(--color-urgency-steady-pulse)",
            text: "var(--color-urgency-steady-text)",
            border: "var(--color-urgency-steady-border)",
          },
        },

        // Signal Severity Colors
        signal: {
          critical: {
            bg: "var(--color-signal-critical-bg)",
            border: "var(--color-signal-critical-border)",
            icon: "var(--color-signal-critical-icon)",
            text: "var(--color-signal-critical-text)",
            hover: "var(--color-signal-critical-hover)",
          },
          warning: {
            bg: "var(--color-signal-warning-bg)",
            border: "var(--color-signal-warning-border)",
            icon: "var(--color-signal-warning-icon)",
            text: "var(--color-signal-warning-text)",
            hover: "var(--color-signal-warning-hover)",
          },
          info: {
            bg: "var(--color-signal-info-bg)",
            border: "var(--color-signal-info-border)",
            icon: "var(--color-signal-info-icon)",
            text: "var(--color-signal-info-text)",
            hover: "var(--color-signal-info-hover)",
          },
        },

        // Surface Colors
        surface: {
          base: "var(--color-surface-base)",
          raised: "var(--color-surface-raised)",
          overlay: "var(--color-surface-overlay)",
          sunken: "var(--color-surface-sunken)",
          inverse: "var(--color-surface-inverse)",
          backdrop: "var(--color-surface-backdrop)",
        },

        // Text Colors
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
          accent: "var(--color-text-accent)",
          link: "var(--color-text-link)",
          "link-hover": "var(--color-text-link-hover)",
        },

        // Border Colors
        border: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
          focus: "var(--color-border-focus)",
          "focus-ring": "var(--color-border-focus-ring)",
        },

        // Brand Colors
        brand: {
          primary: "var(--color-brand-primary)",
          "primary-hover": "var(--color-brand-primary-hover)",
          "primary-active": "var(--color-brand-primary-active)",
          "primary-soft": "var(--color-brand-primary-soft)",
        },
      },

      // ═══════════════════════════════════════════════════════════════════════════
      // TYPOGRAPHY
      // ═══════════════════════════════════════════════════════════════════════════
      fontFamily: {
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-display)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
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

      // ═══════════════════════════════════════════════════════════════════════════
      // SHADOWS
      // ═══════════════════════════════════════════════════════════════════════════
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        focus: "var(--shadow-focus)",
        // Glow shadows for verdicts
        "glow-go": "var(--shadow-glow-go)",
        "glow-caution": "var(--shadow-glow-caution)",
        "glow-hold": "var(--shadow-glow-hold)",
        "glow-pass": "var(--shadow-glow-pass)",
        "glow-emergency": "var(--shadow-glow-emergency)",
      },

      // ═══════════════════════════════════════════════════════════════════════════
      // MOTION - Keyframes & Animations
      // ═══════════════════════════════════════════════════════════════════════════
      keyframes,
      animation,

      // ═══════════════════════════════════════════════════════════════════════════
      // TRANSITIONS
      // ═══════════════════════════════════════════════════════════════════════════
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
        slowest: "var(--duration-slowest)",
        "count-up": "var(--duration-count-up)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease-default)",
        in: "var(--ease-in)",
        out: "var(--ease-out)",
        smooth: "var(--ease-smooth)",
        bounce: "var(--ease-bounce)",
      },

      // ═══════════════════════════════════════════════════════════════════════════
      // Z-INDEX SCALE
      // ═══════════════════════════════════════════════════════════════════════════
      zIndex: {
        base: "var(--z-base)",
        raised: "var(--z-raised)",
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        drawer: "var(--z-drawer)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        toast: "var(--z-toast)",
        tooltip: "var(--z-tooltip)",
      },
    },
  },
  plugins: [],
} satisfies Config;
