/**
 * EmptyDeals — Empty state for deals list
 *
 * @module components/deals/EmptyDeals
 * @version 1.0.0 (Slice 19)
 */

"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";

export interface EmptyDealsProps {
  hasFilters?: boolean;
  onResetFilters?: () => void;
  className?: string;
  testId?: string;
}

export const EmptyDeals = memo(function EmptyDeals({
  hasFilters = false,
  onResetFilters,
  className,
  testId,
}: EmptyDealsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center",
        "py-16 px-6",
        "text-center",
        className
      )}
      data-testid={testId ?? "empty-deals"}
      role="status"
      aria-label={hasFilters ? "No deals match filters" : "No deals yet"}
    >
      {/* Illustration */}
      <div className="text-6xl mb-6" aria-hidden="true">
        {hasFilters ? "\uD83D\uDD0D" : "\uD83D\uDCCB"}
      </div>

      {/* Message */}
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">
        {hasFilters ? "No deals match your filters" : "No deals yet"}
      </h3>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        {hasFilters
          ? "Try adjusting your filters or search query to find what you're looking for."
          : "Start by creating your first deal to see it appear here."}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {hasFilters && onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className={cn(
              "h-11 min-h-[44px] px-6",
              "rounded-lg text-sm font-medium",
              "bg-zinc-800 hover:bg-zinc-700",
              "text-zinc-100",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-zinc-500"
            )}
          >
            Reset Filters
          </button>
        ) : (
          <Link
            href="/startup"
            className={cn(
              "h-11 min-h-[44px] px-6",
              "inline-flex items-center justify-center",
              "rounded-lg text-sm font-medium",
              "bg-emerald-600 hover:bg-emerald-500",
              "text-white",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500"
            )}
          >
            Create Deal
          </Link>
        )}
      </div>
    </motion.div>
  );
});

export default EmptyDeals;
