/**
 * DecisionHero — Slice 14 (Hero Component)
 *
 * The "Decision Hero Zone" — stunning verdict display with animated reveal,
 * key metrics trio, and contextual CTA. Replaces TradingStrip as the
 * primary decision-making component in the V2.5 Dashboard.
 *
 * Features:
 * - Verdict reveal animation (blur → sharp focus)
 * - Verdict-based theming (emerald/amber/zinc glow)
 * - Key metrics: Net Profit, ZOPA, Risk Gates
 * - Primary CTA with verdict-contextual action
 * - Confidence indicator with visual feedback
 *
 * Principles Applied:
 * - Peak-End Rule: Verdict is the peak decision moment
 * - Hick's Law: One clear decision (PURSUE/NEEDS_EVIDENCE/PASS)
 * - Doherty Threshold: Animations under 400ms feel instant
 *
 * @defensive Handles null/undefined, NaN, negative values, invalid enums
 * @traced data-testid for debugging and test selection
 * @accessible Full ARIA support for screen readers
 *
 * @module components/dashboard/hero/DecisionHero
 * @version 1.0.0 (Slice 14)
 */

"use client";

import { memo, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  type DealVerdict,
  type DealVerdictRecommendation,
  type PriceGeometry,
  type NetClearance,
  type EnhancedRiskSummary,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { safeNumber } from "@/lib/utils/numbers";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// Sub-components
import { VerdictReveal } from "./VerdictReveal";
import { KeyMetricsTrio } from "./KeyMetricsTrio";
import { PrimaryActionCTA } from "./PrimaryActionCTA";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DecisionHeroProps {
  /** Deal verdict from engine. Null → loading/empty state */
  verdict: DealVerdict | null | undefined;
  /** Price geometry from engine (for ZOPA display) */
  priceGeometry: PriceGeometry | null | undefined;
  /** Net clearance from engine (for profit display) */
  netClearance: NetClearance | null | undefined;
  /** Risk summary from engine (for gates display) */
  riskSummary: EnhancedRiskSummary | null | undefined;
  /** Callback when user clicks primary action */
  onPrimaryAction?: () => void;
  /** Callback when user clicks secondary action (if applicable) */
  onSecondaryAction?: () => void;
  /** Whether to show the confidence indicator */
  showConfidence?: boolean;
  /** Whether to show the rationale text */
  showRationale?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

type VerdictKey = DealVerdictRecommendation | "unknown";

const VALID_VERDICTS: readonly DealVerdictRecommendation[] = [
  "pursue",
  "needs_evidence",
  "pass",
] as const;

/**
 * Verdict-based theme configuration
 * Each verdict maps to a complete visual treatment
 *
 * NOTE: "pursue" uses #0096FF (bright blue) instead of emerald green
 * for a cohesive, professional appearance.
 */
const VERDICT_THEME: Record<
  VerdictKey,
  {
    /** Gradient for background glow */
    glowGradient: string;
    /** Border color */
    borderColor: string;
    /** Background color */
    bgColor: string;
    /** Shadow with glow effect */
    shadow: string;
    /** CSS variable for pulse animation */
    pulseColor: string;
    /** Whether to show pulse animation */
    showPulse: boolean;
  }
> = {
  pursue: {
    // #0096FF blue theme (no green glow)
    glowGradient: "from-[#0096FF]/15 via-[#0096FF]/5 to-transparent",
    borderColor: "border-[#0096FF]/40",
    bgColor: "",
    shadow: "shadow-[0_0_40px_-15px_rgba(0,150,255,0.3)]",
    pulseColor: "rgba(0, 150, 255, 0.3)",
    showPulse: false, // Disabled pulse for cleaner look
  },
  needs_evidence: {
    glowGradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    borderColor: "border-amber-500/40",
    bgColor: "",
    shadow: "shadow-[0_0_40px_-15px_rgba(245,158,11,0.3)]",
    pulseColor: "rgba(245, 158, 11, 0.3)",
    showPulse: false,
  },
  pass: {
    glowGradient: "from-slate-500/10 via-transparent to-transparent",
    borderColor: "border-slate-600/50",
    bgColor: "bg-slate-900/90",
    shadow: "shadow-lg",
    pulseColor: "rgba(100, 116, 139, 0.2)",
    showPulse: false,
  },
  unknown: {
    glowGradient: "from-slate-700/20 via-transparent to-transparent",
    borderColor: "border-slate-700",
    bgColor: "bg-slate-900/80",
    shadow: "",
    pulseColor: "rgba(100, 116, 139, 0.1)",
    showPulse: false,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: TIMING.standard,
      ease: EASING.smooth,
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
    },
  },
};

const glowPulseVariants: Variants = {
  initial: { opacity: 0.6 },
  pulse: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Validate and normalize verdict
// ═══════════════════════════════════════════════════════════════════════════

function getSafeVerdict(
  recommendation: string | null | undefined
): VerdictKey {
  if (!recommendation) return "unknown";
  const lower = recommendation.trim().toLowerCase();
  if (VALID_VERDICTS.includes(lower as DealVerdictRecommendation)) {
    return lower as DealVerdictRecommendation;
  }
  return "unknown";
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function DecisionHeroSkeleton({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div
      data-testid="decision-hero"
      data-state="loading"
      className={cn(
        "relative rounded-2xl border border-slate-700 bg-slate-900/80",
        "overflow-hidden backdrop-blur-xl",
        compact ? "p-4" : "p-6 md:p-8",
        className
      )}
    >
      <div className="animate-pulse space-y-6">
        {/* Verdict skeleton */}
        <div className="flex justify-center">
          <div className="h-16 w-56 bg-slate-700/50 rounded-xl" />
        </div>
        {/* Rationale skeleton */}
        <div className="flex justify-center">
          <div className="h-4 w-80 bg-slate-700/40 rounded" />
        </div>
        {/* Metrics skeleton */}
        <div className="flex justify-center gap-4">
          <div className="h-24 w-32 bg-slate-700/30 rounded-lg" />
          <div className="h-24 w-32 bg-slate-700/30 rounded-lg" />
          <div className="h-24 w-32 bg-slate-700/30 rounded-lg" />
        </div>
        {/* CTA skeleton */}
        <div className="flex justify-center">
          <div className="h-14 w-48 bg-slate-700/40 rounded-lg" />
        </div>
      </div>
      <p className="text-center text-sm text-slate-500 mt-4">
        Analyzing deal...
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DecisionHero = memo(function DecisionHero({
  verdict,
  priceGeometry,
  netClearance,
  riskSummary,
  onPrimaryAction,
  onSecondaryAction,
  showConfidence = true,
  showRationale = true,
  compact = false,
  className,
}: DecisionHeroProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY: Reduced Motion Support
  // ─────────────────────────────────────────────────────────────────────

  const prefersReducedMotion = useReducedMotion();

  // ─────────────────────────────────────────────────────────────────────
  // PROCESS VERDICT (with defensive guards)
  // ─────────────────────────────────────────────────────────────────────

  const safeVerdict = getSafeVerdict(verdict?.recommendation);
  const theme = VERDICT_THEME[safeVerdict];
  const isLoading = !verdict;
  const isPursue = safeVerdict === "pursue";

  // ─────────────────────────────────────────────────────────────────────
  // EXTRACT VALUES (with defensive guards)
  // ─────────────────────────────────────────────────────────────────────

  const confidencePct = safeNumber(verdict?.confidence_pct);
  const rationale = verdict?.rationale ?? null;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Loading State
  // ─────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <DecisionHeroSkeleton compact={compact} className={className} />;
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Main Component
  // ─────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      data-testid="decision-hero"
      data-state="loaded"
      data-verdict={safeVerdict}
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      className={cn(
        "relative rounded-2xl border overflow-hidden",
        "backdrop-blur-sm transition-colors duration-300",
        theme.borderColor,
        theme.bgColor,
        theme.shadow,
        compact ? "p-4" : "p-6 md:p-8",
        className
      )}
      style={{
        backgroundColor: safeVerdict === "pass"
          ? "rgba(15, 23, 42, 0.9)"
          : "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
      }}
      role="region"
      aria-label="Deal decision summary"
    >
      {/* ─────────────────────────────────────────────────────────────────
          BACKGROUND GLOW (verdict-based)
          ───────────────────────────────────────────────────────────────── */}
      <motion.div
        className={cn(
          "absolute inset-0 bg-gradient-radial pointer-events-none",
          theme.glowGradient
        )}
        variants={prefersReducedMotion ? undefined : (theme.showPulse ? glowPulseVariants : undefined)}
        initial={prefersReducedMotion ? false : "initial"}
        animate={theme.showPulse && !prefersReducedMotion ? "pulse" : "initial"}
        aria-hidden="true"
      />

      {/* ─────────────────────────────────────────────────────────────────
          CONTENT CONTAINER
          ───────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            VERDICT REVEAL (blur → focus animation)
            ───────────────────────────────────────────────────────────── */}
        <motion.div variants={prefersReducedMotion ? undefined : contentVariants}>
          <VerdictReveal
            recommendation={safeVerdict}
            confidencePct={confidencePct}
            showConfidence={showConfidence}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────
            RATIONALE (optional)
            ───────────────────────────────────────────────────────────── */}
        {showRationale && rationale && (
          <motion.div
            variants={prefersReducedMotion ? undefined : contentVariants}
            className="flex justify-center"
          >
            <p
              className="text-sm md:text-base text-slate-400 text-center max-w-lg leading-relaxed"
              data-testid="decision-hero-rationale"
            >
              {rationale}
            </p>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            KEY METRICS TRIO (Net / ZOPA / Gates)
            ───────────────────────────────────────────────────────────── */}
        <motion.div variants={prefersReducedMotion ? undefined : contentVariants}>
          <KeyMetricsTrio
            priceGeometry={priceGeometry}
            netClearance={netClearance}
            riskSummary={riskSummary}
            compact={compact}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────
            PRIMARY ACTION CTA
            ───────────────────────────────────────────────────────────── */}
        <motion.div variants={prefersReducedMotion ? undefined : contentVariants}>
          <PrimaryActionCTA
            recommendation={safeVerdict}
            onPrimaryAction={onPrimaryAction}
            onSecondaryAction={onSecondaryAction}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default DecisionHero;

// Re-export helpers for testing
export { getSafeVerdict, VERDICT_THEME, VALID_VERDICTS };

// Re-export from shared utils for backwards compatibility
export { safeNumber } from "@/lib/utils/numbers";
