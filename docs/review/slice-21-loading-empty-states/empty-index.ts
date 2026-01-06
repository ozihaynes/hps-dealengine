/**
 * Empty State Components — Slice 21
 *
 * Polished empty states with helpful messaging and clear CTAs.
 * All components support multiple variants and accessibility.
 *
 * @module components/empty
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

// =============================================================================
// BASE EMPTY STATE
// =============================================================================

export {
  EmptyState,
  type EmptyStateProps,
  type EmptyStateAction,
} from './EmptyState';

// =============================================================================
// ANALYSIS EMPTY STATES
// =============================================================================

export {
  EmptyAnalysis,
  EmptyDashboard,
  EmptyVerdictPanel,
  EmptyMetricsPanel,
  type EmptyAnalysisProps,
  type EmptyDashboardProps,
} from './EmptyAnalysis';

// =============================================================================
// COMPS EMPTY STATES
// =============================================================================

export {
  EmptyComps,
  EmptyCompsList,
  EmptyCompsCard,
  EmptyCompsMap,
  type EmptyCompsProps,
  type EmptyCompsListProps,
} from './EmptyComps';

// =============================================================================
// ERROR STATES
// =============================================================================

export {
  ErrorState,
  NetworkError,
  NotFoundError,
  PermissionError,
  type ErrorStateProps,
} from './ErrorState';

// =============================================================================
// RE-EXPORT EXISTING EMPTY STATES
// =============================================================================

// Re-export EmptyDeals from deals folder for convenience
export { EmptyDeals, type EmptyDealsProps } from '@/components/deals/EmptyDeals';
