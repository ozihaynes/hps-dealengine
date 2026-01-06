/**
 * useOverviewData Hook
 *
 * Fetches and transforms data for the Command Center overview page.
 * Integrates with DealSession to provide real-time deal metrics,
 * signals, and verdict data.
 *
 * KEY BEHAVIORS:
 * - Always returns valid snapshot data (never null)
 * - `hasRealData` flag indicates if data is from actual analysis
 * - Staleness has multiple levels (fresh → aging → stale → expired)
 * - Signal timestamps are meaningful (based on lastRunAt or now)
 * - Returns `DashboardSnapshot` type for component compatibility
 *
 * @module overview/useOverviewData
 * @version 2.1.0 (Phase 15.2.1 - Type Alignment)
 */

"use client";

import { useMemo, useCallback, useState } from "react";
import { useDealSession } from "@/lib/dealSessionContext";
import type {
  Signal,
  SignalCategory,
  SignalSeverity,
  TimelineEvent,
} from "@/components/command-center";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Verdict types supported by Command Center */
export type VerdictType = "GO" | "PROCEED_WITH_CAUTION" | "HOLD" | "PASS";

/**
 * DashboardSnapshot - the canonical type for PulseBar and DecisionCanvas.
 * 
 * If @/components/command-center exports DashboardSnapshot, you can replace
 * this with: import type { DashboardSnapshot } from "@/components/command-center";
 * 
 * This local definition ensures type compatibility with the component props.
 */
export interface DashboardSnapshot {
  closeability_index: number;
  urgency_score: number;
  risk_adjusted_spread: number;
  buyer_demand_index: number;
  verdict: VerdictType;
  verdict_reasons: string[];
}

export type StalenessLevel = "fresh" | "aging" | "stale" | "expired";

export interface StalenessInfo {
  /** Whether data is considered stale (>24h) */
  isStale: boolean;
  /** Granular staleness level */
  level: StalenessLevel;
  /** Hours since last run (null if never run) */
  hoursAgo: number | null;
  /** Human-readable label */
  label: string;
}

export interface OverviewData {
  /** Snapshot data for PulseBar and DecisionCanvas - ALWAYS populated */
  snapshot: DashboardSnapshot;
  /** Signals for ActionDock and ExceptionsStack */
  signals: Signal[];
  /** Loading state */
  isLoading: boolean;
  /** Refreshing state (distinct from initial load) */
  isRefreshing: boolean;
  /** Error state */
  error: string | null;
  /** Staleness information */
  staleness: StalenessInfo;
  /** Whether we have real analysis data (vs placeholder) */
  hasRealData: boolean;
  /** Refresh function */
  refresh: () => Promise<void>;
  /** Deal address for display */
  dealAddress: string | null;
  /** Deal ID */
  dealId: string | null;
  /** Last run timestamp */
  lastRunAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default snapshot shown when no analysis has been run.
 * All zeros with HOLD verdict - dashboard structure visible.
 */
const DEFAULT_SNAPSHOT: DashboardSnapshot = {
  closeability_index: 0,
  urgency_score: 0,
  risk_adjusted_spread: 0,
  buyer_demand_index: 0,
  verdict: "HOLD",
  verdict_reasons: [
    "Awaiting initial analysis",
    "Run underwriting to generate scores",
    "Evidence collection in progress",
  ],
};

const DEFAULT_STALENESS: StalenessInfo = {
  isStale: false,
  level: "fresh",
  hoursAgo: null,
  label: "No analysis yet",
};

// ═══════════════════════════════════════════════════════════════════════════
// STALENESS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateStaleness(lastRunAt: string | null): StalenessInfo {
  if (!lastRunAt) {
    return DEFAULT_STALENESS;
  }

  const runTime = new Date(lastRunAt).getTime();
  const now = Date.now();
  const hoursAgo = (now - runTime) / (1000 * 60 * 60);

  // Define thresholds
  if (hoursAgo < 4) {
    return {
      isStale: false,
      level: "fresh",
      hoursAgo,
      label: hoursAgo < 1 ? "Just now" : `${Math.round(hoursAgo)}h ago`,
    };
  }

  if (hoursAgo < 24) {
    return {
      isStale: false,
      level: "aging",
      hoursAgo,
      label: `${Math.round(hoursAgo)}h ago`,
    };
  }

  if (hoursAgo < 72) {
    const daysAgo = Math.round(hoursAgo / 24);
    return {
      isStale: true,
      level: "stale",
      hoursAgo,
      label: `${daysAgo}d ago`,
    };
  }

  const daysAgo = Math.round(hoursAgo / 24);
  return {
    isStale: true,
    level: "expired",
    hoursAgo,
    label: `${daysAgo}d ago`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

function deriveVerdict(
  closeability: number,
  urgency: number,
  spread: number
): VerdictType {
  // Critical urgency with low closeability = PASS
  if (urgency >= 90 && closeability < 60) {
    return "PASS";
  }

  // Strong metrics = GO
  if (closeability >= 80 && spread >= 30000) {
    return "GO";
  }

  // Moderate metrics with acceptable spread = PROCEED_WITH_CAUTION
  if (closeability >= 60 && spread >= 15000) {
    return "PROCEED_WITH_CAUTION";
  }

  // Low metrics = HOLD for further analysis
  if (closeability >= 40) {
    return "HOLD";
  }

  return "PASS";
}

function generateVerdictReasons(
  snapshot: Omit<DashboardSnapshot, "verdict" | "verdict_reasons">,
  verdict: VerdictType
): string[] {
  const reasons: string[] = [];

  // Closeability reasons
  if (snapshot.closeability_index >= 80) {
    reasons.push("Strong closing probability based on equity and motivation");
  } else if (snapshot.closeability_index >= 60) {
    reasons.push("Moderate closing probability - some conditions to verify");
  } else if (snapshot.closeability_index < 50 && snapshot.closeability_index > 0) {
    reasons.push("Low closing probability - significant obstacles present");
  }

  // Urgency reasons
  if (snapshot.urgency_score >= 80) {
    reasons.push("High urgency - timeline pressure requires fast action");
  } else if (snapshot.urgency_score >= 60) {
    reasons.push("Moderate urgency - standard timeline management");
  }

  // Spread reasons
  if (snapshot.risk_adjusted_spread >= 40000) {
    reasons.push("Excellent risk-adjusted spread above target threshold");
  } else if (snapshot.risk_adjusted_spread >= 25000) {
    reasons.push("Acceptable spread within policy guidelines");
  } else if (snapshot.risk_adjusted_spread > 0 && snapshot.risk_adjusted_spread < 15000) {
    reasons.push("Thin spread - margin compression risk");
  }

  // Buyer demand reasons
  if (snapshot.buyer_demand_index >= 75) {
    reasons.push("High buyer demand in target market");
  } else if (snapshot.buyer_demand_index >= 50) {
    reasons.push("Moderate buyer interest expected");
  }

  // Verdict-specific reasons
  if (verdict === "GO") {
    reasons.push("All critical gates passed - recommend proceeding");
  } else if (verdict === "HOLD") {
    reasons.push("Additional due diligence recommended before commitment");
  } else if (verdict === "PASS") {
    reasons.push("Risk/reward ratio does not meet investment criteria");
  }

  // If no reasons generated, add default
  if (reasons.length === 0) {
    reasons.push("Awaiting analysis data for full assessment");
  }

  return reasons.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS AND EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════

interface AnalyzeOutputs {
  closeability_index?: number;
  closeability?: number;
  urgency_score?: number;
  urgency?: number;
  spread_cash?: number;
  risk_adjusted_spread?: number;
  buyer_demand_index?: number;
  buyer_demand?: number;
  workflow_state?: string;
  risk_summary?: {
    overall?: string;
    flags?: string[];
  };
  confidence_grade?: string;
  timeline_summary?: {
    dtm_selected_days?: number;
  };
}

interface AnalyzeResult {
  outputs?: AnalyzeOutputs;
  trace?: unknown[];
}

function extractOutputs(result: unknown): AnalyzeOutputs | null {
  if (!result || typeof result !== "object") return null;

  const asResult = result as AnalyzeResult;
  if (asResult.outputs && typeof asResult.outputs === "object") {
    return asResult.outputs;
  }

  // Fallback: result itself might be the outputs
  return result as AnalyzeOutputs;
}

function extractTrace(result: unknown): unknown[] | null {
  if (!result || typeof result !== "object") return null;
  const asResult = result as AnalyzeResult;
  return Array.isArray(asResult.trace) ? asResult.trace : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateSignalsFromAnalysis(
  dealId: string,
  outputs: AnalyzeOutputs | null,
  trace: unknown[] | null,
  baseTimestamp: Date
): Signal[] {
  const signals: Signal[] = [];

  if (!outputs) return signals;

  // Extract workflow state signals
  const workflowState = outputs.workflow_state;
  if (workflowState && workflowState !== "READY_TO_CLOSE") {
    signals.push({
      id: `${dealId}-workflow`,
      code: "WORKFLOW_STATE",
      title: `Deal Status: ${workflowState.replace(/_/g, " ")}`,
      description: "Current workflow state requires attention before proceeding.",
      severity: workflowState.includes("BLOCKED") ? "critical" : "warning",
      category: "timeline",
      timestamp: baseTimestamp.toISOString(),
      dismissible: false,
      actionLabel: "View Details",
    });
  }

  // Extract risk signals
  const riskSummary = outputs.risk_summary;
  if (riskSummary?.overall === "HIGH" || riskSummary?.overall === "ELEVATED") {
    signals.push({
      id: `${dealId}-risk`,
      code: "ELEVATED_RISK",
      title: `Risk Level: ${riskSummary.overall}`,
      description: riskSummary.flags?.join(", ") || "Multiple risk factors identified.",
      severity: riskSummary.overall === "HIGH" ? "critical" : "warning",
      category: "risk",
      timestamp: baseTimestamp.toISOString(),
      dismissible: false,
      actionLabel: "Review Risk",
    });
  }

  // Extract confidence signals
  const confidenceGrade = outputs.confidence_grade;
  if (confidenceGrade && ["D", "F"].includes(confidenceGrade)) {
    signals.push({
      id: `${dealId}-confidence`,
      code: "LOW_CONFIDENCE",
      title: `Data Confidence: Grade ${confidenceGrade}`,
      description: "Evidence quality is below threshold. Additional verification needed.",
      severity: confidenceGrade === "F" ? "critical" : "warning",
      category: "evidence",
      timestamp: baseTimestamp.toISOString(),
      dismissible: false,
      actionLabel: "Upload Evidence",
    });
  }

  // Extract timeline signals
  const timeline = outputs.timeline_summary;
  if (timeline?.dtm_selected_days && timeline.dtm_selected_days <= 14) {
    signals.push({
      id: `${dealId}-timeline`,
      code: "URGENT_TIMELINE",
      title: `${timeline.dtm_selected_days} Days to Close`,
      description: "Expedited timeline requires immediate action on all pending items.",
      severity: timeline.dtm_selected_days <= 7 ? "critical" : "warning",
      category: "timeline",
      timestamp: baseTimestamp.toISOString(),
      dismissible: false,
      actionLabel: "View Timeline",
    });
  }

  // Check for missing evidence from trace
  if (trace) {
    const evidenceIssues = trace.filter((t) => {
      if (!t || typeof t !== "object") return false;
      const item = t as Record<string, unknown>;
      return (
        typeof item.rule === "string" &&
        item.rule.includes("EVIDENCE") &&
        item.status === "FAIL"
      );
    });

    if (evidenceIssues.length > 0) {
      signals.push({
        id: `${dealId}-evidence-missing`,
        code: "MISSING_EVIDENCE",
        title: `${evidenceIssues.length} Evidence Items Missing`,
        description: "Required documentation has not been uploaded or verified.",
        severity: "warning",
        category: "evidence",
        timestamp: baseTimestamp.toISOString(),
        dismissible: false,
        actionLabel: "Upload Documents",
      });
    }
  }

  // Financial spread signal
  const spreadCash = outputs.spread_cash;
  if (typeof spreadCash === "number" && spreadCash < 15000) {
    signals.push({
      id: `${dealId}-thin-spread`,
      code: "THIN_SPREAD",
      title: "Spread Below Target",
      description: `Current spread of $${spreadCash.toLocaleString()} is below the $15,000 threshold.`,
      severity: spreadCash < 10000 ? "critical" : "warning",
      category: "financial",
      timestamp: baseTimestamp.toISOString(),
      dismissible: false,
      actionLabel: "Adjust Offer",
    });
  }

  return signals;
}

/**
 * Generate placeholder signals when no analysis exists
 * Shows what KIND of signals would appear
 */
function generatePlaceholderSignals(dealId: string): Signal[] {
  return [
    {
      id: `${dealId}-placeholder-analysis`,
      code: "PENDING_ANALYSIS",
      title: "Analysis Required",
      description: "Run underwriting analysis to generate deal metrics and identify action items.",
      severity: "info" as SignalSeverity,
      category: "general" as SignalCategory,
      timestamp: new Date().toISOString(),
      dismissible: false,
      actionLabel: "Run Analysis",
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE EVENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

export function generateTimelineEvents(signal: Signal): TimelineEvent[] {
  const created = signal.timestamp ? new Date(signal.timestamp) : new Date();

  const events: TimelineEvent[] = [
    {
      id: `${signal.id}-created`,
      type: "created",
      description: `Signal detected: ${signal.code}`,
      timestamp: created.toISOString(),
      actor: "DealEngine",
    },
  ];

  // Add acknowledgment event for older signals (only if signal is >1h old)
  const hoursSinceCreated = (Date.now() - created.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreated > 1) {
    events.push({
      id: `${signal.id}-ack`,
      type: "acknowledged",
      description: "Signal reviewed by underwriting team",
      timestamp: new Date(created.getTime() + 30 * 60 * 1000).toISOString(),
      actor: "System",
    });
  }

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useOverviewData(): OverviewData {
  const {
    dbDeal,
    lastAnalyzeResult,
    lastRunAt,
    isHydratingActiveDeal,
    refreshDeal,
  } = useDealSession();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const dealId = dbDeal?.id ?? null;
  const dealAddress = dbDeal?.address ?? null;

  // Transform analyze result to snapshot format
  // ALWAYS returns a valid snapshot (default if no data)
  const { snapshot, hasRealData } = useMemo<{
    snapshot: DashboardSnapshot;
    hasRealData: boolean;
  }>(() => {
    const outputs = extractOutputs(lastAnalyzeResult);

    if (!outputs) {
      return { snapshot: DEFAULT_SNAPSHOT, hasRealData: false };
    }

    // Extract L2 scores with fallbacks
    const closeability = Number(outputs.closeability_index ?? outputs.closeability ?? 0);
    const urgency = Number(outputs.urgency_score ?? outputs.urgency ?? 0);
    const spread = Number(outputs.spread_cash ?? outputs.risk_adjusted_spread ?? 0);
    const demand = Number(outputs.buyer_demand_index ?? outputs.buyer_demand ?? 0);

    // If all values are 0/falsy, treat as no real data
    if (!closeability && !urgency && !spread && !demand) {
      return { snapshot: DEFAULT_SNAPSHOT, hasRealData: false };
    }

    // Clamp percentage values
    const closeabilityIndex = Math.min(100, Math.max(0, closeability));
    const urgencyScore = Math.min(100, Math.max(0, urgency));
    const buyerDemandIndex = Math.min(100, Math.max(0, demand));

    const verdict = deriveVerdict(closeabilityIndex, urgencyScore, spread);

    const baseSnapshot = {
      closeability_index: closeabilityIndex,
      urgency_score: urgencyScore,
      risk_adjusted_spread: spread,
      buyer_demand_index: buyerDemandIndex,
    };

    return {
      snapshot: {
        ...baseSnapshot,
        verdict,
        verdict_reasons: generateVerdictReasons(baseSnapshot, verdict),
      },
      hasRealData: true,
    };
  }, [lastAnalyzeResult]);

  // Generate signals from analysis (or placeholders if no data)
  const signals = useMemo<Signal[]>(() => {
    if (!dealId) return [];

    if (!lastAnalyzeResult) {
      return generatePlaceholderSignals(dealId);
    }

    const outputs = extractOutputs(lastAnalyzeResult);
    const trace = extractTrace(lastAnalyzeResult);

    // Use lastRunAt as base timestamp, or now if not available
    const baseTimestamp = lastRunAt ? new Date(lastRunAt) : new Date();

    const analysisSignals = generateSignalsFromAnalysis(dealId, outputs, trace, baseTimestamp);

    // If no signals from analysis, return placeholder
    if (analysisSignals.length === 0) {
      return generatePlaceholderSignals(dealId);
    }

    return analysisSignals;
  }, [dealId, lastAnalyzeResult, lastRunAt]);

  // Calculate staleness
  const staleness = useMemo<StalenessInfo>(
    () => calculateStaleness(lastRunAt),
    [lastRunAt]
  );

  // Refresh handler with loading state
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDeal();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDeal]);

  return {
    snapshot,
    signals,
    isLoading: isHydratingActiveDeal,
    isRefreshing,
    error: null,
    staleness,
    hasRealData,
    refresh,
    dealAddress,
    dealId,
    lastRunAt,
  };
}

// Legacy alias for backwards compatibility
export type CommandCenterSnapshot = DashboardSnapshot;
export type SnapshotData = DashboardSnapshot;

export default useOverviewData;
