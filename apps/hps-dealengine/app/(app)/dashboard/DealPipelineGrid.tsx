/**
 * DealPipelineGrid Component
 *
 * Responsive grid layout for displaying deal cards. Supports various
 * view modes and responsive breakpoints.
 *
 * @module dashboard/DealPipelineGrid
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import React from "react";
import { cn } from "@/components/ui";
import { DealCard } from "./DealCard";
import type { DealSummary } from "./usePortfolioData";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DealPipelineGridProps {
  /** Array of deals to display */
  deals: DealSummary[];
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DealPipelineGrid({ deals, className }: DealPipelineGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        // Responsive grid columns
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}

export default DealPipelineGrid;
