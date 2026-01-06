/**
 * StatusBar — Slice 17
 *
 * Horizontal status strip showing risk gates and evidence health.
 * Provides instant visibility into deal blockers and documentation status.
 *
 * Layout:
 * - Mobile (<640px): Stack vertically
 * - Tablet/Desktop: Side by side (50/50)
 *
 * Principles Applied:
 * - Information Scent: Quick status visibility
 * - Progressive Disclosure: Summary -> Details via drawer
 * - Gestalt Proximity: Related status grouped together
 *
 * @module components/dashboard/status/StatusBar
 * @version 1.0.0 (Slice 17)
 */

"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import type { EnhancedRiskSummary, RiskGatesResult, EvidenceHealth } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// Sub-components
import { RiskStatusCard } from "./RiskStatusCard";
import { EvidenceStatusCard } from "./EvidenceStatusCard";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StatusBarProps {
  /** Enhanced risk summary from engine */
  riskSummary?: EnhancedRiskSummary | null;
  /** Legacy risk gates (fallback) */
  riskGates?: RiskGatesResult | null;
  /** Evidence health data from engine */
  evidenceHealth?: EvidenceHealth | null;
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: TIMING.standard,
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const StatusBar = memo(function StatusBar({
  riskSummary,
  riskGates,
  evidenceHealth,
  isDemoMode = false,
  className,
}: StatusBarProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        // Responsive grid
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2", // Stack on mobile, side-by-side on tablet+
        className
      )}
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      data-testid="status-bar"
      role="region"
      aria-label="Deal status overview"
    >
      {/* Risk Gates Card */}
      <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
        <RiskStatusCard
          riskSummary={riskSummary}
          riskGates={riskGates}
          isDemoMode={isDemoMode}
        />
      </motion.div>

      {/* Evidence Status Card */}
      <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
        <EvidenceStatusCard
          evidenceHealth={evidenceHealth}
          isDemoMode={isDemoMode}
        />
      </motion.div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default StatusBar;
