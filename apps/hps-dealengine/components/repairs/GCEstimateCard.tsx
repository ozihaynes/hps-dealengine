// ============================================================================
// GC ESTIMATE CARD — Individual Contractor Card
// ============================================================================
// Principles Applied:
// - uiux-art-director: Compact card with clear hierarchy
// - accessibility-champion: Touch targets, focus states
// - motion-choreographer: Hover lift, button feedback
// ============================================================================

"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, Download, Clock, User } from "lucide-react";
import { StatusBadge, EstimateStatus } from "./StatusBadge";
import { Button } from "@/components/ui/Button";
import { card, focus, useMotion } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface GCEstimateCardProps {
  id: string;
  gcName: string;
  gcEmail?: string;
  status: EstimateStatus;
  submittedAt?: string;
  sentAt?: string;
  filePath?: string;
  onView?: () => void;
  onDownload?: () => void;
  isDemoMode?: boolean;
  className?: string;
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GCEstimateCard = memo(function GCEstimateCard({
  id,
  gcName,
  gcEmail,
  status,
  submittedAt,
  sentAt,
  filePath,
  onView,
  onDownload,
  isDemoMode = false,
  className = "",
}: GCEstimateCardProps) {
  const hasFile = !!filePath && status === "submitted";
  const displayDate = submittedAt || sentAt;
  const { isReduced } = useMotion();

  // Keyboard handler for Enter/Space activation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (hasFile && onView) {
          onView();
        }
      }
    },
    [hasFile, onView]
  );

  return (
    <motion.div
      initial={isReduced ? undefined : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={isReduced ? undefined : { y: -2, transition: { duration: 0.15 } }}
      whileTap={isReduced ? undefined : { scale: 0.98 }}
      className={`
        ${card.base}
        min-w-[200px] w-[200px]
        flex flex-col
        ${isDemoMode ? "border-dashed" : ""}
        ${focus.className}
        ${className}
      `}
      style={{ padding: "16px" }}
      tabIndex={0}
      role="article"
      aria-label={`Estimate from ${gcName}, status: ${status}`}
      onKeyDown={handleKeyDown}
    >
      {/* Status Badge */}
      <div className="mb-3">
        <StatusBadge status={status} size="sm" />
      </div>

      {/* GC Name */}
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <h4 className="text-sm font-medium text-slate-200 truncate">
          {gcName}
        </h4>
      </div>

      {/* Email */}
      {gcEmail && (
        <p
          className="text-xs text-slate-500 truncate mb-3"
          title={gcEmail}
        >
          {gcEmail}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-slate-700/50 my-3" />

      {/* Date */}
      {displayDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <Clock size={12} />
          <span>
            {status === "submitted" ? "Submitted" : "Sent"}:{" "}
            {formatDate(displayDate)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {hasFile && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onView}
              className="
                flex-1 h-8 min-h-[44px]
                text-xs font-medium
                text-slate-300 hover:text-white
                bg-slate-800 hover:bg-slate-700
                border border-slate-700 hover:border-slate-600
                transition-colors duration-150
              "
            >
              <Eye size={14} className="mr-1.5" />
              View
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="
                h-8 min-h-[44px] min-w-[44px] px-2
                text-slate-400 hover:text-white
                bg-slate-800 hover:bg-slate-700
                border border-slate-700 hover:border-slate-600
                transition-colors duration-150
              "
              aria-label="Download estimate"
            >
              <Download size={14} />
            </Button>
          </>
        )}

        {!hasFile && status !== "submitted" && (
          <span className="text-xs text-slate-500 italic">
            Awaiting response...
          </span>
        )}
      </div>

      {/* Demo badge */}
      {isDemoMode && (
        <span className="absolute top-2 right-2 text-[10px] font-medium text-slate-600">
          Demo
        </span>
      )}
    </motion.div>
  );
});

export default GCEstimateCard;
