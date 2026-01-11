"use client";

// ============================================================================
// USE ESTIMATE REQUESTS HOOK
// ============================================================================
// Purpose: Manage estimate requests for a deal with refresh capability
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import type {
  EstimateRequest,
  EstimateRequestStatus,
} from "@hps-internal/contracts";
import {
  listEstimateRequests,
  cancelEstimateRequest,
  markExpiredRequests,
  getEstimateFileUrl,
} from "@/lib/estimateRequests";

// ============================================================================
// TYPES
// ============================================================================

interface UseEstimateRequestsState {
  requests: EstimateRequest[];
  isLoading: boolean;
  error: string | null;
}

interface UseEstimateRequestsActions {
  refresh: () => Promise<void>;
  cancel: (requestId: string) => Promise<void>;
  getFileUrl: (filePath: string) => Promise<string>;
}

interface UseEstimateRequestsOptions {
  /** Filter by status */
  statusFilter?: EstimateRequestStatus | null;
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEstimateRequests(
  dealId: string | null,
  options?: UseEstimateRequestsOptions
): [UseEstimateRequestsState, UseEstimateRequestsActions] {
  const { statusFilter = null, refreshInterval = 0 } = options ?? {};

  const [requests, setRequests] = useState<EstimateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // FETCH REQUESTS
  // ==========================================================================

  const fetchRequests = useCallback(async () => {
    if (!dealId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, mark any expired requests
      await markExpiredRequests(dealId).catch(() => {
        // Ignore errors from marking expired - not critical
      });

      // Fetch all requests
      const result = await listEstimateRequests(dealId);

      // Apply status filter if specified
      const filteredResult = statusFilter
        ? result.filter((r) => r.status === statusFilter)
        : result;

      setRequests(filteredResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load estimate requests"
      );
    } finally {
      setIsLoading(false);
    }
  }, [dealId, statusFilter]);

  // ==========================================================================
  // INITIAL LOAD + AUTO-REFRESH
  // ==========================================================================

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchRequests();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchRequests, refreshInterval]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const refresh = useCallback(async () => {
    await fetchRequests();
  }, [fetchRequests]);

  const cancel = useCallback(
    async (requestId: string) => {
      try {
        await cancelEstimateRequest(requestId);
        // Optimistic update
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: "cancelled" as EstimateRequestStatus }
              : r
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel request"
        );
        // Re-fetch to get accurate state
        await fetchRequests();
        throw err;
      }
    },
    [fetchRequests]
  );

  const getFileUrl = useCallback(async (filePath: string): Promise<string> => {
    try {
      return await getEstimateFileUrl(filePath);
    } catch (err) {
      console.error("[useEstimateRequests] Failed to get file URL:", err);
      throw err;
    }
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return [
    { requests, isLoading, error },
    { refresh, cancel, getFileUrl },
  ];
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Get counts of estimate requests by status
 */
export function useEstimateRequestCounts(dealId: string | null): {
  pending: number;
  sent: number;
  viewed: number;
  submitted: number;
  expired: number;
  cancelled: number;
  total: number;
  active: number;
} {
  const [{ requests }] = useEstimateRequests(dealId);

  const counts = {
    pending: 0,
    sent: 0,
    viewed: 0,
    submitted: 0,
    expired: 0,
    cancelled: 0,
    total: requests.length,
    active: 0,
  };

  for (const req of requests) {
    if (req.status in counts) {
      counts[req.status as keyof typeof counts]++;
    }
  }

  counts.active = counts.pending + counts.sent + counts.viewed;

  return counts;
}
