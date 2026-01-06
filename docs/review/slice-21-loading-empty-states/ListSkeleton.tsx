/**
 * ListSkeleton — Staggered list of skeleton cards
 *
 * Renders multiple CardSkeletons with staggered entrance animation.
 * Supports grid and list layouts with configurable item counts.
 *
 * Features:
 * - Staggered entrance animation
 * - Grid and list layout modes
 * - Configurable item count
 * - Responsive column support
 *
 * @module components/loading/ListSkeleton
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import { CardSkeleton, MetricCardSkeleton } from './CardSkeleton';

// =============================================================================
// TYPES
// =============================================================================

export interface ListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Layout mode */
  layout?: 'list' | 'grid';
  /** Grid columns (only for grid layout) */
  columns?: 1 | 2 | 3 | 4;
  /** Card variant */
  variant?: 'default' | 'compact' | 'minimal';
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Show action buttons on cards */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GAP_MAP: Record<string, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const COLUMNS_MAP: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ListSkeleton - Multiple card skeletons with staggered animation
 *
 * @example
 * ```tsx
 * // Basic list (3 items)
 * <ListSkeleton count={3} />
 *
 * // Grid layout with 2 columns
 * <ListSkeleton count={4} layout="grid" columns={2} />
 *
 * // Compact cards in grid
 * <ListSkeleton count={6} layout="grid" columns={3} variant="compact" />
 * ```
 */
export const ListSkeleton = memo(function ListSkeleton({
  count = 3,
  layout = 'list',
  columns = 2,
  variant = 'default',
  gap = 'md',
  showActions = true,
  className,
  testId,
}: ListSkeletonProps): React.ReactElement {
  const gapClass = GAP_MAP[gap];
  const columnsClass = layout === 'grid' ? COLUMNS_MAP[columns] : '';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        layout === 'grid' ? 'grid' : 'flex flex-col',
        gapClass,
        columnsClass,
        className
      )}
      data-testid={testId ?? 'list-skeleton'}
      aria-label={`Loading ${count} items...`}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div key={index} variants={itemVariants}>
          <CardSkeleton
            variant={variant}
            showActions={showActions}
            testId={`${testId ?? 'list-skeleton'}-item-${index}`}
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

// =============================================================================
// SPECIALIZED LIST SKELETONS
// =============================================================================

/**
 * DealsListSkeleton - Skeleton for deals list page
 */
export interface DealsListSkeletonProps {
  count?: number;
  layout?: 'list' | 'grid';
  className?: string;
}

export const DealsListSkeleton = memo(function DealsListSkeleton({
  count = 6,
  layout = 'grid',
  className,
}: DealsListSkeletonProps): React.ReactElement {
  return (
    <ListSkeleton
      count={count}
      layout={layout}
      columns={2}
      variant="default"
      showActions={true}
      className={className}
      testId="deals-list-skeleton"
    />
  );
});

/**
 * MetricsGridSkeleton - Grid of metric cards
 */
export interface MetricsGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const MetricsGridSkeleton = memo(function MetricsGridSkeleton({
  count = 4,
  columns = 4,
  className,
}: MetricsGridSkeletonProps): React.ReactElement {
  const columnsClass = COLUMNS_MAP[columns];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('grid', GAP_MAP.md, columnsClass, className)}
      data-testid="metrics-grid-skeleton"
      aria-label={`Loading ${count} metrics...`}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div key={index} variants={itemVariants}>
          <MetricCardSkeleton testId={`metric-skeleton-${index}`} />
        </motion.div>
      ))}
    </motion.div>
  );
});

/**
 * TableRowsSkeleton - Skeleton for table rows
 */
export interface TableRowsSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableRowsSkeleton = memo(function TableRowsSkeleton({
  rows = 5,
  columns = 5,
  className,
}: TableRowsSkeletonProps): React.ReactElement {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('divide-y divide-zinc-700/50', className)}
      data-testid="table-rows-skeleton"
      aria-label={`Loading ${rows} rows...`}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          variants={itemVariants}
          className="flex items-center gap-4 py-3 px-4"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={cn(
                'h-4 rounded bg-zinc-700/50',
                colIndex === 0 ? 'w-1/4' : 'flex-1'
              )}
              style={{
                animation: `pulse 1.5s ease-in-out infinite`,
                animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`,
              }}
            />
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
});

/**
 * CompsListSkeleton - Skeleton for comparables list
 */
export const CompsListSkeleton = memo(function CompsListSkeleton({
  count = 5,
  className,
}: { count?: number; className?: string }): React.ReactElement {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-3', className)}
      data-testid="comps-list-skeleton"
      aria-label={`Loading ${count} comparables...`}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          className="flex items-center gap-4 p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30"
        >
          {/* Image placeholder */}
          <div className="w-16 h-16 rounded-lg bg-zinc-700/50 shrink-0" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-zinc-700/50" />
            <div className="h-3 w-1/2 rounded bg-zinc-700/50" />
          </div>

          {/* Price */}
          <div className="text-right space-y-2">
            <div className="h-5 w-20 rounded bg-zinc-700/50" />
            <div className="h-3 w-16 rounded bg-zinc-700/50" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default ListSkeleton;
