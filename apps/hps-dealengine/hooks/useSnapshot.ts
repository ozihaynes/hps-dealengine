/**
 * useSnapshot Hook
 *
 * React hook for fetching and managing a single deal's dashboard snapshot.
 * Provides comprehensive async state management with type safety.
 *
 * @module useSnapshot
 * @version 1.0.0
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  DashboardSnapshot,
  Verdict,
  UrgencyBand,
  ActiveSignal,
} from "@hps-internal/contracts";
import {
  getSnapshot,
  generateSnapshot,
  type GetSnapshotParams,
  type GenerateSnapshotParams,
  type SnapshotApiError,
} from "@/lib/snapshot-api";

// ============================================================================
// TYPES
// ============================================================================

export type SnapshotStatus = "idle" | "loading" | "success" | "error" | "refreshing" | "generating";

export interface UseSnapshotState {
  /** The snapshot data (null if not loaded or error) */
  snapshot: DashboardSnapshot | null;

  /** Current async status */
  status: SnapshotStatus;

  /** Error details if status is "error" */
  error: SnapshotApiError | null;

  /** Whether the snapshot is stale (newer run exists) */
  isStale: boolean;

  /** The run ID of the current snapshot */
  snapshotRunId: string | null;

  /** The latest run ID for the deal */
  latestRunId: string | null;

  /** Timestamp when snapshot was generated */
  asOf: string | null;

  /** Convenience: is currently loading (initial or refresh) */
  isLoading: boolean;

  /** Convenience: is generating new snapshot */
  isGenerating: boolean;

  /** Convenience: has successfully loaded data */
  hasData: boolean;
}

export interface UseSnapshotActions {
  /** Fetch the latest snapshot (or refresh if already loaded) */
  fetch: (options?: { includeTrace?: boolean }) => Promise<void>;

  /** Generate a new snapshot (triggers analysis) */
  generate: (options?: { forceRegenerate?: boolean }) => Promise<void>;

  /** Reset state to idle */
  reset: () => void;
}

export interface UseSnapshotReturn extends UseSnapshotState, UseSnapshotActions {
  // Derived data (computed for UI convenience)

  /** Verdict with null safety */
  verdict: Verdict | null;

  /** Urgency band with null safety */
  urgencyBand: UrgencyBand | null;

  /** All active signals */
  signals: ActiveSignal[];

  /** Critical signals only */
  criticalSignals: ActiveSignal[];

  /** Warning signals only */
  warningSignals: ActiveSignal[];

  /** Info signals only */
  infoSignals: ActiveSignal[];

  /** Total signal count */
  signalCount: number;

  /** Critical signal count */
  criticalCount: number;

  /** L2 scores as a convenient object */
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
// INITIAL STATE
// ============================================================================

const initialState: UseSnapshotState = {
  snapshot: null,
  status: "idle",
  error: null,
  isStale: false,
  snapshotRunId: null,
  latestRunId: null,
  asOf: null,
  isLoading: false,
  isGenerating: false,
  hasData: false,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSnapshot(dealId: string | null): UseSnapshotReturn {
  const [state, setState] = useState<UseSnapshotState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Reset when dealId changes
  useEffect(() => {
    setState(initialState);
  }, [dealId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const fetch = useCallback(async (options?: { includeTrace?: boolean }) => {
    if (!dealId) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: { code: "INVALID_DEAL_ID", message: "Deal ID is required", status: 400 },
      }));
      return;
    }

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const isRefresh = state.status === "success";
    setState(prev => ({
      ...prev,
      status: isRefresh ? "refreshing" : "loading",
      isLoading: true,
      error: null,
    }));

    const result = await getSnapshot({
      dealId,
      includeTrace: options?.includeTrace ?? false,
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
    setState({
      snapshot: data.snapshot,
      status: "success",
      error: null,
      isStale: data.is_stale,
      snapshotRunId: data.snapshot_run_id,
      latestRunId: data.latest_run_id,
      asOf: data.as_of,
      isLoading: false,
      isGenerating: false,
      hasData: data.snapshot !== null,
    });
  }, [dealId, state.status]);

  const generate = useCallback(async (options?: { forceRegenerate?: boolean }) => {
    if (!dealId) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: { code: "INVALID_DEAL_ID", message: "Deal ID is required", status: 400 },
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      status: "generating",
      isGenerating: true,
      error: null,
    }));

    const result = await generateSnapshot({
      dealId,
      forceRegenerate: options?.forceRegenerate ?? false,
    });

    if (!mountedRef.current) return;

    if (result.error) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: result.error,
        isGenerating: false,
      }));
      return;
    }

    const data = result.data!;
    setState({
      snapshot: data.snapshot,
      status: "success",
      error: null,
      isStale: false,
      snapshotRunId: data.run_id,
      latestRunId: data.run_id,
      asOf: data.generated_at,
      isLoading: false,
      isGenerating: false,
      hasData: true,
    });
  }, [dealId]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════════════════

  const snapshot = state.snapshot;

  const verdict = snapshot?.verdict ?? null;
  const urgencyBand = snapshot?.urgency_band ?? null;

  const signals = snapshot?.active_signals ?? [];
  const criticalSignals = signals.filter(s => s.severity === "critical");
  const warningSignals = signals.filter(s => s.severity === "warning");
  const infoSignals = signals.filter(s => s.severity === "info");
  const signalCount = signals.length;
  const criticalCount = snapshot?.signals_critical_count ?? 0;

  const scores = snapshot ? {
    closeability: snapshot.closeability_index,
    urgency: snapshot.urgency_score,
    riskAdjustedSpread: snapshot.risk_adjusted_spread,
    buyerDemand: snapshot.buyer_demand_index,
    gateHealth: snapshot.gate_health_score,
    payoffBuffer: snapshot.payoff_buffer_pct,
  } : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    ...state,

    // Actions
    fetch,
    generate,
    reset,

    // Derived
    verdict,
    urgencyBand,
    signals,
    criticalSignals,
    warningSignals,
    infoSignals,
    signalCount,
    criticalCount,
    scores,
  };
}
