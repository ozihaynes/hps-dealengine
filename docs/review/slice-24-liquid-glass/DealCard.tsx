/**
 * DealCard — Individual deal card with verdict theming
 *
 * Features:
 * - Verdict-based left border and background tint
 * - Key metrics row (net clearance, ZOPA, gates)
 * - Relative timestamp
 * - Touch-friendly action buttons (44px min)
 * - Hover/focus states with ring
 *
 * @module components/deals/DealCard
 * @version 1.0.0 (Slice 19)
 */

"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";
import { getVerdictTheme } from "@/lib/constants/verdictThemes";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/display";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DealCardData {
  id: string;
  address: string;
  clientName?: string | null;
  verdict?: string | null;
  netClearance?: number | null;
  zopa?: number | null;
  gatesPassed?: number | null;
  gatesTotal?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface DealCardProps {
  deal: DealCardData;
  onQuickAction?: (dealId: string) => void;
  className?: string;
  testId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  },
  hover: {
    scale: 1.01,
    transition: { duration: 0.15 },
  },
  tap: {
    scale: 0.99,
    transition: { duration: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function VerdictChip({ verdict }: { verdict?: string | null }) {
  const theme = getVerdictTheme(verdict);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
        theme.chip
      )}
      aria-label={`Verdict: ${theme.label}`}
    >
      {theme.shortLabel}
    </span>
  );
}

function MetricItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className={cn("text-sm font-semibold", accent ?? "text-slate-100")}>
        {value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DealCard = memo(function DealCard({
  deal,
  onQuickAction,
  className,
  testId,
}: DealCardProps) {
  const theme = getVerdictTheme(deal.verdict);
  const timestamp = deal.updatedAt ?? deal.createdAt;
  const relativeTime = timestamp ? formatRelativeTime(timestamp) : "\u2014";

  // Format metrics with defensive null handling
  const netDisplay =
    deal.netClearance != null ? formatCurrency(deal.netClearance) : "\u2014";
  const zopaDisplay =
    deal.zopa != null ? formatCurrency(deal.zopa) : "\u2014";
  const gatesDisplay =
    deal.gatesPassed != null && deal.gatesTotal != null
      ? `${deal.gatesPassed}/${deal.gatesTotal}`
      : "\u2014";

  return (
    <motion.article
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      className={cn(
        // Base card styles
        "group relative rounded-xl overflow-hidden",
        "bg-slate-800/60 backdrop-blur-xl",
        "border border-white/10",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        // Verdict theming
        theme.border,
        theme.bg,
        // Focus/hover states
        "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-950",
        theme.ring,
        "transition-colors duration-150",
        className
      )}
      data-testid={testId ?? `deal-card-${deal.id}`}
      data-verdict={deal.verdict ?? "PENDING"}
      role="article"
      aria-labelledby={`deal-title-${deal.id}`}
    >
      {/* Header: Verdict + Timestamp */}
      <div className="flex items-center justify-between p-4 pb-2">
        <VerdictChip verdict={deal.verdict} />
        <time
          className="text-xs text-slate-500"
          dateTime={timestamp ?? undefined}
          title={timestamp ? new Date(timestamp).toLocaleString() : undefined}
        >
          {relativeTime}
        </time>
      </div>

      {/* Property Info */}
      <div className="px-4 pb-3">
        <h3
          id={`deal-title-${deal.id}`}
          className="text-base font-semibold text-slate-100 truncate"
          title={deal.address}
        >
          {deal.address}
        </h3>
        {deal.clientName && (
          <p
            className="text-sm text-slate-400 truncate"
            title={deal.clientName}
          >
            {deal.clientName}
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-t border-white/10">
        <MetricItem label="Net" value={netDisplay} accent={theme.accent} />
        <MetricItem label="ZOPA" value={zopaDisplay} />
        <MetricItem label="Gates" value={gatesDisplay} />
      </div>

      {/* Actions Row */}
      <div className="flex items-center gap-2 p-4 pt-2 border-t border-white/10">
        <Link
          href={`/overview?dealId=${deal.id}`}
          className={cn(
            "flex-1 flex items-center justify-center",
            "h-11 min-h-[44px]", // Touch target 44px
            "rounded-md text-sm font-medium",
            "bg-slate-700 hover:bg-slate-600",
            "text-slate-100",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          )}
        >
          View Deal
        </Link>
        {onQuickAction && (
          <button
            type="button"
            onClick={() => onQuickAction(deal.id)}
            className={cn(
              "flex items-center justify-center",
              "h-11 min-h-[44px] px-4", // Touch target 44px
              "rounded-md text-sm font-medium",
              "border border-slate-600 hover:border-slate-500",
              "text-slate-300 hover:text-slate-100",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            )}
            aria-label={`Quick action for ${deal.address}`}
          >
            Action
          </button>
        )}
      </div>
    </motion.article>
  );
});

export default DealCard;
