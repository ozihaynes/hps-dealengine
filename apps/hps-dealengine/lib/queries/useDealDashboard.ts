/**
 * useDealDashboard - React Query hook for dashboard snapshot data
 *
 * Fetches and caches the dashboard snapshot for a deal using React Query.
 * Provides automatic caching, background refetching, and optimistic updates.
 *
 * @module lib/queries/useDealDashboard
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { DEFAULT_QUERY_OPTIONS } from "./queryConfig";
import {
  getSnapshot,
  type SnapshotApiError,
} from "@/lib/snapshot-api";
import type {
  DashboardSnapshot,
  Verdict,
  UrgencyBand,
  ActiveSignal,
} from "@hps-internal/contracts";

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardData {
  snapshot: DashboardSnapshot;
  isStale: boolean;
  snapshotRunId: string | null;
  latestRunId: string | null;
  asOf: string | null;
}

export interface UseDealDashboardOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Custom stale time in milliseconds */
  staleTime?: number;
  /** Refetch interval (polling) in milliseconds */
  refetchInterval?: number | false;
  /** Include trace data in response */
  includeTrace?: boolean;
}

export interface UseDealDashboardReturn {
  /** Dashboard snapshot data */
  data: DashboardData | undefined;
  /** The snapshot itself (convenience accessor) */
  snapshot: DashboardSnapshot | null;
  /** Initial loading state (no cached data) */
  isLoading: boolean;
  /** Any fetching activity (including background) */
  isFetching: boolean;
  /** Error state */
  isError: boolean;
  /** Error details */
  error: SnapshotApiError | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
  /** Data freshness timestamp */
  dataUpdatedAt: number;
  /** Is data considered stale */
  isStale: boolean;

  // Derived convenience accessors
  /** Current verdict */
  verdict: Verdict | null;
  /** Current urgency band */
  urgencyBand: UrgencyBand | null;
  /** All active signals */
  signals: ActiveSignal[];
  /** Critical signals count */
  criticalCount: number;
  /** L2 scores object */
  scores: {
    closeability: number;
    urgency: number;
    riskAdjustedSpread: number;
    buyerDemand: number;
    gateHealth: number;
    payoffBuffer: number | null;
  } | null;
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

/**
 * Fetch dashboard snapshot from API
 */
async function fetchDashboardSnapshot(
  dealId: string,
  includeTrace: boolean
): Promise<DashboardData> {
  const result = await getSnapshot({
    dealId,
    includeTrace,
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data || !result.data.snapshot) {
    const error: SnapshotApiError = {
      code: "NO_SNAPSHOT",
      message: "No snapshot available for this deal",
      status: 404,
    };
    throw error;
  }

  return {
    snapshot: result.data.snapshot,
    isStale: result.data.is_stale,
    snapshotRunId: result.data.snapshot_run_id,
    latestRunId: result.data.latest_run_id,
    asOf: result.data.as_of,
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useDealDashboard - React Query hook for dashboard data
 *
 * @example
 * function DashboardPage({ dealId }: { dealId: string }) {
 *   const {
 *     snapshot,
 *     isLoading,
 *     isError,
 *     error,
 *     refetch,
 *     verdict,
 *     scores,
 *   } = useDealDashboard(dealId);
 *
 *   if (isLoading) return <DashboardSkeleton />;
 *   if (isError) return <ErrorState error={error} onRetry={refetch} />;
 *   if (!snapshot) return <EmptyAnalysis />;
 *
 *   return <Dashboard snapshot={snapshot} verdict={verdict} scores={scores} />;
 * }
 */
export function useDealDashboard(
  dealId: string | null | undefined,
  options: UseDealDashboardOptions = {}
): UseDealDashboardReturn {
  const {
    enabled = true,
    staleTime,
    refetchInterval,
    includeTrace = false,
  } = options;

  const queryClient = useQueryClient();

  const query = useQuery<DashboardData, SnapshotApiError>({
    queryKey: queryKeys.snapshots.latest(dealId ?? ""),
    queryFn: () => fetchDashboardSnapshot(dealId!, includeTrace),
    enabled: enabled && !!dealId,
    ...DEFAULT_QUERY_OPTIONS.snapshotLatest,
    ...(staleTime !== undefined && { staleTime }),
    ...(refetchInterval !== undefined && { refetchInterval }),
  });

  // Refetch wrapper that returns void
  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  // Extract snapshot for derived values
  const snapshot = query.data?.snapshot ?? null;

  // Derived values
  const verdict = snapshot?.verdict ?? null;
  const urgencyBand = snapshot?.urgency_band ?? null;
  const signals = snapshot?.active_signals ?? [];
  const criticalCount = snapshot?.signals_critical_count ?? 0;

  const scores = snapshot
    ? {
        closeability: snapshot.closeability_index,
        urgency: snapshot.urgency_score,
        riskAdjustedSpread: snapshot.risk_adjusted_spread,
        buyerDemand: snapshot.buyer_demand_index,
        gateHealth: snapshot.gate_health_score,
        payoffBuffer: snapshot.payoff_buffer_pct,
      }
    : null;

  return {
    data: query.data,
    snapshot,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ?? null,
    refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    isStale: query.isStale,
    verdict,
    urgencyBand,
    signals,
    criticalCount,
    scores,
  };
}

// ============================================================================
// PREFETCH HELPER
// ============================================================================

/**
 * Prefetch dashboard data (for route preloading)
 */
export async function prefetchDealDashboard(
  queryClient: ReturnType<typeof useQueryClient>,
  dealId: string,
  includeTrace = false
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.snapshots.latest(dealId),
    queryFn: () => fetchDashboardSnapshot(dealId, includeTrace),
    ...DEFAULT_QUERY_OPTIONS.snapshotLatest,
  });
}

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate dashboard cache for a deal
 */
export function invalidateDealDashboard(
  queryClient: ReturnType<typeof useQueryClient>,
  dealId: string
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.snapshots.byDeal(dealId),
  });
}

/**
 * Invalidate all dashboard caches
 */
export function invalidateAllDashboards(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.snapshots.all,
  });
}

export default useDealDashboard;
