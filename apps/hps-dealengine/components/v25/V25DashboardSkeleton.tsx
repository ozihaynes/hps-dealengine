/**
 * V25DashboardSkeleton — Slice 13
 *
 * Loading skeleton for the V2.5 dashboard.
 * Matches the visual structure of V25Dashboard.
 *
 * Design Principles:
 * - Shimmer animation for perceived performance
 * - Matches actual layout dimensions
 * - Accessible loading state
 *
 * @module V25DashboardSkeleton
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface V25DashboardSkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for smaller viewports */
  compact?: boolean;
  /** Show detailed cards section */
  showDetailedCards?: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────

const shimmer = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Skeleton Box
// ─────────────────────────────────────────────────────────────────────

interface SkeletonBoxProps {
  className?: string;
  height?: string;
}

const SkeletonBox = memo(function SkeletonBox({
  className,
  height = 'h-4',
}: SkeletonBoxProps) {
  return (
    <motion.div
      variants={shimmer}
      className={cn('bg-slate-700/50 rounded', height, className)}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const V25DashboardSkeleton = memo(function V25DashboardSkeleton({
  className,
  compact = false,
  showDetailedCards = true,
}: V25DashboardSkeletonProps): JSX.Element {
  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      data-testid="v25-dashboard-skeleton"
      aria-label="Loading dashboard..."
      aria-busy="true"
      className={cn('space-y-4', className)}
    >
      {/* Verdict Hero Skeleton */}
      <motion.div
        variants={shimmer}
        className={cn(
          'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl',
          'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
          compact ? 'p-4' : 'p-6'
        )}
      >
        {/* Property Address */}
        <SkeletonBox className="w-48 mb-4" />

        {/* Verdict Display */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <SkeletonBox className="w-10 h-10 rounded-full" height="h-10" />
            <div>
              <SkeletonBox className="w-32 mb-2" height="h-8" />
              <SkeletonBox className="w-48" />
            </div>
          </div>
          <SkeletonBox className="w-28" height="h-8" />
        </div>

        {/* Confidence Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <SkeletonBox className="w-20" />
            <SkeletonBox className="w-12" />
          </div>
          <SkeletonBox className="w-full" height="h-2" />
        </div>

        {/* Verdict Reason */}
        <SkeletonBox className="w-full mb-2" />
        <SkeletonBox className="w-3/4" />
      </motion.div>

      {/* Status Strip Skeleton */}
      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        {[1, 2].map((i) => (
          <motion.div
            key={i}
            variants={shimmer}
            className="rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-3"
          >
            <div className="flex items-center justify-between">
              <SkeletonBox className="w-24" />
              <SkeletonBox className="w-20" height="h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Key Metrics Grid Skeleton */}
      {showDetailedCards && (
        <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-4')}>
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              variants={shimmer}
              className="rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-3"
            >
              <SkeletonBox className="w-16 mb-2" />
              <SkeletonBox className="w-20 mb-1" height="h-6" />
              <SkeletonBox className="w-24" />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default V25DashboardSkeleton;
