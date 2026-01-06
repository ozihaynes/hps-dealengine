/**
 * Verdict Theming Configuration
 *
 * Extended styling for verdict-based card components.
 * Adds PENDING state and card-specific classes (left border, background tint).
 *
 * Used by: DealCard (Slice 19), PipelineSummary
 *
 * @module lib/constants/verdictThemes
 * @version 1.0.0 (Slice 19)
 */

export const VERDICT_THEMES = {
  PURSUE: {
    border: "border-l-4 border-l-emerald-500",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    chip: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    icon: "text-emerald-400",
    accent: "text-emerald-400",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
    label: "PURSUE",
    shortLabel: "PURSUE",
  },
  NEEDS_EVIDENCE: {
    border: "border-l-4 border-l-amber-500",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    chip: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    icon: "text-amber-400",
    accent: "text-amber-400",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
    label: "NEEDS EVIDENCE",
    shortLabel: "NEEDS",
  },
  PASS: {
    border: "border-l-4 border-l-zinc-500",
    bg: "bg-zinc-500/5 hover:bg-zinc-500/10",
    chip: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    icon: "text-zinc-400",
    accent: "text-zinc-400",
    ring: "ring-zinc-500/30",
    dot: "bg-zinc-500",
    label: "PASS",
    shortLabel: "PASS",
  },
  PENDING: {
    border: "border-l-4 border-dashed border-l-zinc-600",
    bg: "bg-zinc-800/30 hover:bg-zinc-800/50",
    chip: "bg-zinc-700/50 text-zinc-500 border border-zinc-600/30",
    icon: "text-zinc-500",
    accent: "text-zinc-500",
    ring: "ring-zinc-600/30",
    dot: "bg-zinc-600",
    label: "PENDING",
    shortLabel: "PENDING",
  },
} as const;

export type VerdictThemeKey = keyof typeof VERDICT_THEMES;

/**
 * Get theme for a verdict, with fallback to PENDING
 */
export function getVerdictTheme(
  verdict?: string | null
): (typeof VERDICT_THEMES)[VerdictThemeKey] {
  if (!verdict) return VERDICT_THEMES.PENDING;
  const key = verdict.toUpperCase() as VerdictThemeKey;
  return VERDICT_THEMES[key] ?? VERDICT_THEMES.PENDING;
}

/**
 * Normalize verdict string to VerdictThemeKey
 */
export function normalizeVerdict(verdict?: string | null): VerdictThemeKey {
  if (!verdict) return "PENDING";
  const upper = verdict.toUpperCase();
  if (
    upper === "PURSUE" ||
    upper === "NEEDS_EVIDENCE" ||
    upper === "PASS" ||
    upper === "PENDING"
  ) {
    return upper as VerdictThemeKey;
  }
  return "PENDING";
}

/**
 * Verdict priority for sorting (higher = more important)
 */
export const VERDICT_PRIORITY: Record<VerdictThemeKey, number> = {
  PURSUE: 3,
  NEEDS_EVIDENCE: 2,
  PASS: 1,
  PENDING: 0,
};
