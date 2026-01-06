"use client";

import { useMemo } from "react";
import { useDealSession } from "@/lib/dealSessionContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerdictType = "PURSUE" | "NEEDS_EVIDENCE" | "PASS";

export interface FieldModeGate {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail" | "blocking";
  reason?: string;
}

export interface FieldModeExit {
  strategy: string;
  label: string;
  netClearance: number | null;
  isRecommended: boolean;
}

export interface FieldModePriceGeometry {
  zopa: number | null;
  zopaPercent: number | null;
  mao: number | null;
  floor: number | null;
  ceiling: number | null;
  hasZopa: boolean;
}

export interface FieldModeData {
  verdict: VerdictType;
  verdictReason: string;
  netClearance: number | null;
  bestExit: string | null;
  priceGeometry: FieldModePriceGeometry;
  topRisks: FieldModeGate[];
  gatesSummary: { passed: number; total: number; blocking: number };
  exits: FieldModeExit[];
  propertyAddress: string;
  dealId: string;
  runId: string | null;
}

export interface UseFieldModeDataResult {
  data: FieldModeData | null;
  isLoading: boolean;
  hasRun: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveVerdict(outputs: Record<string, unknown> | null): {
  verdict: VerdictType;
  reason: string;
} {
  if (!outputs) {
    return { verdict: "PASS", reason: "No analysis run" };
  }

  // Check for verdict from V2.5 engine outputs
  const engineVerdict = outputs.verdict as string | undefined;
  if (engineVerdict === "PURSUE") {
    return { verdict: "PURSUE", reason: "ZOPA exists, gates pass" };
  }
  if (engineVerdict === "NEEDS_EVIDENCE") {
    const missing = (outputs.evidence_missing_count as number) ?? 0;
    return {
      verdict: "NEEDS_EVIDENCE",
      reason: `Missing ${missing} evidence item${missing !== 1 ? "s" : ""}`,
    };
  }
  if (engineVerdict === "PASS") {
    return { verdict: "PASS", reason: "No ZOPA or gates fail" };
  }

  // Fallback: derive from workflow_state if no V2.5 verdict
  const workflowState = outputs.workflow_state as string | undefined;
  if (workflowState === "ready_for_offer" || workflowState === "ready") {
    return { verdict: "PURSUE", reason: "Ready to make an offer" };
  }
  if (workflowState === "needs_review" || workflowState === "needs_evidence") {
    return { verdict: "NEEDS_EVIDENCE", reason: "Additional review required" };
  }

  // Check ZOPA existence as final fallback
  const zopa = outputs.zopa_dollars as number | undefined;
  if (typeof zopa === "number" && zopa > 0) {
    return { verdict: "PURSUE", reason: "ZOPA exists" };
  }

  return { verdict: "PASS", reason: "No ZOPA detected" };
}

function extractPriceGeometry(
  outputs: Record<string, unknown> | null,
  arv: number | null
): FieldModePriceGeometry {
  if (!outputs) {
    return {
      zopa: null,
      zopaPercent: null,
      mao: null,
      floor: null,
      ceiling: null,
      hasZopa: false,
    };
  }

  const zopa = (outputs.zopa_dollars as number) ?? null;
  const floor = (outputs.respect_floor as number) ?? null;
  const ceiling = (outputs.buyer_ceiling as number) ?? null;

  // MAO from primary or wholesale
  const mao =
    (outputs.primary_offer as number) ??
    (outputs.mao_bundle as Record<string, number>)?.wholesale ??
    null;

  // Calculate ZOPA as % of ARV
  let zopaPercent: number | null = null;
  if (typeof zopa === "number" && typeof arv === "number" && arv > 0) {
    zopaPercent = (zopa / arv) * 100;
  }

  return {
    zopa,
    zopaPercent,
    mao,
    floor,
    ceiling,
    hasZopa: typeof zopa === "number" && zopa > 0,
  };
}

function extractTopRisks(
  outputs: Record<string, unknown> | null,
  maxVisible: number = 3
): { gates: FieldModeGate[]; summary: { passed: number; total: number; blocking: number } } {
  const emptyResult = {
    gates: [],
    summary: { passed: 0, total: 0, blocking: 0 },
  };

  if (!outputs) return emptyResult;

  // Try risk_gates from V2.5 outputs
  const riskGates = outputs.risk_gates as
    | Array<{ gate_id: string; label: string; status: string; reason?: string }>
    | undefined;

  if (!riskGates || !Array.isArray(riskGates)) {
    // Fallback to evidence_health or empty
    return emptyResult;
  }

  const gates: FieldModeGate[] = riskGates.map((g) => ({
    id: g.gate_id,
    label: g.label,
    status: g.status as FieldModeGate["status"],
    reason: g.reason,
  }));

  // Sort: blocking first, then fail, then warning
  const statusOrder = { blocking: 0, fail: 1, warning: 2, pass: 3 };
  gates.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const passed = gates.filter((g) => g.status === "pass").length;
  const blocking = gates.filter((g) => g.status === "blocking").length;

  return {
    gates: gates.filter((g) => g.status !== "pass").slice(0, maxVisible),
    summary: { passed, total: gates.length, blocking },
  };
}

function extractExits(outputs: Record<string, unknown> | null): FieldModeExit[] {
  if (!outputs) return [];

  // Try net_clearance from V2.5 outputs
  const netClearance = outputs.net_clearance as
    | Record<string, { net: number; recommended?: boolean }>
    | undefined;

  if (netClearance && typeof netClearance === "object") {
    return Object.entries(netClearance).map(([strategy, data]) => ({
      strategy,
      label: formatExitLabel(strategy),
      netClearance: data?.net ?? null,
      isRecommended: data?.recommended ?? false,
    }));
  }

  // Fallback: derive from MAO bundle + calculations
  const maoBundle = outputs.mao_bundle as Record<string, number> | undefined;
  const calculations = outputs.calculations as Record<string, number> | undefined;

  const exits: FieldModeExit[] = [];

  // Double close (wholesale)
  const wholesaleNet =
    calculations?.wholesaleNetProfit ?? calculations?.instantCashOffer ?? null;
  if (wholesaleNet !== null) {
    exits.push({
      strategy: "double_close",
      label: "Double Close",
      netClearance: wholesaleNet,
      isRecommended: true,
    });
  }

  // Assignment
  const assignmentNet = calculations?.assignmentFee ?? null;
  if (assignmentNet !== null) {
    exits.push({
      strategy: "assignment",
      label: "Assignment",
      netClearance: assignmentNet,
      isRecommended: false,
    });
  }

  // Flip
  const flipNet = calculations?.flipNetProfit ?? null;
  if (flipNet !== null) {
    exits.push({
      strategy: "flip",
      label: "Flip",
      netClearance: flipNet,
      isRecommended: false,
    });
  }

  return exits;
}

function formatExitLabel(strategy: string): string {
  const labels: Record<string, string> = {
    double_close: "Double Close",
    assignment: "Assignment",
    flip: "Flip",
    wholetail: "Wholetail",
    novation: "Novation",
    sub_to: "Sub-To",
  };
  return labels[strategy] ?? strategy.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFieldModeData(): UseFieldModeDataResult {
  const { dbDeal, lastAnalyzeResult, lastRunId, isLoadingRun } = useDealSession();

  return useMemo(() => {
    // Loading state
    if (isLoadingRun) {
      return { data: null, isLoading: true, hasRun: false, error: null };
    }

    // No deal
    if (!dbDeal) {
      return { data: null, isLoading: false, hasRun: false, error: "No deal selected" };
    }

    // No run
    if (!lastAnalyzeResult || !lastRunId) {
      return { data: null, isLoading: false, hasRun: false, error: null };
    }

    const outputs = lastAnalyzeResult.outputs as Record<string, unknown> | null;
    const calculations = (outputs?.calculations ?? {}) as Record<string, unknown>;
    const arv = (dbDeal.payload?.market?.arv as number) ?? null;

    // Derive all field mode data
    const { verdict, reason } = deriveVerdict(outputs);
    const priceGeometry = extractPriceGeometry(outputs, arv);
    const { gates: topRisks, summary: gatesSummary } = extractTopRisks(outputs);
    const exits = extractExits(outputs);

    // Best exit is the one with highest net clearance
    const bestExit =
      exits.length > 0
        ? exits.reduce((best, current) =>
            (current.netClearance ?? 0) > (best.netClearance ?? 0) ? current : best
          )
        : null;

    const netClearance = bestExit?.netClearance ?? null;

    // Property address
    const property = dbDeal.payload?.property as Record<string, unknown> | undefined;
    const address =
      (property?.address as string) ??
      (property?.street as string) ??
      "Unknown Address";

    const data: FieldModeData = {
      verdict,
      verdictReason: reason,
      netClearance,
      bestExit: bestExit?.strategy ?? null,
      priceGeometry,
      topRisks,
      gatesSummary,
      exits,
      propertyAddress: address,
      dealId: dbDeal.id,
      runId: lastRunId,
    };

    return { data, isLoading: false, hasRun: true, error: null };
  }, [dbDeal, lastAnalyzeResult, lastRunId, isLoadingRun]);
}
