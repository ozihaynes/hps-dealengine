/**
 * VerdictChip — Sub-Slice 9.1
 *
 * Dumb renderer displaying deal verdict recommendation.
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined recommendation with UNKNOWN fallback
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import { type DealVerdictRecommendation } from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS (traced for debugging)
// ─────────────────────────────────────────────────────────────────────

type VerdictKey = DealVerdictRecommendation | "unknown";

const VERDICT_LABELS: Record<VerdictKey, string> = {
  pursue: "Pursue",
  needs_evidence: "Needs Evidence",
  pass: "Pass",
  unknown: "Unknown",
} as const;

const VERDICT_COLORS: Record<VerdictKey, string> = {
  pursue: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  needs_evidence: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  pass: "bg-red-500/20 text-red-400 border-red-500/40",
  unknown: "bg-slate-500/20 text-slate-400 border-slate-500/40",
} as const;

const VERDICT_ICONS: Record<VerdictKey, string> = {
  pursue: "✓",
  needs_evidence: "?",
  pass: "✗",
  unknown: "—",
} as const;

const VALID_RECOMMENDATIONS: readonly DealVerdictRecommendation[] = [
  "pursue",
  "needs_evidence",
  "pass",
] as const;

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-3 py-1 text-sm gap-1.5",
  lg: "px-4 py-1.5 text-base gap-2",
} as const;

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface VerdictChipProps {
  /** Verdict recommendation from engine. Null/undefined → unknown */
  recommendation: DealVerdictRecommendation | null | undefined;
  /** Optional confidence percentage (0-100) */
  confidencePct?: number | null;
  /** Chip size variant */
  size?: "sm" | "md" | "lg";
  /** Show icon prefix */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const VerdictChip = memo(function VerdictChip({
  recommendation,
  confidencePct,
  size = "md",
  showIcon = true,
  className,
}: VerdictChipProps): JSX.Element {
  // DEFENSIVE: Normalize null/undefined/invalid to unknown
  const normalizedRec: VerdictKey =
    recommendation != null &&
    VALID_RECOMMENDATIONS.includes(recommendation as DealVerdictRecommendation)
      ? recommendation
      : "unknown";

  // TRACED: Get display values from constants
  const label = VERDICT_LABELS[normalizedRec];
  const colorClasses = VERDICT_COLORS[normalizedRec];
  const icon = VERDICT_ICONS[normalizedRec];
  const sizeClasses = SIZE_CLASSES[size];

  // DEFENSIVE: Confidence display with bounds check
  const confidenceDisplay =
    confidencePct != null && confidencePct >= 0 && confidencePct <= 100
      ? `${Math.round(confidencePct)}%`
      : null;

  return (
    <span
      data-testid="verdict-chip"
      data-verdict={normalizedRec}
      aria-label={`Deal verdict: ${label}${confidenceDisplay ? ` (${confidenceDisplay} confidence)` : ""}`}
      className={cn(
        // Base styles
        "inline-flex items-center font-medium rounded-full border",
        // Dynamic styles from constants
        colorClasses,
        sizeClasses,
        // User overrides
        className
      )}
    >
      {showIcon && (
        <span
          className="flex-shrink-0"
          aria-hidden="true"
          data-testid="verdict-chip-icon"
        >
          {icon}
        </span>
      )}
      <span data-testid="verdict-chip-label">{label}</span>
      {confidenceDisplay && (
        <span
          className="opacity-70 text-[0.85em]"
          data-testid="verdict-chip-confidence"
        >
          {confidenceDisplay}
        </span>
      )}
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default VerdictChip;

// Re-export constants for testing/storybook
export { VERDICT_LABELS, VERDICT_COLORS, VERDICT_ICONS, SIZE_CLASSES, VALID_RECOMMENDATIONS };
