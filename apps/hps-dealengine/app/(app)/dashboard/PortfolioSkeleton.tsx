/**
 * PortfolioSkeleton Component
 *
 * Loading skeleton for the Portfolio Dashboard. Displays animated
 * placeholders matching the layout of the actual content.
 *
 * DESIGN PRINCIPLES:
 * - Matches exact layout of PortfolioDashboard
 * - Subtle pulse animation (not distracting)
 * - Accessible with proper ARIA
 *
 * @module dashboard/PortfolioSkeleton
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import React from "react";
import { cn } from "@/components/ui";

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded", className)}
      style={{
        backgroundColor: "var(--surface-2)",
        ...style,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function HeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PULSE SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function PulseSkeleton() {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        {/* Metric cards */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col min-w-[100px]">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
        
        {/* Verdict distribution */}
        <div className="flex flex-col gap-2 min-w-[180px]">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-full rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER BAR SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function FilterBarSkeleton() {
  return (
    <div
      className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL CARD SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function DealCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* Accent strip */}
      <Skeleton className="h-1 w-full rounded-none" />
      
      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Verdict badge */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Mini gauges */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="h-4 w-10 mb-1" />
              <Skeleton className="h-2 w-8" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PortfolioSkeleton() {
  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
      role="status"
      aria-label="Loading portfolio dashboard"
    >
      {/* Header */}
      <HeaderSkeleton />

      {/* Metrics pulse bar */}
      <PulseSkeleton />

      {/* Filter bar */}
      <FilterBarSkeleton />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Deal grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <DealCardSkeleton key={i} />
        ))}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading portfolio dashboard...</span>
    </div>
  );
}

export default PortfolioSkeleton;
