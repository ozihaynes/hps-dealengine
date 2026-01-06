/**
 * EmptyAnalysis — Empty state for when no analysis has been run
 *
 * Shows a helpful message encouraging users to run their first analysis
 * with a list of what they'll see in the dashboard.
 *
 * @module components/empty/EmptyAnalysis
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import { EmptyState, type EmptyStateAction } from './EmptyState';

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyAnalysisProps {
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Action to run analysis */
  onRunAnalysis?: () => void;
  /** Link to analysis page */
  analysisHref?: string;
  /** Display variant */
  variant?: 'default' | 'compact' | 'minimal' | 'card';
  /** Show feature preview list */
  showFeatures?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ANALYSIS_FEATURES = [
  { icon: '🎯', label: 'Deal verdict with confidence score' },
  { icon: '📊', label: 'Price geometry and ZOPA analysis' },
  { icon: '⚠️', label: 'Risk gates and warning indicators' },
  { icon: '📈', label: 'Market velocity metrics' },
  { icon: '💰', label: 'Net clearance by exit strategy' },
  { icon: '🏠', label: 'Comparable sales evidence' },
];

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyAnalysis - Shows when no analysis has been run
 *
 * @example
 * ```tsx
 * // Basic usage with callback
 * <EmptyAnalysis onRunAnalysis={() => runAnalysis()} />
 *
 * // With link
 * <EmptyAnalysis analysisHref="/deals/123/analyze" />
 *
 * // Compact variant
 * <EmptyAnalysis variant="compact" />
 * ```
 */
export const EmptyAnalysis = memo(function EmptyAnalysis({
  title = 'No Analysis Yet',
  description = 'Run an analysis to see comprehensive deal metrics and recommendations.',
  onRunAnalysis,
  analysisHref,
  variant = 'default',
  showFeatures = true,
  className,
  testId,
}: EmptyAnalysisProps): React.ReactElement {
  // Build action prop
  const action: EmptyStateAction | undefined =
    onRunAnalysis || analysisHref
      ? {
          label: 'Run Analysis',
          onClick: onRunAnalysis,
          href: analysisHref,
          variant: 'primary',
        }
      : undefined;

  // Minimal/compact variants - no features list
  if (variant === 'minimal' || variant === 'compact') {
    return (
      <EmptyState
        title={title}
        description={description}
        illustration="📊"
        action={action}
        variant={variant}
        className={className}
        testId={testId ?? 'empty-analysis'}
      />
    );
  }

  // Default/card variants with features list
  return (
    <EmptyState
      title={title}
      description={description}
      illustration="📊"
      action={action}
      variant={variant}
      className={className}
      testId={testId ?? 'empty-analysis'}
    >
      {showFeatures && (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="bg-zinc-900/50 rounded-lg p-4 max-w-md mx-auto text-left"
        >
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
            What you'll see:
          </h4>
          <ul className="space-y-2">
            {ANALYSIS_FEATURES.map((feature, index) => (
              <motion.li
                key={index}
                variants={listItemVariants}
                className="flex items-center gap-2 text-sm text-zinc-400"
              >
                <span aria-hidden="true">{feature.icon}</span>
                {feature.label}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </EmptyState>
  );
});

// =============================================================================
// SPECIALIZED VARIANTS
// =============================================================================

/**
 * EmptyDashboard - Empty state for main dashboard
 */
export interface EmptyDashboardProps {
  dealId?: string;
  className?: string;
}

export const EmptyDashboard = memo(function EmptyDashboard({
  dealId,
  className,
}: EmptyDashboardProps): React.ReactElement {
  return (
    <EmptyAnalysis
      title="Dashboard Ready"
      description="Select a deal and run an analysis to populate the dashboard with key metrics."
      analysisHref={dealId ? `/deals/${dealId}/analyze` : undefined}
      variant="card"
      className={className}
      testId="empty-dashboard"
    />
  );
});

/**
 * EmptyVerdictPanel - Empty state for verdict section
 */
export const EmptyVerdictPanel = memo(function EmptyVerdictPanel({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-700/50 bg-zinc-800/30',
        'p-8 text-center',
        className
      )}
      data-testid="empty-verdict-panel"
      role="status"
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        🎯
      </div>
      <h3 className="text-lg font-medium text-zinc-300 mb-1">
        Verdict Pending
      </h3>
      <p className="text-sm text-zinc-500">
        Run an analysis to generate deal verdict
      </p>
    </div>
  );
});

/**
 * EmptyMetricsPanel - Empty state for metrics section
 */
export const EmptyMetricsPanel = memo(function EmptyMetricsPanel({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-700/50 bg-zinc-800/30',
        'p-6 text-center',
        className
      )}
      data-testid="empty-metrics-panel"
      role="status"
    >
      <div className="text-3xl mb-2" aria-hidden="true">
        📈
      </div>
      <p className="text-sm text-zinc-500">
        Metrics will appear after analysis
      </p>
    </div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default EmptyAnalysis;
