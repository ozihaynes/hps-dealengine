/**
 * React Query Hooks - Data Layer Integration
 *
 * Centralized exports for all React Query hooks and utilities.
 * Provides type-safe data fetching, caching, and mutations.
 *
 * @module lib/queries
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

// ============================================================================
// QUERY KEYS
// ============================================================================

export {
  queryKeys,
  type DealFilters,
  type SnapshotFilters,
  type DealStatus,
  type DealsListQueryKey,
  type DealDetailQueryKey,
  type SnapshotQueryKey,
  type PipelineSummaryQueryKey,
} from "./queryKeys";

// ============================================================================
// QUERY CONFIG
// ============================================================================

export {
  TIME,
  STALE_TIMES,
  GC_TIMES,
  RETRY_CONFIG,
  DEFAULT_QUERY_OPTIONS,
  shouldRetry,
  getQueryOptions,
} from "./queryConfig";

// ============================================================================
// DASHBOARD / SNAPSHOT HOOKS
// ============================================================================

export {
  useDealDashboard,
  prefetchDealDashboard,
  invalidateDealDashboard,
  invalidateAllDashboards,
  type DashboardData,
  type UseDealDashboardOptions,
  type UseDealDashboardReturn,
} from "./useDealDashboard";

export {
  useSnapshotList,
  prefetchSnapshotList,
  invalidateSnapshotLists,
  type SnapshotListData,
  type UseSnapshotListOptions,
  type UseSnapshotListReturn,
} from "./useSnapshotList";

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export {
  useGenerateSnapshot,
  useRunAnalysis,
  type GenerateSnapshotInput,
  type GenerateSnapshotResult,
  type UseGenerateSnapshotOptions,
  type UseGenerateSnapshotReturn,
} from "./useGenerateSnapshot";

// ============================================================================
// PIPELINE HOOKS
// ============================================================================

export {
  usePipelineSummary,
  prefetchPipelineSummary,
  invalidatePipelineSummary,
  type PipelineSummary,
  type UsePipelineSummaryOptions,
  type UsePipelineSummaryReturn,
} from "./usePipelineSummary";
