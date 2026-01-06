/**
 * useSnapshotList Hook
 *
 * React hook for fetching and managing portfolio snapshot list.
 * Supports filtering, sorting, pagination, and aggregates.
 *
 * @module useSnapshotList
 * @version 1.0.0
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  DashboardSnapshotSummary,
  Verdict,
  UrgencyBand,
} from "@hps-internal/contracts";
import {
  listSnapshots,
  type ListSnapshotsParams,
  type SnapshotApiError,
} from "@/lib/snapshot-api";

// ============================================================================
// TYPES
// ============================================================================

export type SnapshotListStatus = "idle" | "loading" | "success" | "error" | "refreshing";

export interface SnapshotListFilters {
  verdict?: Verdict;
  urgencyBand?: UrgencyBand;
}

export interface SnapshotListSort {
  by: "urgency_score" | "closeability_index" | "risk_adjusted_spread" | "as_of";
  order: "asc" | "desc";
}

export interface SnapshotListPagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface SnapshotListAggregates {
  byVerdict: Record<Verdict, number>;
  byUrgencyBand: Record<UrgencyBand, number>;
  criticalSignalsTotal: number;
}

export interface UseSnapshotListState {
  /** List of snapshot summaries */
  snapshots: DashboardSnapshotSummary[];

  /** Current async status */
  status: SnapshotListStatus;

  /** Error details if status is "error" */
  error: SnapshotApiError | null;

  /** Current filters */
  filters: SnapshotListFilters;

  /** Current sort */
  sort: SnapshotListSort;

  /** Pagination info */
  pagination: SnapshotListPagination;

  /** Aggregates across all snapshots (unfiltered) */
  aggregates: SnapshotListAggregates | null;

  /** Convenience flags */
  isLoading: boolean;
  isEmpty: boolean;
}

export interface UseSnapshotListActions {
  /** Fetch snapshots with current filters/sort/pagination */
  fetch: () => Promise<void>;

  /** Set filters and refetch */
  setFilters: (filters: SnapshotListFilters) => void;

  /** Set sort and refetch */
  setSort: (sort: SnapshotListSort) => void;

  /** Go to next page */
  nextPage: () => void;

  /** Go to previous page */
  prevPage: () => void;

  /** Go to specific page (0-indexed) */
  goToPage: (page: number) => void;

  /** Reset all state */
  reset: () => void;
}

export interface UseSnapshotListReturn extends UseSnapshotListState, UseSnapshotListActions {
  /** Current page number (0-indexed) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const DEFAULT_LIMIT = 20;

const initialState: UseSnapshotListState = {
  snapshots: [],
  status: "idle",
  error: null,
  filters: {},
  sort: { by: "urgency_score", order: "desc" },
  pagination: {
    limit: DEFAULT_LIMIT,
    offset: 0,
    total: 0,
    hasMore: false,
  },
  aggregates: null,
  isLoading: false,
  isEmpty: true,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSnapshotList(
  initialFilters?: SnapshotListFilters,
  initialSort?: SnapshotListSort
): UseSnapshotListReturn {
  const [state, setState] = useState<UseSnapshotListState>({
    ...initialState,
    filters: initialFilters ?? {},
    sort: initialSort ?? initialState.sort,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchInternal = useCallback(async (
    filters: SnapshotListFilters,
    sort: SnapshotListSort,
    offset: number,
    limit: number,
    isRefresh: boolean
  ) => {
    setState(prev => ({
      ...prev,
      status: isRefresh ? "refreshing" : "loading",
      isLoading: true,
      error: null,
    }));

    const result = await listSnapshots({
      verdict: filters.verdict,
      urgencyBand: filters.urgencyBand,
      sortBy: sort.by,
      sortOrder: sort.order,
      limit,
      offset,
    });

    if (!mountedRef.current) return;

    if (result.error) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: result.error,
        isLoading: false,
      }));
      return;
    }

    const data = result.data!;
    setState(prev => ({
      ...prev,
      snapshots: data.snapshots,
      status: "success",
      error: null,
      pagination: {
        limit,
        offset,
        total: data.total,
        hasMore: data.has_more,
      },
      aggregates: {
        byVerdict: data.aggregates.by_verdict as Record<Verdict, number>,
        byUrgencyBand: data.aggregates.by_urgency_band as Record<UrgencyBand, number>,
        criticalSignalsTotal: data.aggregates.critical_signals_total,
      },
      isLoading: false,
      isEmpty: data.snapshots.length === 0,
    }));
  }, []);

  const fetch = useCallback(async () => {
    const isRefresh = state.status === "success";
    await fetchInternal(
      state.filters,
      state.sort,
      state.pagination.offset,
      state.pagination.limit,
      isRefresh
    );
  }, [state.filters, state.sort, state.pagination.offset, state.pagination.limit, state.status, fetchInternal]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER & SORT
  // ═══════════════════════════════════════════════════════════════════════════

  const setFilters = useCallback((filters: SnapshotListFilters) => {
    setState(prev => ({
      ...prev,
      filters,
      pagination: { ...prev.pagination, offset: 0 },
    }));
  }, []);

  const setSort = useCallback((sort: SnapshotListSort) => {
    setState(prev => ({
      ...prev,
      sort,
      pagination: { ...prev.pagination, offset: 0 },
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════════════════════

  const nextPage = useCallback(() => {
    if (!state.pagination.hasMore) return;
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        offset: prev.pagination.offset + prev.pagination.limit,
      },
    }));
  }, [state.pagination.hasMore]);

  const prevPage = useCallback(() => {
    if (state.pagination.offset === 0) return;
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        offset: Math.max(0, prev.pagination.offset - prev.pagination.limit),
      },
    }));
  }, [state.pagination.offset]);

  const goToPage = useCallback((page: number) => {
    const maxPage = Math.ceil(state.pagination.total / state.pagination.limit) - 1;
    const clampedPage = Math.max(0, Math.min(page, maxPage));
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        offset: clampedPage * prev.pagination.limit,
      },
    }));
  }, [state.pagination.total, state.pagination.limit]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED
  // ═══════════════════════════════════════════════════════════════════════════

  const currentPage = Math.floor(state.pagination.offset / state.pagination.limit);
  const totalPages = Math.max(1, Math.ceil(state.pagination.total / state.pagination.limit));

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-FETCH ON FILTER/SORT/PAGINATION CHANGE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (state.status !== "idle") {
      fetchInternal(
        state.filters,
        state.sort,
        state.pagination.offset,
        state.pagination.limit,
        true
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters, state.sort, state.pagination.offset]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    ...state,
    fetch,
    setFilters,
    setSort,
    nextPage,
    prevPage,
    goToPage,
    reset,
    currentPage,
    totalPages,
  };
}
