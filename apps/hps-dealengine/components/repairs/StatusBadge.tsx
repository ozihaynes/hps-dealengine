// ============================================================================
// STATUS BADGE — Reusable Status Indicator
// ============================================================================
// Principles Applied:
// - uiux-art-director: Clear visual hierarchy, status at a glance
// - accessibility-champion: WCAG AA contrast, screen reader support
// - motion-choreographer: Subtle pulse for pending states
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Eye, Send, X, AlertTriangle } from "lucide-react";
import { statusColors } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

export type EstimateStatus =
  | "pending"
  | "sent"
  | "viewed"
  | "submitted"
  | "expired"
  | "cancelled";

interface StatusBadgeProps {
  status: EstimateStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const statusConfig: Record<
  EstimateStatus,
  {
    label: string;
    icon: typeof Check;
    pulse: boolean;
  }
> = {
  pending: { label: "Pending", icon: Clock, pulse: true },
  sent: { label: "Sent", icon: Send, pulse: false },
  viewed: { label: "Viewed", icon: Eye, pulse: false },
  submitted: { label: "Submitted", icon: Check, pulse: false },
  expired: { label: "Expired", icon: AlertTriangle, pulse: false },
  cancelled: { label: "Cancelled", icon: X, pulse: false },
};

const sizeConfig = {
  sm: {
    badge: "px-2 py-0.5 text-xs gap-1",
    icon: 12,
    dot: "w-1.5 h-1.5",
  },
  md: {
    badge: "px-2.5 py-1 text-sm gap-1.5",
    icon: 14,
    dot: "w-2 h-2",
  },
  lg: {
    badge: "px-3 py-1.5 text-sm gap-2",
    icon: 16,
    dot: "w-2.5 h-2.5",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const StatusBadge = memo(function StatusBadge({
  status,
  showLabel = true,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const colors = statusColors[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`Estimate status: ${config.label}`}
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizes.badge}
        ${className}
      `}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}30`,
      }}
    >
      {/* Pulsing dot for pending status */}
      {config.pulse ? (
        <motion.span
          className={`${sizes.dot} rounded-full`}
          style={{ backgroundColor: colors.border }}
          animate={{
            opacity: [1, 0.5, 1],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        />
      ) : (
        <Icon size={sizes.icon} aria-hidden="true" />
      )}

      {/* Label */}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
});

export default StatusBadge;
