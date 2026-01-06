/**
 * DealsList — Grid layout for deal cards
 *
 * Features:
 * - Responsive grid (1-4 columns)
 * - Staggered card animations
 * - Empty state handling
 * - Loading skeleton
 *
 * @module components/deals/DealsList
 * @version 1.0.0 (Slice 19)
 */

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";
import { DealCard, type DealCardData } from "./DealCard";
import { EmptyDeals } from "./EmptyDeals";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DealsListProps {
  deals: DealCardData[];
  isLoading?: boolean;
  hasFilters?: boolean;
  onResetFilters?: () => void;
  onQuickAction?: (dealId: string) => void;
  className?: string;
  testId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function DealsListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6"
      data-testid="deals-list-skeleton"
      aria-busy="true"
      aria-label="Loading deals"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl overflow-hidden animate-pulse",
            "bg-[var(--card-bg)] border border-white/10 backdrop-blur-xl",
            "h-[220px]"
          )}
        >
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-16 bg-slate-700/50 rounded" />
              <div className="h-4 w-12 bg-slate-700/50 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-slate-700/50 rounded" />
            <div className="h-4 w-1/2 bg-slate-700/50 rounded" />
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="h-10 bg-slate-700/50 rounded" />
              <div className="h-10 bg-slate-700/50 rounded" />
              <div className="h-10 bg-slate-700/50 rounded" />
            </div>
            <div className="h-11 bg-slate-700/50 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DealsList = memo(function DealsList({
  deals,
  isLoading = false,
  hasFilters = false,
  onResetFilters,
  onQuickAction,
  className,
  testId,
}: DealsListProps) {
  // Loading state
  if (isLoading) {
    return <DealsListSkeleton />;
  }

  // Empty state
  if (deals.length === 0) {
    return (
      <EmptyDeals hasFilters={hasFilters} onResetFilters={onResetFilters} />
    );
  }

  // Deals grid
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid gap-4 lg:gap-6",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
      data-testid={testId ?? "deals-list"}
      role="feed"
      aria-label={`${deals.length} deals`}
    >
      {deals.map((deal) => (
        <DealCard
          key={deal.id}
          deal={deal}
          onQuickAction={onQuickAction}
        />
      ))}
    </motion.div>
  );
});

export default DealsList;
