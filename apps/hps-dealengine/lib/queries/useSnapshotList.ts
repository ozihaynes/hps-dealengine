/**
 * useSnapshotList - React Query hook for paginated snapshot list
 *
 * Fetches and caches a list of deal snapshots with filtering and sorting.
 * Supports server-side pagination with cursor-based navigation.
 *
 * @module lib/queries/useSnapshotList
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys, type SnapshotFilters } from "./queryKeys";
import { DEFAULT_QUERY_OPTIONS } from "./queryConfig";
import {
  listSnapshots,
  type SnapshotApiError,
} from "@/lib/snapshot-api";
import type {
  DashboardSnapshotSummary,
  Verdict,
  UrgencyBand,
} from "@hps-internal/contracts";

// ============================================================================
// TYPES
// ============================================================================

export interface SnapshotListData {
  snapshots: DashboardSnapshotSummary[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface UseSnapshotListOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Filter by verdict */
  verdict?: Verdict;
  /** Filter by urgency band */
  urgencyBand?: UrgencyBand;
  /** Number of items per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: "urgency_score" | "closeability_index" | "risk_adjusted_spread" | "as_of";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Custom stale time in milliseconds */
  staleTime?: number;
}

export interface UseSnapshotListReturn {
  /** List of snapshot summaries */
  snapshots: DashboardSnapshotSummary[];
  /** Total count of matching snapshots */
  total: number;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Current offset */
  offset: number;
  /** Current limit */
  limit: number;
  /** Initial loading state */
  isLoading: boolean;
  /** Any fetching activity */
  isFetching: boolean;
  /** Is fetching next page while showing current data */
  isPlaceholderData: boolean;
  /** Error state */
  isError: boolean;
  /** Error details */
  error: SnapshotApiError | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const DEFAULT_SORT_BY = "urgency_score" as const;
const DEFAULT_SORT_ORDER = "desc" as const;

// ============================================================================
// FETCH FUNCTION
// ============================================================================

/**
 * Fetch snapshot list from API
 */
async function fetchSnapshotList(
  filters: SnapshotFilters
): Promise<SnapshotListData> {
  const result = await listSnapshots({
    verdict: filters.verdict,
    urgencyBand: filters.urgencyBand,
    limit: filters.limit ?? DEFAULT_LIMIT,
    offset: filters.offset ?? DEFAULT_OFFSET,
    sortBy: filters.sortBy ?? DEFAULT_SORT_BY,
    sortOrder: filters.sortOrder ?? DEFAULT_SORT_ORDER,
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    const error: SnapshotApiError = {
      code: "NO_DATA",
      message: "Failed to fetch snapshot list",
      status: 500,
    };
    throw error;
  }

  const snapshots = result.data.snapshots ?? [];
  const total = result.data.total ?? 0;
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? DEFAULT_OFFSET;

  return {
    snapshots,
    total,
    hasMore: offset + snapshots.length < total,
    offset,
    limit,
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useSnapshotList - React Query hook for snapshot list
 *
 * @example
 * function OverviewPage() {
 *   const {
 *     snapshots,
 *     total,
 *     isLoading,
 *     hasMore,
 *   } = useSnapshotList({
 *     verdict: "PURSUE",
 *     sortBy: "urgency_score",
 *     sortOrder: "desc",
 *     limit: 10,
 *   });
 *
 *   if (isLoading) return <ListSkeleton count={10} />;
 *
 *   return (
 *     <SnapshotGrid
 *       snapshots={snapshots}
 *       total={total}
 *       hasMore={hasMore}
 *     />
 *   );
 * }
 */
export function useSnapshotList(
  options: UseSnapshotListOptions = {}
): UseSnapshotListReturn {
  const {
    enabled = true,
    verdict,
    urgencyBand,
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    sortBy = DEFAULT_SORT_BY,
    sortOrder = DEFAULT_SORT_ORDER,
    staleTime,
  } = options;

  // Build filters object
  const filters: SnapshotFilters = {
    verdict,
    urgencyBand,
    limit,
    offset,
    sortBy,
    sortOrder,
  };

  const query = useQuery<SnapshotListData, SnapshotApiError>({
    queryKey: queryKeys.snapshots.list(filters),
    queryFn: () => fetchSnapshotList(filters),
    enabled,
    placeholderData: keepPreviousData, // Keep previous data while fetching new page
    ...DEFAULT_QUERY_OPTIONS.snapshotList,
    ...(staleTime !== undefined && { staleTime }),
  });

  // Refetch wrapper
  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    snapshots: query.data?.snapshots ?? [],
    total: query.data?.total ?? 0,
    hasMore: query.data?.hasMore ?? false,
    offset: query.data?.offset ?? offset,
    limit: query.data?.limit ?? limit,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    error: query.error ?? null,
    refetch,
  };
}

// ============================================================================
// PREFETCH HELPER
// ============================================================================

/**
 * Prefetch snapshot list (for route preloading)
 */
export async function prefetchSnapshotList(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: SnapshotFilters = {}
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.snapshots.list(filters),
    queryFn: () => fetchSnapshotList(filters),
    ...DEFAULT_QUERY_OPTIONS.snapshotList,
  });
}

// ============================================================================
// INVALIDATION HELPER
// ============================================================================

/**
 * Invalidate all snapshot list caches
 */
export function invalidateSnapshotLists(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.snapshots.lists(),
  });
}

export default useSnapshotList;
