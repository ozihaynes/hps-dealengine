/**
 * CardSkeleton — Loading skeleton matching DealCard structure
 *
 * Provides a visually accurate loading placeholder for DealCard components.
 * Maintains the same dimensions, spacing, and structure for smooth transitions.
 *
 * Features:
 * - Matches DealCard layout exactly
 * - Staggered shimmer animation
 * - Reduced motion support
 * - Multiple variants (default, compact, minimal)
 *
 * @module components/loading/CardSkeleton
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import {
  ShimmerEffect,
  ShimmerText,
  ShimmerBadge,
  ShimmerButton,
} from './ShimmerEffect';

// =============================================================================
// TYPES
// =============================================================================

export interface CardSkeletonProps {
  /** Variant style */
  variant?: 'default' | 'compact' | 'minimal';
  /** Show action buttons */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CardSkeleton - Loading placeholder for DealCard
 *
 * @example
 * ```tsx
 * // Default - matches DealCard structure
 * <CardSkeleton />
 *
 * // Compact variant
 * <CardSkeleton variant="compact" />
 *
 * // Without action buttons
 * <CardSkeleton showActions={false} />
 * ```
 */
export const CardSkeleton = memo(function CardSkeleton({
  variant = 'default',
  showActions = true,
  className,
  testId,
}: CardSkeletonProps): React.ReactElement {
  // Minimal variant - just a simple card shape
  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl',
          'p-4',
          className
        )}
        data-testid={testId ?? 'card-skeleton-minimal'}
        aria-label="Loading..."
        aria-busy="true"
      >
        <ShimmerEffect width="100%" height={80} rounded="md" />
      </div>
    );
  }

  // Compact variant - condensed version
  if (variant === 'compact') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl',
          'overflow-hidden',
          className
        )}
        data-testid={testId ?? 'card-skeleton-compact'}
        aria-label="Loading..."
        aria-busy="true"
      >
        {/* Header row */}
        <motion.div variants={itemVariants} className="flex items-center justify-between p-3">
          <ShimmerBadge width={56} />
          <ShimmerText width={60} height={12} />
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants} className="px-3 pb-3">
          <ShimmerText width="80%" height={16} className="mb-1" />
          <ShimmerText width="50%" height={12} />
        </motion.div>
      </motion.div>
    );
  }

  // Default variant - matches DealCard exactly
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl',
        'overflow-hidden',
        // Match DealCard left border accent (neutral for skeleton)
        'border-l-4 border-l-slate-600',
        className
      )}
      data-testid={testId ?? 'card-skeleton'}
      aria-label="Loading deal card..."
      aria-busy="true"
      role="article"
    >
      {/* Header: Verdict Badge + Timestamp */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between p-4 pb-2"
      >
        <ShimmerBadge width={70} />
        <ShimmerText width={50} height={12} />
      </motion.div>

      {/* Property Info */}
      <motion.div variants={itemVariants} className="px-4 pb-3">
        <ShimmerText width="85%" height={18} className="mb-2" />
        <ShimmerText width="50%" height={14} />
      </motion.div>

      {/* Metrics Row */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-3 gap-2 px-4 py-3 border-t border-white/10"
      >
        {/* Net Metric */}
        <div className="flex flex-col gap-1">
          <ShimmerText width={60} height={16} />
          <ShimmerText width={30} height={10} />
        </div>
        {/* ZOPA Metric */}
        <div className="flex flex-col gap-1">
          <ShimmerText width={55} height={16} />
          <ShimmerText width={35} height={10} />
        </div>
        {/* Gates Metric */}
        <div className="flex flex-col gap-1">
          <ShimmerText width={35} height={16} />
          <ShimmerText width={32} height={10} />
        </div>
      </motion.div>

      {/* Actions Row */}
      {showActions && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 p-4 pt-2 border-t border-white/10"
        >
          <ShimmerButton width="100%" height={44} />
        </motion.div>
      )}
    </motion.div>
  );
});

// =============================================================================
// COMPOSITE SKELETON
// =============================================================================

/**
 * DealCardSkeleton - Alias for CardSkeleton with deal-specific defaults
 */
export const DealCardSkeleton = CardSkeleton;

/**
 * MetricCardSkeleton - Small metric card skeleton
 */
export interface MetricCardSkeletonProps {
  className?: string;
  testId?: string;
}

export const MetricCardSkeleton = memo(function MetricCardSkeleton({
  className,
  testId,
}: MetricCardSkeletonProps): React.ReactElement {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl',
        'p-4',
        className
      )}
      data-testid={testId ?? 'metric-card-skeleton'}
      aria-label="Loading metric..."
      aria-busy="true"
    >
      <motion.div variants={itemVariants}>
        <ShimmerText width={80} height={12} className="mb-2" />
      </motion.div>
      <motion.div variants={itemVariants}>
        <ShimmerText width={100} height={28} className="mb-1" />
      </motion.div>
      <motion.div variants={itemVariants}>
        <ShimmerText width={60} height={12} />
      </motion.div>
    </motion.div>
  );
});

/**
 * StatCardSkeleton - Stat card with icon placeholder
 */
export const StatCardSkeleton = memo(function StatCardSkeleton({
  className,
  testId,
}: MetricCardSkeletonProps): React.ReactElement {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl',
        'p-4 flex items-start gap-3',
        className
      )}
      data-testid={testId ?? 'stat-card-skeleton'}
      aria-label="Loading stat..."
      aria-busy="true"
    >
      {/* Icon placeholder */}
      <motion.div variants={itemVariants}>
        <ShimmerEffect width={40} height={40} rounded="lg" />
      </motion.div>

      {/* Content */}
      <div className="flex-1">
        <motion.div variants={itemVariants}>
          <ShimmerText width={60} height={12} className="mb-2" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ShimmerText width={80} height={24} />
        </motion.div>
      </div>
    </motion.div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default CardSkeleton;
