/**
 * GateIcon — Slice 17
 *
 * Individual risk gate status icon with tooltip.
 * Shows visual status indicator for each gate.
 *
 * Status Types:
 * - pass: Green checkmark
 * - warning/watch: Amber warning
 * - fail: Red X
 * - blocking: Red pulsing (deal killer)
 * - unknown: Gray question mark
 *
 * Principles Applied:
 * - Preattentive Processing: Color-coded for instant recognition
 * - Fitts's Law: Adequate touch target (32x32px min)
 * - Accessibility: Tooltip + aria-label
 *
 * @module components/dashboard/status/GateIcon
 * @version 1.0.0 (Slice 17)
 */

"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type GateStatus = "pass" | "warning" | "watch" | "fail" | "blocking" | "unknown";

export interface GateIconProps {
  /** Gate identifier */
  gateId: string;
  /** Display label for tooltip */
  label: string;
  /** Current status */
  status: GateStatus;
  /** Optional reason/description */
  reason?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  pass: {
    icon: "✓",
    label: "Passed",
    bgClass: "bg-emerald-500/20",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    pulse: false,
  },
  warning: {
    icon: "⚠",
    label: "Warning",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    pulse: false,
  },
  watch: {
    icon: "⚠",
    label: "Watch",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    pulse: false,
  },
  fail: {
    icon: "✗",
    label: "Failed",
    bgClass: "bg-red-500/20",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
    pulse: false,
  },
  blocking: {
    icon: "⊘",
    label: "Blocking",
    bgClass: "bg-red-500/30",
    textClass: "text-red-400",
    borderClass: "border-red-500/50",
    pulse: true,
  },
  unknown: {
    icon: "?",
    label: "Unknown",
    bgClass: "bg-slate-500/20",
    textClass: "text-slate-400",
    borderClass: "border-slate-500/30",
    pulse: false,
  },
} as const;

const SIZE_CONFIG = {
  sm: { container: "w-7 h-7", icon: "text-xs", tooltip: "text-xs" },
  md: { container: "w-8 h-8", icon: "text-sm", tooltip: "text-sm" },
  lg: { container: "w-10 h-10", icon: "text-base", tooltip: "text-sm" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const GateIcon = memo(function GateIcon({
  gateId,
  label,
  status,
  reason,
  size = "md",
  className,
}: GateIconProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {/* Icon button */}
      <button
        type="button"
        className={cn(
          // Size
          sizeConfig.container,
          // Layout
          "flex items-center justify-center",
          "rounded-lg border",
          // Colors
          config.bgClass,
          config.textClass,
          config.borderClass,
          // Interaction
          "transition-all duration-150",
          "hover:scale-110",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900",
          // Pulse for blocking
          config.pulse && !prefersReducedMotion && "animate-pulse"
        )}
        aria-label={`${label}: ${config.label}${reason ? ` - ${reason}` : ""}`}
        data-testid={`gate-icon-${gateId}`}
        data-status={status}
      >
        <span className={sizeConfig.icon} aria-hidden="true">
          {config.icon}
        </span>
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              // Position
              "absolute z-50",
              "bottom-full left-1/2 -translate-x-1/2 mb-2",
              // Styling
              "px-3 py-2 rounded-lg",
              "bg-[var(--card-bg-solid)] border border-white/10 backdrop-blur-xl",
              "shadow-lg shadow-black/30",
              // Text
              sizeConfig.tooltip,
              "text-slate-100 whitespace-nowrap",
              // Arrow
              "after:absolute after:top-full after:left-1/2 after:-translate-x-1/2",
              "after:border-4 after:border-transparent after:border-t-slate-800"
            )}
            role="tooltip"
          >
            <div className="font-medium">{label}</div>
            <div className={cn("text-xs", config.textClass)}>
              {config.label}
            </div>
            {reason && (
              <div className="text-xs text-slate-400 mt-1 max-w-[200px] whitespace-normal">
                {reason}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default GateIcon;
