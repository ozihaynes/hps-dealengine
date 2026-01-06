/**
 * Query Keys Factory - Centralized query key management
 *
 * Provides type-safe, hierarchical query keys for React Query.
 * Enables precise cache invalidation and query matching.
 *
 * @module lib/queries/queryKeys
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

import type { Verdict, UrgencyBand } from "@hps-internal/contracts";

// ============================================================================
// TYPES
// ============================================================================

export type DealStatus = "active" | "archived" | "pending" | "closed";

export interface DealFilters {
  status?: DealStatus[];
  verdict?: Verdict[];
  search?: string;
  sortBy?: "created_at" | "updated_at" | "address";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface SnapshotFilters {
  verdict?: Verdict;
  urgencyBand?: UrgencyBand;
  limit?: number;
  offset?: number;
  sortBy?: "urgency_score" | "closeability_index" | "risk_adjusted_spread" | "as_of";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// QUERY KEYS FACTORY
// ============================================================================

/**
 * Centralized query key factory
 *
 * Pattern: Hierarchical keys enable precise invalidation
 * - queryKeys.deals.all invalidates ALL deal queries
 * - queryKeys.deals.detail(id) invalidates only that deal
 *
 * @example
 * // In useQuery
 * useQuery({
 *   queryKey: queryKeys.deals.dashboard(dealId),
 *   queryFn: () => fetchDashboard(dealId),
 * });
 *
 * // Invalidate after mutation
 * queryClient.invalidateQueries({
 *   queryKey: queryKeys.deals.detail(dealId),
 * });
 */
export const queryKeys = {
  // ---------------------------------------------------------------------------
  // DEALS DOMAIN
  // ---------------------------------------------------------------------------
  deals: {
    /** Root key - invalidates all deal queries */
    all: ["deals"] as const,

    /** List queries root */
    lists: () => [...queryKeys.deals.all, "list"] as const,

    /** Specific list with filters */
    list: (filters: DealFilters) =>
      [...queryKeys.deals.lists(), filters] as const,

    /** Detail queries root */
    details: () => [...queryKeys.deals.all, "detail"] as const,

    /** Specific deal detail */
    detail: (id: string) => [...queryKeys.deals.details(), id] as const,

    /** Dashboard data for a deal (includes analysis) */
    dashboard: (id: string) =>
      [...queryKeys.deals.detail(id), "dashboard"] as const,
  },

  // ---------------------------------------------------------------------------
  // SNAPSHOTS DOMAIN
  // ---------------------------------------------------------------------------
  snapshots: {
    /** Root key - invalidates all snapshot queries */
    all: ["snapshots"] as const,

    /** List queries root */
    lists: () => [...queryKeys.snapshots.all, "list"] as const,

    /** Specific list with filters */
    list: (filters: SnapshotFilters) =>
      [...queryKeys.snapshots.lists(), filters] as const,

    /** Snapshot by deal ID */
    byDeal: (dealId: string) =>
      [...queryKeys.snapshots.all, "deal", dealId] as const,

    /** Latest snapshot for a deal */
    latest: (dealId: string) =>
      [...queryKeys.snapshots.byDeal(dealId), "latest"] as const,
  },

  // ---------------------------------------------------------------------------
  // ANALYSIS DOMAIN
  // ---------------------------------------------------------------------------
  analysis: {
    /** Root key - invalidates all analysis queries */
    all: ["analysis"] as const,

    /** All analysis for a specific deal */
    byDeal: (dealId: string) =>
      [...queryKeys.analysis.all, "deal", dealId] as const,

    /** Latest analysis result for a deal */
    latest: (dealId: string) =>
      [...queryKeys.analysis.byDeal(dealId), "latest"] as const,

    /** Analysis history for a deal */
    history: (dealId: string) =>
      [...queryKeys.analysis.byDeal(dealId), "history"] as const,

    /** Specific analysis run by ID */
    run: (runId: string) =>
      [...queryKeys.analysis.all, "run", runId] as const,
  },

  // ---------------------------------------------------------------------------
  // PIPELINE DOMAIN
  // ---------------------------------------------------------------------------
  pipeline: {
    /** Root key - invalidates all pipeline queries */
    all: ["pipeline"] as const,

    /** Pipeline summary (counts by status/verdict) */
    summary: () => [...queryKeys.pipeline.all, "summary"] as const,

    /** Deals by specific status */
    byStatus: (status: DealStatus) =>
      [...queryKeys.pipeline.all, "status", status] as const,

    /** Deals by specific verdict */
    byVerdict: (verdict: Verdict) =>
      [...queryKeys.pipeline.all, "verdict", verdict] as const,
  },

  // ---------------------------------------------------------------------------
  // COMPS DOMAIN
  // ---------------------------------------------------------------------------
  comps: {
    /** Root key */
    all: ["comps"] as const,

    /** Comps for a specific deal */
    byDeal: (dealId: string) =>
      [...queryKeys.comps.all, "deal", dealId] as const,

    /** Selected comps for a deal */
    selected: (dealId: string) =>
      [...queryKeys.comps.byDeal(dealId), "selected"] as const,
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Type for deals list query key */
export type DealsListQueryKey = ReturnType<typeof queryKeys.deals.list>;

/** Type for deal detail query key */
export type DealDetailQueryKey = ReturnType<typeof queryKeys.deals.detail>;

/** Type for snapshot query key */
export type SnapshotQueryKey = ReturnType<typeof queryKeys.snapshots.latest>;

/** Type for pipeline summary query key */
export type PipelineSummaryQueryKey = ReturnType<typeof queryKeys.pipeline.summary>;

export default queryKeys;
