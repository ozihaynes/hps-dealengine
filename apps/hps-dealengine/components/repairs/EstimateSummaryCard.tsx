// ============================================================================
// ESTIMATE SUMMARY CARD — Hero Budget Display
// ============================================================================
// Principles Applied:
// - uiux-art-director: Hero card, clear visual hierarchy
// - motion-choreographer: Number count-up animation
// - behavioral-design-strategist: Immediate visibility of key metric
// ============================================================================

"use client";

import { memo, useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import {
  card,
  glowEffects,
  confidenceBadge,
  motionVariants,
  useMotion,
  heroTypography,
} from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface EstimateSummaryCardProps {
  baseEstimate: number;
  contingency: number;
  contingencyPercent: number;
  totalBudget: number;
  lastUpdated?: string;
  isDemoMode?: boolean;
  className?: string;
  // ═══════════════════════════════════════════════════════════
  // NEW PROPS — Slice 2: Hero Prominence & Trust
  // ═══════════════════════════════════════════════════════════
  /** After Repair Value for percentage context */
  arvValue?: number;
  /** Whether a GC estimate has been submitted */
  hasGCEstimate?: boolean;
}

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================

const AnimatedNumber = memo(function AnimatedNumber({
  value,
  duration = 0.6,
}: {
  value: number;
  duration?: number;
}) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(current)
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
});

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EstimateSummaryCard = memo(function EstimateSummaryCard({
  baseEstimate,
  contingency,
  contingencyPercent,
  totalBudget,
  lastUpdated,
  isDemoMode = false,
  className = "",
  // Slice 2: Hero Prominence & Trust
  arvValue,
  hasGCEstimate = false,
}: EstimateSummaryCardProps) {
  const { isReduced } = useMotion();

  // Animation state for pulse on value change (skip mount animation)
  const prevBudgetRef = useRef(totalBudget);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    // Only pulse if value actually changed (not on mount)
    if (prevBudgetRef.current !== totalBudget) {
      setPulseKey((k) => k + 1);
      prevBudgetRef.current = totalBudget;
    }
  }, [totalBudget]);

  // ═══════════════════════════════════════════════════════════
  // ARV PERCENTAGE CALCULATION
  // Principle: Context Through Comparison
  // ═══════════════════════════════════════════════════════════
  const arvPercentage =
    arvValue && arvValue > 0 && totalBudget > 0
      ? Math.round((totalBudget / arvValue) * 100)
      : null;

  const getArvColor = (pct: number) => {
    if (pct <= 15) return "text-emerald-400"; // Excellent
    if (pct <= 25) return "text-amber-400"; // Moderate
    return "text-red-400"; // High
  };

  // ═══════════════════════════════════════════════════════════
  // CONFIDENCE BADGE
  // Principle: Trust Through Transparency
  // ═══════════════════════════════════════════════════════════
  const badge = hasGCEstimate ? confidenceBadge.verified : confidenceBadge.auto;
  const BadgeIcon = hasGCEstimate ? CheckCircle : Sparkles;

  return (
    <motion.div
      initial={isReduced ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isReduced ? 0 : 0.2 }}
      className={`
        ${card.base}
        ${card.hover}
        ${card.padding}
        relative overflow-hidden
        ${isDemoMode ? "border-dashed" : ""}
        ${className}
      `}
    >
      {/* Background gradient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Demo badge */}
      {isDemoMode && (
        <span className="absolute top-3 right-3 text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
          Demo
        </span>
      )}

      {/* ═══════════════════════════════════════════════════════
          HEADER ROW: Title + Confidence Badge
          ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">Repair Budget</h3>

        {/* Confidence Badge */}
        <motion.span
          className={`
            inline-flex items-center gap-1.5
            ${badge.bg} ${badge.border} ${badge.text}
            text-xs font-medium px-2.5 py-1 rounded-full border
          `}
          initial={isReduced ? undefined : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.1,
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
        >
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </motion.span>
      </div>

      {/* ═══════════════════════════════════════════════════════
          HERO NUMBER: Total Budget (48px + glow)
          ═══════════════════════════════════════════════════════ */}
      <motion.div
        className="mb-4"
        key={pulseKey}
        animate={
          pulseKey > 0 && !isReduced
            ? { scale: [...motionVariants.pulse.animate.scale] }
            : undefined
        }
        transition={motionVariants.pulse.transition}
      >
        <motion.span
          className={`
            ${heroTypography.budget.className}
            text-emerald-400 ${glowEffects.emerald.md}
          `}
          style={{
            fontFeatureSettings: heroTypography.budget.fontFeatureSettings,
          }}
          animate={
            isReduced
              ? undefined
              : {
                  filter: [...glowEffects.emerald.animationSteps.subtle],
                }
          }
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-label={`Total repair budget: ${formatCurrency(totalBudget)}`}
        >
          <AnimatedNumber value={totalBudget} />
        </motion.span>

        {/* ARV Context */}
        {arvPercentage !== null && (
          <p className="text-sm text-slate-400 mt-2">
            <span className={`font-semibold ${getArvColor(arvPercentage)}`}>
              {arvPercentage}%
            </span>{" "}
            of ARV
            {arvValue && (
              <span className="text-slate-500 ml-1">
                ({formatCurrency(arvValue)})
              </span>
            )}
          </p>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          BREAKDOWN: Base + Contingency
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
        <div>
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
            Base Estimate
          </p>
          <p className="text-lg tabular-nums font-semibold text-slate-200">
            {formatCurrency(baseEstimate)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
            Contingency ({contingencyPercent}%)
          </p>
          <p className="text-lg tabular-nums font-semibold text-amber-400">
            +{formatCurrency(contingency)}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          FOOTER: Last Updated
          ═══════════════════════════════════════════════════════ */}
      {lastUpdated && (
        <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-800/50">
          Updated {formatRelativeTime(lastUpdated)}
        </p>
      )}
    </motion.div>
  );
});

export default EstimateSummaryCard;
