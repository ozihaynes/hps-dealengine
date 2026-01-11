// ============================================================================
// PROGRESS BAR — Proportional Progress Indicator
// ============================================================================
// Principles Applied:
// - uiux-art-director: Clear visual hierarchy, proportional representation
// - accessibility-champion: ARIA progressbar role, screen reader support
// - motion-choreographer: Smooth width transitions
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";

// ============================================================================
// TYPES
// ============================================================================

interface ProgressBarProps {
  /** Current value (0-100 or actual value if max provided) */
  value: number;
  /** Maximum value (defaults to 100 for percentage) */
  max?: number;
  /** Color of the filled portion */
  color?: string;
  /** Background color of the track */
  trackColor?: string;
  /** Height of the bar */
  height?: "sm" | "md" | "lg";
  /** Whether to show percentage label */
  showLabel?: boolean;
  /** Label for accessibility */
  label: string;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const heightConfig = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  color = "#10b981", // emerald-500
  trackColor = "rgba(51, 65, 85, 0.5)", // slate-700/50
  height = "md",
  showLabel = false,
  label,
  animate = true,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const heightClass = heightConfig[height];

  return (
    <div className={`w-full ${className}`}>
      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={`w-full rounded-full overflow-hidden ${heightClass}`}
        style={{ backgroundColor: trackColor }}
      >
        {/* Fill */}
        <motion.div
          className={`${heightClass} rounded-full`}
          style={{ backgroundColor: color }}
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.5,
            ease: [0, 0, 0.2, 1], // ease-out
          }}
        />
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className="mt-1 text-xs text-slate-400 tabular-nums">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
});

// ============================================================================
// VARIANT: Multi-segment progress bar for category breakdowns
// ============================================================================

interface ProgressBarSegment {
  value: number;
  color: string;
  label: string;
}

interface MultiProgressBarProps {
  segments: ProgressBarSegment[];
  total: number;
  height?: "sm" | "md" | "lg";
  className?: string;
}

export const MultiProgressBar = memo(function MultiProgressBar({
  segments,
  total,
  height = "md",
  className = "",
}: MultiProgressBarProps) {
  const heightClass = heightConfig[height];

  return (
    <div
      role="img"
      aria-label={`Budget allocation showing ${segments.length} categories totaling ${total}`}
      className={`w-full rounded-full overflow-hidden ${heightClass} bg-slate-700/50 flex ${className}`}
    >
      {segments.map((segment, index) => {
        const percentage = (segment.value / total) * 100;
        return (
          <motion.div
            key={`${segment.label}-${index}`}
            className={`${heightClass}`}
            style={{ backgroundColor: segment.color }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: 0.5,
              delay: index * 0.05, // Stagger effect
              ease: [0, 0, 0.2, 1],
            }}
            title={`${segment.label}: ${percentage.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
});

export default ProgressBar;
