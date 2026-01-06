"use client";

import type { ItemStatus } from "@hps-internal/contracts";
import {
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  XIcon,
  XCircleIcon,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ItemStatusBadgeProps {
  status: ItemStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
}

interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

// =============================================================================
// CONFIG
// =============================================================================

const STATUS_CONFIG: Record<ItemStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-300",
    borderColor: "border-slate-500/30",
    icon: ClockIcon,
  },
  valid: {
    label: "Valid",
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-500/30",
    icon: CheckCircleIcon,
  },
  needs_fix: {
    label: "Needs Fix",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-300",
    borderColor: "border-amber-500/30",
    icon: AlertTriangleIcon,
  },
  promoted: {
    label: "Promoted",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-300",
    borderColor: "border-blue-500/30",
    icon: CheckIcon,
  },
  skipped_duplicate: {
    label: "Duplicate",
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-400",
    borderColor: "border-slate-500/30",
    icon: CopyIcon,
  },
  skipped_other: {
    label: "Skipped",
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-400",
    borderColor: "border-slate-500/30",
    icon: XIcon,
  },
  failed: {
    label: "Failed",
    bgColor: "bg-red-500/20",
    textColor: "text-red-300",
    borderColor: "border-red-500/30",
    icon: XCircleIcon,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ItemStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: ItemStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
