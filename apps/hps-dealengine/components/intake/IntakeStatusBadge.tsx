"use client";

import React from "react";
import type { IntakeSubmissionStatus } from "@/lib/intakeStaff";

type IntakeStatusBadgeProps = {
  status: IntakeSubmissionStatus | string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: "Draft",
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/30",
  },
  SUBMITTED: {
    label: "Submitted",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  PENDING_REVIEW: {
    label: "Pending Review",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  ARCHIVED: {
    label: "Archived",
    bg: "bg-gray-500/10",
    text: "text-gray-500",
    border: "border-gray-500/20",
  },
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function IntakeStatusBadge({
  status,
  size = "md",
  pulse = false,
}: IntakeStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/30",
  };

  const shouldPulse =
    pulse || status === "PENDING_REVIEW" || status === "SUBMITTED";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bg} ${config.text} ${config.border}
        ${SIZE_CLASSES[size]}
      `}
    >
      {shouldPulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              status === "PENDING_REVIEW" || status === "SUBMITTED"
                ? "bg-amber-400"
                : "bg-current"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              status === "PENDING_REVIEW" || status === "SUBMITTED"
                ? "bg-amber-400"
                : "bg-current"
            }`}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}

export default IntakeStatusBadge;
