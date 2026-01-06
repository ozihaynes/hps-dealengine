/**
 * DecisionRationale — Row 10 Component
 *
 * Displays the verdict reasoning and decision rationale at the bottom
 * of the dashboard. Styled consistently with the V25 glass design.
 *
 * Features:
 * - Verdict reasons list with bullet points
 * - Supporting rationale text
 * - Glass card styling matching ConfidenceBar
 * - Semantic colors for verdict indication
 *
 * @module components/dashboard/scores/DecisionRationale
 * @version 1.0.0
 */

"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import type { DealVerdict } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DecisionRationaleProps {
  /** Verdict data from engine */
  verdict: DealVerdict | null | undefined;
  /** Additional rationale points (legacy support) */
  rationalePoints?: string[];
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: TIMING.quick,
      ease: EASING.decelerate,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function getVerdictColor(recommendation: string | undefined): string {
  switch (recommendation) {
    case "pursue":
      return "text-emerald-400";
    case "pass":
      return "text-red-400";
    case "needs_evidence":
    case "hold":
      return "text-amber-400";
    default:
      return "text-slate-400";
  }
}

function getBulletColor(recommendation: string | undefined): string {
  switch (recommendation) {
    case "pursue":
      return "bg-emerald-500";
    case "pass":
      return "bg-red-500";
    case "needs_evidence":
    case "hold":
      return "bg-amber-500";
    default:
      return "bg-slate-500";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DecisionRationale = memo(function DecisionRationale({
  verdict,
  rationalePoints,
  isDemoMode = false,
  className,
}: DecisionRationaleProps): JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();

  // Combine verdict rationale with any additional points
  const mainRationale = verdict?.rationale;
  const reasons = rationalePoints ?? [];

  // Don't render if no content
  if (!mainRationale && reasons.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "relative rounded-xl border overflow-hidden",
        "bg-blue-500/10 backdrop-blur-xl",
        "border-white/10",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        className
      )}
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      data-testid="decision-rationale"
      role="region"
      aria-label="Decision rationale"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <LightbulbIcon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-300">Decision Rationale</h3>
        {isDemoMode && (
          <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Demo
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Main Rationale */}
        {mainRationale && (
          <motion.div
            variants={prefersReducedMotion ? undefined : itemVariants}
          >
            <p className="text-sm text-slate-200 leading-relaxed">
              {mainRationale}
            </p>
          </motion.div>
        )}

        {/* Additional Reason Points */}
        {reasons.length > 0 && (
          <motion.ul
            className="space-y-2"
            variants={prefersReducedMotion ? undefined : containerVariants}
          >
            {reasons.map((reason, index) => (
              <motion.li
                key={index}
                className="flex items-start gap-2"
                variants={prefersReducedMotion ? undefined : itemVariants}
              >
                <span
                  className={cn(
                    "flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2",
                    getBulletColor(verdict?.recommendation)
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm text-slate-300">{reason}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}

        {/* Blocking Factors (if any) */}
        {verdict?.blocking_factors && verdict.blocking_factors.length > 0 && (
          <motion.div
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            variants={prefersReducedMotion ? undefined : itemVariants}
          >
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
              Blocking Factors
            </p>
            <ul className="space-y-1">
              {verdict.blocking_factors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                  <span className="text-sm text-red-300">{factor}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default DecisionRationale;
