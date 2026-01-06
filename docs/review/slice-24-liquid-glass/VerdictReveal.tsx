/**
 * VerdictReveal — Slice 14 (Animated Verdict Display)
 *
 * Large, stunning verdict display with blur-to-focus reveal animation.
 * Creates a dramatic "moment of truth" when the verdict is shown.
 *
 * Animation Sequence:
 * 1. Start blurred and scaled down (anticipation)
 * 2. Reveal with blur clearing and scale normalizing
 * 3. Optional pulse glow for PURSUE verdict
 *
 * @defensive Handles unknown verdict values gracefully
 * @traced data-testid for debugging and test selection
 * @accessible Motion respects prefers-reduced-motion
 *
 * @module components/dashboard/hero/VerdictReveal
 * @version 1.0.0 (Slice 14)
 */

"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type VerdictKey = "pursue" | "needs_evidence" | "pass" | "unknown";

export interface VerdictRevealProps {
  /** Normalized verdict recommendation */
  recommendation: VerdictKey;
  /** Confidence percentage (0-100) */
  confidencePct: number | null;
  /** Whether to show confidence badge */
  showConfidence?: boolean;
  /** Whether user prefers reduced motion (accessibility) */
  prefersReducedMotion?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verdict visual configuration
 * Maps each verdict to its complete visual treatment
 */
const VERDICT_CONFIG: Record<
  VerdictKey,
  {
    label: string;
    icon: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    glowShadow: string;
    iconBg: string;
  }
> = {
  pursue: {
    label: "PURSUE",
    icon: "check",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowShadow: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]",
    iconBg: "bg-emerald-500",
  },
  needs_evidence: {
    label: "NEEDS EVIDENCE",
    icon: "question",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glowShadow: "shadow-[0_0_25px_-5px_rgba(245,158,11,0.4)]",
    iconBg: "bg-amber-500",
  },
  pass: {
    label: "PASS",
    icon: "x",
    textColor: "text-slate-400",
    bgColor: "bg-slate-600/10",
    borderColor: "border-slate-600/30",
    glowShadow: "",
    iconBg: "bg-slate-500",
  },
  unknown: {
    label: "ANALYZING",
    icon: "dots",
    textColor: "text-slate-500",
    bgColor: "bg-slate-700/20",
    borderColor: "border-slate-700/30",
    glowShadow: "",
    iconBg: "bg-slate-600",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verdict reveal animation
 * Blur → focus with scale normalization
 */
const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    filter: "blur(12px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: TIMING.deliberate,
      ease: EASING.smooth,
    },
  },
};

/**
 * Icon pop animation
 * Slightly delayed, with bounce
 */
const iconVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -45,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.bounce,
      delay: 0.2,
    },
  },
};

/**
 * Text slide up animation
 */
const textVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
      delay: 0.15,
    },
  },
};

/**
 * Confidence badge fade in
 */
const confidenceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: TIMING.quick,
      ease: EASING.decelerate,
      delay: 0.35,
    },
  },
};

/**
 * Pulse animation for PURSUE verdict
 */
const pulseRingVariants: Variants = {
  pulse: {
    boxShadow: [
      "0 0 0 0 rgba(16, 185, 129, 0)",
      "0 0 0 12px rgba(16, 185, 129, 0.15)",
      "0 0 0 0 rgba(16, 185, 129, 0)",
    ],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      repeatDelay: 2,
      ease: "easeOut",
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENTS (SVG)
// ═══════════════════════════════════════════════════════════════════════════

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}

function VerdictIcon({
  type,
  className,
}: {
  type: VerdictKey;
  className?: string;
}) {
  switch (type) {
    case "pursue":
      return <CheckIcon className={className} />;
    case "needs_evidence":
      return <QuestionIcon className={className} />;
    case "pass":
      return <XIcon className={className} />;
    default:
      return <DotsIcon className={className} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Confidence level for color coding
// ═══════════════════════════════════════════════════════════════════════════

function getConfidenceLevel(pct: number | null): "high" | "medium" | "low" | null {
  if (pct === null) return null;
  if (pct >= 80) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

const CONFIDENCE_COLORS = {
  high: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  low: "text-red-400 bg-red-500/10 border-red-500/30",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const VerdictReveal = memo(function VerdictReveal({
  recommendation,
  confidencePct,
  showConfidence = true,
  prefersReducedMotion = false,
  className,
}: VerdictRevealProps): JSX.Element {
  const config = VERDICT_CONFIG[recommendation] ?? VERDICT_CONFIG.unknown;
  const isPursue = recommendation === "pursue";
  const confidenceLevel = getConfidenceLevel(confidencePct);

  return (
    <div
      className={cn("flex flex-col items-center gap-4", className)}
      data-testid="verdict-reveal"
      data-verdict={recommendation}
    >
      {/* ─────────────────────────────────────────────────────────────────
          MAIN VERDICT BADGE
          ───────────────────────────────────────────────────────────────── */}
      <motion.div
        variants={prefersReducedMotion ? undefined : revealVariants}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        className="relative"
      >
        {/* Pulse ring for PURSUE (only if motion allowed) */}
        {isPursue && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            variants={pulseRingVariants}
            animate="pulse"
            aria-hidden="true"
          />
        )}

        {/* Main badge container */}
        <div
          className={cn(
            "flex items-center gap-4 px-8 py-5 rounded-2xl border-2",
            "transition-all duration-300",
            config.bgColor,
            config.borderColor,
            config.glowShadow
          )}
        >
          {/* Icon circle */}
          <motion.div
            variants={prefersReducedMotion ? undefined : iconVariants}
            className={cn(
              "flex items-center justify-center",
              "w-14 h-14 rounded-full",
              config.iconBg,
              "shadow-lg"
            )}
          >
            <VerdictIcon
              type={recommendation}
              className="w-7 h-7 text-white"
            />
          </motion.div>

          {/* Verdict text */}
          <motion.div variants={prefersReducedMotion ? undefined : textVariants} className="flex flex-col">
            <span
              className={cn(
                "text-3xl md:text-4xl font-bold tracking-tight",
                config.textColor
              )}
              data-testid="verdict-label"
            >
              {config.label}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────────
          CONFIDENCE BADGE (optional)
          ───────────────────────────────────────────────────────────────── */}
      {showConfidence && confidencePct !== null && confidenceLevel && (
        <motion.div
          variants={prefersReducedMotion ? undefined : confidenceVariants}
          initial={prefersReducedMotion ? false : "hidden"}
          animate="visible"
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border",
            "text-sm font-medium",
            CONFIDENCE_COLORS[confidenceLevel]
          )}
          data-testid="verdict-confidence"
        >
          <span className="uppercase text-xs tracking-wider opacity-70">
            Confidence
          </span>
          <span className="font-bold">
            {Math.round(confidencePct)}%
          </span>
        </motion.div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default VerdictReveal;

// Re-export for testing
export { VERDICT_CONFIG, getConfidenceLevel, CONFIDENCE_COLORS };
