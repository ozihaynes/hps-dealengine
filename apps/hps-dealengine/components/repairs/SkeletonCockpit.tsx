// ============================================================================
// SKELETON COCKPIT — Loading State
// ============================================================================
// Principles Applied:
// - uiux-art-director: Consistent skeleton layout matching final design
// - behavioral-design-strategist: Reduces perceived wait time
// - motion-choreographer: Gradient shimmer animation (premium polish)
// - accessibility-champion: Respects prefers-reduced-motion
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useMotion } from "./designTokens";

// ============================================================================
// SKELETON PRIMITIVES
// ============================================================================

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

const Skeleton = memo(function Skeleton({
  className = "",
  width,
  height,
}: SkeletonProps) {
  const { isReduced } = useMotion();

  return (
    <div
      className={`relative overflow-hidden bg-slate-800 rounded ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      {/* Gradient shimmer overlay - respects reduced motion */}
      {!isReduced && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0.5,
          }}
        />
      )}
    </div>
  );
});

// ============================================================================
// SKELETON CARDS
// ============================================================================

const SkeletonSummaryCard = memo(function SkeletonSummaryCard() {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 h-[200px]">
      {/* Title */}
      <Skeleton className="h-4 w-32 mb-4" />

      {/* Large number */}
      <Skeleton className="h-10 w-40 mb-6" />

      {/* Breakdown row */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Timestamp */}
      <Skeleton className="h-3 w-36 mt-4" />
    </div>
  );
});

const SkeletonVelocityCard = memo(function SkeletonVelocityCard() {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 h-[200px]">
      {/* Title */}
      <Skeleton className="h-4 w-28 mb-4" />

      {/* Status pills */}
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* Progress */}
      <Skeleton className="h-2 w-full rounded-full mt-4" />

      {/* Label */}
      <Skeleton className="h-3 w-24 mt-3" />
    </div>
  );
});

const SkeletonGCCard = memo(function SkeletonGCCard() {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 min-w-[200px] h-[160px] flex-shrink-0">
      {/* Status badge */}
      <Skeleton className="h-6 w-20 rounded-full mb-3" />

      {/* GC Name */}
      <Skeleton className="h-5 w-32 mb-2" />

      {/* Email */}
      <Skeleton className="h-4 w-40 mb-4" />

      {/* Divider */}
      <Skeleton className="h-px w-full mb-3" />

      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  );
});

const SkeletonCategoryRow = memo(function SkeletonCategoryRow() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        {/* Icon + Name */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Amount + Chevron */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-5" />
        </div>
      </div>

      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SkeletonCockpit = memo(function SkeletonCockpit() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Loading bidding cockpit..."
    >
      {/* Header Row: Summary + Velocity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonSummaryCard />
        <SkeletonVelocityCard />
      </div>

      {/* GC Estimates Gallery */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          <SkeletonGCCard />
          <SkeletonGCCard />
          <SkeletonGCCard />
          <SkeletonGCCard />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          <SkeletonCategoryRow />
          <SkeletonCategoryRow />
          <SkeletonCategoryRow />
          <SkeletonCategoryRow />
          <SkeletonCategoryRow />
        </div>
      </div>
    </div>
  );
});

export default SkeletonCockpit;
