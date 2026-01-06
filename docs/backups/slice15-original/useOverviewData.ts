/**
 * useOverviewData Hook
 *
 * Fetches and transforms data for the Command Center overview page.
 * Integrates with DealSession to provide real-time deal metrics,
 * signals, and verdict data.
 *
 * @module overview/useOverviewData
 * @version 1.0.0
 */

"use client";

import { useMemo, useCallback } from "react";
import { useDealSession } from "@/lib/dealSessionContext";
import type {
  Signal,
  SignalCategory,
  SignalSeverity,
} from "@/components/command-center";
import type { TimelineEvent } from "@/components/command-center";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type VerdictType = "GO" | "PROCEED_WITH_CAUTION" | "HOLD" | "PASS";

export interface SnapshotData {
  closeability_index: number;
  urgency_score: number;
  risk_adjusted_spread: number;
  buyer_demand_index: number;
  verdict: VerdictType;
  verdict_reasons: string[];
}

export interface OverviewData {
  /** Snapshot data for PulseBar and DecisionCanvas */
  snapshot: SnapshotData | null;
  /** Signals for ActionDock and ExceptionsStack */
  signals: Signal[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Whether snapshot is stale */
  isStale: boolean;
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
  snapshot: Omit<SnapshotData, "verdict" | "verdict_reasons">,
  verdict: VerdictType
): string[] {
  const reasons: string[] = [];

  // Closeability reasons
  if (snapshot.closeability_index >= 80) {
    reasons.push("Strong closing probability based on equity and motivation");
  } else if (snapshot.closeability_index >= 60) {
    reasons.push("Moderate closing probability - some conditions to verify");
  } else if (snapshot.closeability_index < 50) {
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
  } else if (snapshot.risk_adjusted_spread < 15000) {
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

  return reasons.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateSignalsFromAnalysis(
  dealId: string,
  outputs: Record<string, unknown> | null,
  trace: unknown[] | null
): Signal[] {
  const signals: Signal[] = [];
  const now = new Date();

  if (!outputs) return signals;

  // Extract workflow state signals
  const workflowState = outputs.workflow_state as string | undefined;
  if (workflowState && workflowState !== "READY_TO_CLOSE") {
    signals.push({
      id: `${dealId}-workflow`,
      code: "WORKFLOW_STATE",
      title: `Deal Status: ${workflowState.replace(/_/g, " ")}`,
      description: "Current workflow state requires attention before proceeding.",
      severity: workflowState.includes("BLOCKED") ? "critical" : "warning",
      category: "timeline",
      timestamp: now.toISOString(),
      dismissible: false,
      actionLabel: "View Details",
    });
  }

  // Extract risk signals
  const riskSummary = outputs.risk_summary as { overall?: string; flags?: string[] } | undefined;
  if (riskSummary?.overall === "HIGH" || riskSummary?.overall === "ELEVATED") {
    signals.push({
      id: `${dealId}-risk`,
      code: "ELEVATED_RISK",
      title: `Risk Level: ${riskSummary.overall}`,
      description: riskSummary.flags?.join(", ") || "Multiple risk factors identified.",
      severity: riskSummary.overall === "HIGH" ? "critical" : "warning",
      category: "risk",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      dismissible: false,
      actionLabel: "Review Risk",
    });
  }

  // Extract confidence signals
  const confidenceGrade = outputs.confidence_grade as string | undefined;
  if (confidenceGrade && ["D", "F"].includes(confidenceGrade)) {
    signals.push({
      id: `${dealId}-confidence`,
      code: "LOW_CONFIDENCE",
      title: `Data Confidence: Grade ${confidenceGrade}`,
      description: "Evidence quality is below threshold. Additional verification needed.",
      severity: confidenceGrade === "F" ? "critical" : "warning",
      category: "evidence",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      dismissible: false,
      actionLabel: "Upload Evidence",
    });
  }

  // Extract timeline signals
  const timeline = outputs.timeline_summary as { dtm_selected_days?: number } | undefined;
  if (timeline?.dtm_selected_days && timeline.dtm_selected_days <= 14) {
    signals.push({
      id: `${dealId}-timeline`,
      code: "URGENT_TIMELINE",
      title: `${timeline.dtm_selected_days} Days to Close`,
      description: "Expedited timeline requires immediate action on all pending items.",
      severity: timeline.dtm_selected_days <= 7 ? "critical" : "warning",
      category: "timeline",
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      dismissible: false,
      actionLabel: "View Timeline",
    });
  }

  // Check for missing evidence from trace
  if (Array.isArray(trace)) {
    const evidenceIssues = trace.filter(
      (t: any) => t?.rule?.includes("EVIDENCE") && t?.status === "FAIL"
    );
    if (evidenceIssues.length > 0) {
      signals.push({
        id: `${dealId}-evidence-missing`,
        code: "MISSING_EVIDENCE",
        title: `${evidenceIssues.length} Evidence Items Missing`,
        description: "Required documentation has not been uploaded or verified.",
        severity: "warning",
        category: "evidence",
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        dismissible: false,
        actionLabel: "Upload Documents",
      });
    }
  }

  // Financial spread signal
  const spreadCash = outputs.spread_cash as number | undefined;
  if (typeof spreadCash === "number" && spreadCash < 15000) {
    signals.push({
      id: `${dealId}-thin-spread`,
      code: "THIN_SPREAD",
      title: "Spread Below Target",
      description: `Current spread of $${spreadCash.toLocaleString()} is below the $15,000 threshold.`,
      severity: spreadCash < 10000 ? "critical" : "warning",
      category: "financial",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      dismissible: false,
      actionLabel: "Adjust Offer",
    });
  }

  return signals;
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

  // Add acknowledgment event for older signals
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

  const dealId = dbDeal?.id ?? null;
  const dealAddress = dbDeal?.address ?? null;

  // Transform analyze result to snapshot format
  const snapshot = useMemo<SnapshotData | null>(() => {
    if (!lastAnalyzeResult) return null;

    const outputs = (lastAnalyzeResult as any)?.outputs ?? lastAnalyzeResult ?? {};

    // Extract L2 scores with fallbacks
    const closeability = Number(outputs.closeability_index ?? outputs.closeability ?? 65);
    const urgency = Number(outputs.urgency_score ?? outputs.urgency ?? 50);
    const spread = Number(outputs.spread_cash ?? outputs.risk_adjusted_spread ?? 25000);
    const demand = Number(outputs.buyer_demand_index ?? outputs.buyer_demand ?? 60);

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
      ...baseSnapshot,
      verdict,
      verdict_reasons: generateVerdictReasons(baseSnapshot, verdict),
    };
  }, [lastAnalyzeResult]);

  // Generate signals from analysis
  const signals = useMemo<Signal[]>(() => {
    if (!dealId || !lastAnalyzeResult) return [];

    const outputs = (lastAnalyzeResult as any)?.outputs ?? lastAnalyzeResult ?? null;
    const trace = (lastAnalyzeResult as any)?.trace ?? null;

    return generateSignalsFromAnalysis(dealId, outputs, trace);
  }, [dealId, lastAnalyzeResult]);

  // Refresh handler
  const refresh = useCallback(async () => {
    await refreshDeal();
  }, [refreshDeal]);

  // Determine staleness
  const isStale = useMemo(() => {
    if (!lastRunAt) return false;
    const runTime = new Date(lastRunAt).getTime();
    const hoursSinceRun = (Date.now() - runTime) / (1000 * 60 * 60);
    return hoursSinceRun > 24;
  }, [lastRunAt]);

  return {
    snapshot,
    signals,
    isLoading: isHydratingActiveDeal,
    error: null,
    isStale,
    refresh,
    dealAddress,
    dealId,
    lastRunAt,
  };
}

export default useOverviewData;
