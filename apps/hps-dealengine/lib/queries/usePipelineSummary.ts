/**
 * usePipelineSummary - React Query hook for pipeline aggregate counts
 *
 * Fetches and caches aggregate statistics for the deal pipeline including
 * counts by verdict and urgency band.
 *
 * @module lib/queries/usePipelineSummary
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { DEFAULT_QUERY_OPTIONS } from "./queryConfig";
import {
  listSnapshots,
  type SnapshotApiError,
} from "@/lib/snapshot-api";
import type { Verdict, UrgencyBand } from "@hps-internal/contracts";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineSummary {
  /** Total deals with snapshots */
  total: number;
  /** Counts by verdict */
  byVerdict: Record<Verdict, number>;
  /** Counts by urgency band */
  byUrgencyBand: Record<UrgencyBand, number>;
  /** Deals requiring urgent attention (emergency/critical urgency) */
  urgentCount: number;
  /** Deals recommended to GO */
  goCount: number;
  /** Deals recommended to PASS */
  passCount: number;
  /** Deals to proceed with caution */
  cautionCount: number;
  /** Deals on HOLD */
  holdCount: number;
}

export interface UsePipelineSummaryOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Custom stale time in milliseconds */
  staleTime?: number;
  /** Refetch interval in milliseconds */
  refetchInterval?: number | false;
}

export interface UsePipelineSummaryReturn {
  /** Pipeline summary data */
  summary: PipelineSummary | undefined;
  /** Initial loading state */
  isLoading: boolean;
  /** Any fetching activity */
  isFetching: boolean;
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

const DEFAULT_SUMMARY: PipelineSummary = {
  total: 0,
  byVerdict: {
    GO: 0,
    PROCEED_WITH_CAUTION: 0,
    HOLD: 0,
    PASS: 0,
  },
  byUrgencyBand: {
    emergency: 0,
    critical: 0,
    active: 0,
    steady: 0,
  },
  urgentCount: 0,
  goCount: 0,
  passCount: 0,
  cautionCount: 0,
  holdCount: 0,
};

// ============================================================================
// FETCH FUNCTION
// ============================================================================

/**
 * Fetch pipeline summary by aggregating snapshot data
 *
 * This fetches all snapshots and aggregates counts locally.
 * For larger portfolios, this should be replaced with a server-side
 * aggregation endpoint.
 */
async function fetchPipelineSummary(): Promise<PipelineSummary> {
  // Fetch all snapshots (using a high limit for aggregation)
  const result = await listSnapshots({
    limit: 1000,
    offset: 0,
    sortBy: "as_of",
    sortOrder: "desc",
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    return DEFAULT_SUMMARY;
  }

  const snapshots = result.data.snapshots ?? [];
  const total = result.data.total ?? 0;

  // Initialize counts
  const byVerdict: Record<Verdict, number> = {
    GO: 0,
    PROCEED_WITH_CAUTION: 0,
    HOLD: 0,
    PASS: 0,
  };

  const byUrgencyBand: Record<UrgencyBand, number> = {
    emergency: 0,
    critical: 0,
    active: 0,
    steady: 0,
  };

  // Aggregate counts
  for (const snapshot of snapshots) {
    if (snapshot.verdict && snapshot.verdict in byVerdict) {
      byVerdict[snapshot.verdict]++;
    }
    if (snapshot.urgency_band && snapshot.urgency_band in byUrgencyBand) {
      byUrgencyBand[snapshot.urgency_band]++;
    }
  }

  return {
    total,
    byVerdict,
    byUrgencyBand,
    urgentCount: byUrgencyBand.emergency + byUrgencyBand.critical,
    goCount: byVerdict.GO,
    passCount: byVerdict.PASS,
    cautionCount: byVerdict.PROCEED_WITH_CAUTION,
    holdCount: byVerdict.HOLD,
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * usePipelineSummary - React Query hook for pipeline statistics
 *
 * @example
 * function PipelineOverview() {
 *   const {
 *     summary,
 *     isLoading,
 *     isError,
 *   } = usePipelineSummary();
 *
 *   if (isLoading) return <SummarySkeleton />;
 *   if (!summary) return null;
 *
 *   return (
 *     <div>
 *       <Stat label="Total Deals" value={summary.total} />
 *       <Stat label="GO" value={summary.goCount} />
 *       <Stat label="Urgent" value={summary.urgentCount} />
 *     </div>
 *   );
 * }
 */
export function usePipelineSummary(
  options: UsePipelineSummaryOptions = {}
): UsePipelineSummaryReturn {
  const {
    enabled = true,
    staleTime,
    refetchInterval,
  } = options;

  const query = useQuery<PipelineSummary, SnapshotApiError>({
    queryKey: queryKeys.pipeline.summary(),
    queryFn: fetchPipelineSummary,
    enabled,
    ...DEFAULT_QUERY_OPTIONS.pipelineSummary,
    ...(staleTime !== undefined && { staleTime }),
    ...(refetchInterval !== undefined && { refetchInterval }),
  });

  // Refetch wrapper
  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    summary: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ?? null,
    refetch,
  };
}

// ============================================================================
// PREFETCH HELPER
// ============================================================================

/**
 * Prefetch pipeline summary (for route preloading)
 */
export async function prefetchPipelineSummary(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.pipeline.summary(),
    queryFn: fetchPipelineSummary,
    ...DEFAULT_QUERY_OPTIONS.pipelineSummary,
  });
}

// ============================================================================
// INVALIDATION HELPER
// ============================================================================

/**
 * Invalidate pipeline summary cache
 */
export function invalidatePipelineSummary(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.pipeline.all,
  });
}

export default usePipelineSummary;
