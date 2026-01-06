/**
 * DashboardSkeleton — Full dashboard loading skeleton
 *
 * Comprehensive loading skeleton that matches the dashboard layout.
 * Includes hero section, metrics grid, and content sections.
 *
 * Features:
 * - Matches full dashboard structure
 * - Staggered section animations
 * - Multiple layout variants
 * - Responsive design
 *
 * @module components/loading/DashboardSkeleton
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import {
  ShimmerEffect,
  ShimmerText,
  ShimmerHeading,
  ShimmerBadge,
  ShimmerButton,
} from './ShimmerEffect';

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardSkeletonProps {
  /** Layout variant */
  variant?: 'full' | 'compact' | 'minimal';
  /** Show hero section */
  showHero?: boolean;
  /** Show metrics grid */
  showMetrics?: boolean;
  /** Show content sections */
  showContent?: boolean;
  /** Number of metric cards */
  metricCount?: number;
  /** Number of content cards */
  contentCount?: number;
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
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1] as const,
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
// SUB-COMPONENTS
// =============================================================================

/**
 * HeroSkeleton - Verdict hero section skeleton
 */
const HeroSkeleton = memo(function HeroSkeleton(): React.ReactElement {
  return (
    <motion.div
      variants={sectionVariants}
      className={cn(
        'rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
        'p-6'
      )}
      data-testid="hero-skeleton"
    >
      {/* Property address */}
      <motion.div variants={itemVariants} className="mb-4">
        <ShimmerText width={180} height={14} />
      </motion.div>

      {/* Main verdict row */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          {/* Verdict icon */}
          <ShimmerEffect width={56} height={56} rounded="lg" />

          {/* Verdict text */}
          <div className="space-y-2">
            <ShimmerHeading width={160} height={32} />
            <ShimmerText width={200} height={14} />
          </div>
        </div>

        {/* Confidence badge */}
        <ShimmerBadge width={80} />
      </div>

      {/* Confidence bar */}
      <motion.div variants={itemVariants} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <ShimmerText width={100} height={12} />
          <ShimmerText width={40} height={12} />
        </div>
        <ShimmerEffect width="100%" height={8} rounded="full" />
      </motion.div>

      {/* Verdict reason */}
      <motion.div variants={itemVariants} className="space-y-2">
        <ShimmerText width="100%" height={14} />
        <ShimmerText width="75%" height={14} />
      </motion.div>
    </motion.div>
  );
});

/**
 * MetricsRowSkeleton - Status/metrics strip skeleton
 */
const MetricsRowSkeleton = memo(function MetricsRowSkeleton({
  count = 2,
}: {
  count?: number;
}): React.ReactElement {
  return (
    <motion.div
      variants={sectionVariants}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      data-testid="metrics-row-skeleton"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-4"
        >
          <div className="flex items-center justify-between">
            <ShimmerText width={100} height={14} />
            <ShimmerBadge width={70} />
          </div>
        </div>
      ))}
    </motion.div>
  );
});

/**
 * MetricsGridSkeleton - Key metrics grid skeleton
 */
const MetricsGridSkeleton = memo(function MetricsGridSkeleton({
  count = 4,
}: {
  count?: number;
}): React.ReactElement {
  return (
    <motion.div
      variants={sectionVariants}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      data-testid="metrics-grid-skeleton"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-4"
        >
          <ShimmerText width={80} height={12} className="mb-2" />
          <ShimmerHeading width={100} height={28} className="mb-1" />
          <ShimmerText width={60} height={12} />
        </div>
      ))}
    </motion.div>
  );
});

/**
 * ContentSectionSkeleton - Content section skeleton
 */
const ContentSectionSkeleton = memo(function ContentSectionSkeleton({
  count = 2,
}: {
  count?: number;
}): React.ReactElement {
  return (
    <motion.div
      variants={sectionVariants}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      data-testid="content-section-skeleton"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/10 bg-slate-800/50 backdrop-blur-xl p-5"
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <ShimmerText width={140} height={18} />
            <ShimmerButton width={80} height={32} />
          </div>

          {/* Section content - list items */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50"
              >
                <ShimmerEffect width={32} height={32} rounded="md" />
                <div className="flex-1 space-y-1.5">
                  <ShimmerText width="80%" height={14} />
                  <ShimmerText width="50%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * DashboardSkeleton - Full dashboard loading state
 *
 * @example
 * ```tsx
 * // Full dashboard skeleton
 * <DashboardSkeleton />
 *
 * // Compact version (no content sections)
 * <DashboardSkeleton variant="compact" showContent={false} />
 *
 * // Minimal (hero only)
 * <DashboardSkeleton variant="minimal" />
 * ```
 */
export const DashboardSkeleton = memo(function DashboardSkeleton({
  variant = 'full',
  showHero = true,
  showMetrics = true,
  showContent = true,
  metricCount = 4,
  contentCount = 2,
  className,
  testId,
}: DashboardSkeletonProps): React.ReactElement {
  // Minimal variant - just hero
  if (variant === 'minimal') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn('space-y-4', className)}
        data-testid={testId ?? 'dashboard-skeleton-minimal'}
        aria-label="Loading dashboard..."
        aria-busy="true"
        role="status"
      >
        <HeroSkeleton />
      </motion.div>
    );
  }

  // Compact variant - hero + metrics
  if (variant === 'compact') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn('space-y-4', className)}
        data-testid={testId ?? 'dashboard-skeleton-compact'}
        aria-label="Loading dashboard..."
        aria-busy="true"
        role="status"
      >
        {showHero && <HeroSkeleton />}
        {showMetrics && (
          <>
            <MetricsRowSkeleton count={2} />
            <MetricsGridSkeleton count={metricCount} />
          </>
        )}
      </motion.div>
    );
  }

  // Full variant - all sections
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-4', className)}
      data-testid={testId ?? 'dashboard-skeleton'}
      aria-label="Loading dashboard..."
      aria-busy="true"
      role="status"
    >
      {showHero && <HeroSkeleton />}
      {showMetrics && (
        <>
          <MetricsRowSkeleton count={2} />
          <MetricsGridSkeleton count={metricCount} />
        </>
      )}
      {showContent && <ContentSectionSkeleton count={contentCount} />}
    </motion.div>
  );
});

// =============================================================================
// SPECIALIZED DASHBOARD SKELETONS
// =============================================================================

/**
 * OverviewSkeleton - Overview page skeleton
 */
export const OverviewSkeleton = memo(function OverviewSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <DashboardSkeleton
      variant="full"
      showHero={true}
      showMetrics={true}
      showContent={true}
      className={className}
      testId="overview-skeleton"
    />
  );
});

/**
 * AnalysisSkeleton - Analysis section skeleton
 */
export const AnalysisSkeleton = memo(function AnalysisSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <DashboardSkeleton
      variant="compact"
      showHero={true}
      showMetrics={true}
      showContent={false}
      className={className}
      testId="analysis-skeleton"
    />
  );
});

/**
 * PageSkeleton - Generic page loading skeleton
 */
export interface PageSkeletonProps {
  /** Show page header */
  showHeader?: boolean;
  /** Show sidebar */
  showSidebar?: boolean;
  /** Main content variant */
  contentVariant?: 'cards' | 'list' | 'table';
  className?: string;
}

export const PageSkeleton = memo(function PageSkeleton({
  showHeader = true,
  showSidebar = false,
  contentVariant = 'cards',
  className,
}: PageSkeletonProps): React.ReactElement {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
      data-testid="page-skeleton"
      aria-label="Loading page..."
      aria-busy="true"
      role="status"
    >
      {/* Page header */}
      {showHeader && (
        <motion.div variants={sectionVariants} className="space-y-2">
          <ShimmerHeading width={200} height={28} />
          <ShimmerText width={300} height={14} />
        </motion.div>
      )}

      {/* Main content area */}
      <div className={cn(showSidebar && 'flex gap-6')}>
        {/* Sidebar */}
        {showSidebar && (
          <motion.div
            variants={sectionVariants}
            className="w-64 shrink-0 space-y-4"
          >
            <div className="rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-4 space-y-3">
              <ShimmerText width="80%" height={14} />
              <ShimmerText width="60%" height={14} />
              <ShimmerText width="70%" height={14} />
              <ShimmerText width="50%" height={14} />
            </div>
          </motion.div>
        )}

        {/* Main content */}
        <motion.div variants={sectionVariants} className="flex-1">
          {contentVariant === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-4 space-y-3"
                >
                  <ShimmerText width="70%" height={16} />
                  <ShimmerText width="100%" height={12} />
                  <ShimmerText width="50%" height={12} />
                </div>
              ))}
            </div>
          )}

          {contentVariant === 'list' && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl"
                >
                  <ShimmerEffect width={48} height={48} rounded="lg" />
                  <div className="flex-1 space-y-2">
                    <ShimmerText width="60%" height={16} />
                    <ShimmerText width="40%" height={12} />
                  </div>
                  <ShimmerButton width={80} height={36} />
                </div>
              ))}
            </div>
          )}

          {contentVariant === 'table' && (
            <div className="rounded-xl border border-white/10 bg-slate-800/60 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-slate-800">
                {Array.from({ length: 5 }).map((_, index) => (
                  <ShimmerText
                    key={index}
                    width={index === 0 ? 150 : 100}
                    height={14}
                  />
                ))}
              </div>
              {/* Rows */}
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center gap-4 p-4 border-b border-white/5 last:border-b-0"
                >
                  {Array.from({ length: 5 }).map((_, colIndex) => (
                    <ShimmerText
                      key={colIndex}
                      width={colIndex === 0 ? 150 : 100}
                      height={14}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default DashboardSkeleton;
