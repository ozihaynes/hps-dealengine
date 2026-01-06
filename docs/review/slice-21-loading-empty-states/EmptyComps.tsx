/**
 * EmptyComps — Empty state for when no comparables are available
 *
 * Shows helpful messaging when comps haven't been fetched or
 * no matching properties were found.
 *
 * @module components/empty/EmptyComps
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

export interface EmptyCompsProps {
  /** Reason for no comps */
  reason?: 'not_fetched' | 'no_matches' | 'error' | 'filtered_out';
  /** Action to fetch comps */
  onFetchComps?: () => void;
  /** Action to adjust filters */
  onAdjustFilters?: () => void;
  /** Display variant */
  variant?: 'default' | 'compact' | 'minimal' | 'card';
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTENT_BY_REASON = {
  not_fetched: {
    title: 'No Comparables Yet',
    description: 'Fetch comparable sales to see properties similar to your subject.',
    illustration: '🏘️',
    actionLabel: 'Fetch Comps',
  },
  no_matches: {
    title: 'No Matching Properties',
    description: 'No comparable sales found within the search criteria. Try expanding your search radius or adjusting filters.',
    illustration: '🔍',
    actionLabel: 'Adjust Filters',
  },
  filtered_out: {
    title: 'All Comps Filtered',
    description: 'Your current filters exclude all available comps. Try adjusting or resetting filters to see results.',
    illustration: '🎚️',
    actionLabel: 'Reset Filters',
  },
  error: {
    title: 'Unable to Load Comps',
    description: 'There was an issue fetching comparable sales. Please try again.',
    illustration: '⚠️',
    actionLabel: 'Retry',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyComps - Shows when no comparable sales are available
 *
 * @example
 * ```tsx
 * // Not yet fetched
 * <EmptyComps reason="not_fetched" onFetchComps={fetchComps} />
 *
 * // No matches found
 * <EmptyComps reason="no_matches" onAdjustFilters={openFilters} />
 *
 * // Error state
 * <EmptyComps reason="error" onFetchComps={retryFetch} />
 * ```
 */
export const EmptyComps = memo(function EmptyComps({
  reason = 'not_fetched',
  onFetchComps,
  onAdjustFilters,
  variant = 'default',
  className,
  testId,
}: EmptyCompsProps): React.ReactElement {
  const content = CONTENT_BY_REASON[reason];

  // Determine action based on reason
  let action: EmptyStateAction | undefined;
  if (reason === 'not_fetched' || reason === 'error') {
    action = onFetchComps
      ? { label: content.actionLabel, onClick: onFetchComps, variant: 'primary' }
      : undefined;
  } else if (reason === 'no_matches' || reason === 'filtered_out') {
    action = onAdjustFilters
      ? { label: content.actionLabel, onClick: onAdjustFilters, variant: 'secondary' }
      : undefined;
  }

  return (
    <EmptyState
      title={content.title}
      description={content.description}
      illustration={content.illustration}
      action={action}
      variant={variant}
      className={className}
      testId={testId ?? `empty-comps-${reason}`}
    />
  );
});

// =============================================================================
// SPECIALIZED COMP EMPTY STATES
// =============================================================================

/**
 * EmptyCompsList - Inline empty state for comps list
 */
export interface EmptyCompsListProps {
  reason?: 'not_fetched' | 'no_matches';
  onAction?: () => void;
  className?: string;
}

export const EmptyCompsList = memo(function EmptyCompsList({
  reason = 'not_fetched',
  onAction,
  className,
}: EmptyCompsListProps): React.ReactElement {
  const isNotFetched = reason === 'not_fetched';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center',
        'py-12 px-6 text-center',
        'rounded-lg border border-dashed border-zinc-700',
        'bg-zinc-800/20',
        className
      )}
      data-testid="empty-comps-list"
      role="status"
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        {isNotFetched ? '🏘️' : '🔍'}
      </div>
      <h4 className="text-base font-medium text-zinc-300 mb-1">
        {isNotFetched ? 'No Comps Loaded' : 'No Matches Found'}
      </h4>
      <p className="text-sm text-zinc-500 max-w-xs mb-4">
        {isNotFetched
          ? 'Fetch comparable sales to see similar properties.'
          : 'Try adjusting your search criteria.'}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'h-10 px-4',
            'rounded-lg text-sm font-medium',
            isNotFetched
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
            'transition-colors duration-150'
          )}
        >
          {isNotFetched ? 'Fetch Comps' : 'Adjust Filters'}
        </button>
      )}
    </motion.div>
  );
});

/**
 * EmptyCompsCard - Empty state styled as a comp card placeholder
 */
export const EmptyCompsCard = memo(function EmptyCompsCard({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-zinc-700',
        'bg-zinc-800/20',
        'p-6 text-center',
        className
      )}
      data-testid="empty-comps-card"
      role="status"
    >
      <div className="text-2xl mb-2" aria-hidden="true">
        🏠
      </div>
      <p className="text-xs text-zinc-500">No comp selected</p>
    </div>
  );
});

/**
 * EmptyCompsMap - Empty state for comps map view
 */
export const EmptyCompsMap = memo(function EmptyCompsMap({
  className,
  onFetchComps,
}: {
  className?: string;
  onFetchComps?: () => void;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'rounded-xl border border-zinc-700/50 bg-zinc-800/30',
        'py-16 px-8 text-center',
        className
      )}
      data-testid="empty-comps-map"
      role="status"
    >
      <div className="text-5xl mb-4" aria-hidden="true">
        🗺️
      </div>
      <h3 className="text-lg font-medium text-zinc-300 mb-2">
        No Properties to Display
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">
        Fetch comparable sales to see them plotted on the map with the subject property.
      </p>
      {onFetchComps && (
        <button
          type="button"
          onClick={onFetchComps}
          className={cn(
            'h-11 px-6',
            'rounded-lg text-sm font-medium',
            'bg-emerald-600 hover:bg-emerald-500 text-white',
            'transition-colors duration-150'
          )}
        >
          Fetch Comparable Sales
        </button>
      )}
    </div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default EmptyComps;
