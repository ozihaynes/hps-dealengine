"use client";

import type { JobStatus } from "@hps-internal/contracts";
import {
  FileIcon,
  MapPinIcon,
  SearchIcon,
  CheckCircleIcon,
  PlayIcon,
  CheckIcon,
  XCircleIcon,
  ArchiveIcon,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface JobStatusBadgeProps {
  status: JobStatus;
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

const STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-300",
    borderColor: "border-slate-500/30",
    icon: FileIcon,
  },
  mapped: {
    label: "Mapped",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-300",
    borderColor: "border-blue-500/30",
    icon: MapPinIcon,
  },
  validating: {
    label: "Validating",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-300",
    borderColor: "border-amber-500/30",
    icon: SearchIcon,
  },
  ready: {
    label: "Ready",
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-500/30",
    icon: CheckCircleIcon,
  },
  promoting: {
    label: "Promoting",
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-300",
    borderColor: "border-purple-500/30",
    icon: PlayIcon,
  },
  complete: {
    label: "Complete",
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-500/30",
    icon: CheckIcon,
  },
  failed: {
    label: "Failed",
    bgColor: "bg-red-500/20",
    textColor: "text-red-300",
    borderColor: "border-red-500/30",
    icon: XCircleIcon,
  },
  archived: {
    label: "Archived",
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-400",
    borderColor: "border-slate-500/30",
    icon: ArchiveIcon,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function JobStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
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
