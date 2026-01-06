/**
 * ScoreRing — Slice 15 (Circular Progress)
 *
 * Animated circular progress indicator that draws from 0 to value.
 * Used for displaying quality scores (0-100).
 *
 * Animation: Draws circle stroke from 0 to target value over 800ms.
 *
 * @defensive Handles NaN/negative/over-100 values
 * @accessible Uses aria-valuenow for screen readers
 *
 * @module components/dashboard/confidence/ScoreRing
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { safeNumber } from "@/lib/utils/numbers";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ScoreRingProps {
  /** Score value (0-100) */
  score: number | null | undefined;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the score number in center */
  showValue?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SIZE_CONFIG = {
  sm: { dimension: 48, strokeWidth: 4, fontSize: "text-sm" },
  md: { dimension: 64, strokeWidth: 5, fontSize: "text-lg" },
  lg: { dimension: 80, strokeWidth: 6, fontSize: "text-xl" },
} as const;

/**
 * Get stroke color based on score threshold
 */
function getScoreColor(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-amber-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-red-500";
}

/**
 * Get text color based on score threshold
 */
function getScoreTextColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ScoreRing = memo(function ScoreRing({
  score,
  size = "md",
  showValue = true,
  className,
}: ScoreRingProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const config = SIZE_CONFIG[size];

  // Validate and clamp score
  const safeScore = safeNumber(score);
  const clampedScore = safeScore === null ? 0 : Math.max(0, Math.min(100, safeScore));

  // Calculate SVG properties
  const radius = (config.dimension - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Colors based on score
  const strokeColor = getScoreColor(clampedScore);
  const textColor = getScoreTextColor(clampedScore);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: config.dimension, height: config.dimension }}
      data-testid="score-ring"
      data-score={clampedScore}
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score: ${clampedScore} out of 100`}
    >
      <svg
        width={config.dimension}
        height={config.dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-slate-700"
        />

        {/* Progress circle (animated) */}
        <motion.circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          className={strokeColor}
          style={{
            strokeDasharray: circumference,
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: TIMING.dramatic, ease: EASING.decelerate }
          }
        />
      </svg>

      {/* Center value */}
      {showValue && (
        <span
          className={cn(
            "absolute font-bold",
            config.fontSize,
            safeScore === null ? "text-slate-500" : textColor
          )}
        >
          {safeScore === null ? "—" : Math.round(clampedScore)}
        </span>
      )}
    </div>
  );
});

export default ScoreRing;
