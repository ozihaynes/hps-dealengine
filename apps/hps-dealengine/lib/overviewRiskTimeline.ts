import type { AnalyzeOutputs } from "@hps-internal/contracts";

import { evidenceLabel } from "./evidenceFreshness";
import type { EngineCalculations } from "../types";

export type RiskStatus = "pass" | "watch" | "fail" | "unknown";

export type RiskGate = {
  key: keyof NonNullable<AnalyzeOutputs["risk_summary"]>;
  label: string;
  status: RiskStatus;
  reasons: string[];
};

export type RiskViewModel = {
  overallStatus: RiskStatus;
  gates: RiskGate[];
  reasons: string[];
};

export type ConfidenceViewModel = {
  grade: "A" | "B" | "C" | "Unknown";
  label: string;
  reasons: string[];
};

export type WorkflowState = "NeedsInfo" | "NeedsReview" | "ReadyForOffer" | "Unknown";
export type WorkflowViewModel = {
  state: WorkflowState;
  label: string;
  reasons: string[];
};

export type TimelineUrgencyTone = "low" | "medium" | "high" | "neutral";

export type TimelineViewModel = {
  daysToMoney: number | null;
  carryMonths: number | null;
  speedBand: "fast" | "balanced" | "slow" | null;
  urgencyLabel: string;
  urgencyTone: TimelineUrgencyTone;
  carryMonthly: number | null;
  carryTotal: number | null;
  auctionDate: string | null;
};

export type EvidenceViewModel = {
  confidenceGrade: "A" | "B" | "C" | "Unknown";
  confidenceLabel: string;
  confidenceReasons: string[];
  missingKinds: string[];
  staleKinds: string[];
  blockingKinds: string[];
  freshnessRows: EvidenceFreshnessRow[];
  isComplete: boolean;
  placeholdersAllowed: boolean;
  placeholdersUsed: boolean;
  placeholderKinds: string[];
};

export type EvidenceFreshnessRow = {
  kind: string;
  label: string;
  status: "fresh" | "stale" | "missing";
  ageDays: number | null;
  blocking: boolean;
  reasons: string[];
};

const RISK_GATE_LABELS: Record<string, string> = {
  insurability: "Insurability",
  payoff: "Payoff",
  title: "Title / Liens",
  fha_va_flip: "FHA / VA Flip Rules",
  firpta: "FIRPTA",
  pace_solar_ucc: "PACE / Solar / UCC",
  condo_sirs: "Condo / SIRS",
  manufactured: "Manufactured",
  scra: "SCRA / Active Duty",
};

const toNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const mapGateStatus = (status: AnalyzeOutputs["risk_summary"] extends infer R
  ? R extends { overall: any }
    ? R[keyof R]
    : unknown
  : never): RiskStatus => {
  if (status === "pass" || status === "watch" || status === "fail") {
    return status;
  }
  if (status === "info_needed") {
    // Treat info_needed as a caution/watch for UI purposes.
    return "watch";
  }
  return "unknown";
};

const mapOverallStatus = (
  summary: AnalyzeOutputs["risk_summary"] | undefined,
  gates: RiskGate[],
): RiskStatus => {
  if (summary?.overall) {
    return mapGateStatus(summary.overall);
  }
  if (gates.some((g) => g.status === "fail")) return "fail";
  if (gates.some((g) => g.status === "watch")) return "watch";
  if (gates.every((g) => g.status === "unknown")) return "unknown";
  return "pass";
};

const humanizeWorkflow = (state: AnalyzeOutputs["workflow_state"] | null | undefined): WorkflowViewModel => {
  switch (state) {
    case "ReadyForOffer":
      return { state: "ReadyForOffer", label: "Ready for Offer", reasons: [] };
    case "NeedsReview":
      return { state: "NeedsReview", label: "Needs Review", reasons: [] };
    case "NeedsInfo":
      return { state: "NeedsInfo", label: "Needs Info", reasons: [] };
    default:
      return { state: "Unknown", label: "Unknown", reasons: [] };
  }
};

export function buildConfidenceView(outputs: AnalyzeOutputs | null | undefined): ConfidenceViewModel {
  const gradeRaw = outputs?.confidence_grade;
  const grade: ConfidenceViewModel["grade"] =
    gradeRaw === "A" || gradeRaw === "B" || gradeRaw === "C" ? gradeRaw : "Unknown";
  return {
    grade,
    label: grade === "Unknown" ? "Confidence unknown" : `Confidence ${grade}`,
    reasons: outputs?.confidence_reasons ?? [],
  };
}

export function buildWorkflowView(outputs: AnalyzeOutputs | null | undefined): WorkflowViewModel {
  const base = humanizeWorkflow(outputs?.workflow_state ?? null);
  return {
    ...base,
    reasons: outputs?.workflow_reasons ?? [],
  };
}

export function buildRiskView(
  outputs: AnalyzeOutputs | null | undefined,
): RiskViewModel {
  const summary = outputs?.risk_summary;
  const reasons = Array.isArray(summary?.reasons) ? summary?.reasons ?? [] : [];

  const perGate = summary?.per_gate ?? {};
  const gateEntries =
    Object.keys(perGate).length > 0
      ? Object.entries(perGate)
      : Object.entries(RISK_GATE_LABELS).map(([key]) => [key, (summary as any)?.[key]]);

  const gates: RiskGate[] = gateEntries.map(([key, value]) => {
    const status = mapGateStatus((value as any)?.status ?? (value as any));
    const gateReasons =
      (Array.isArray((value as any)?.reasons) ? ((value as any).reasons as string[]) : []) ?? [];
    return {
      key: key as any,
      label: RISK_GATE_LABELS[key] ?? key,
      status,
      reasons: gateReasons,
    };
  });

  const overallStatus = mapOverallStatus(summary, gates);

  return {
    overallStatus,
    gates,
    reasons,
  };
}

export function buildTimelineView(
  outputs: AnalyzeOutputs | null | undefined,
  calc?: EngineCalculations | null,
): TimelineViewModel {
  const summary = outputs?.timeline_summary;
  const daysToMoney = summary?.days_to_money ?? null;
  const carryMonths = summary?.carry_months ?? toNumber(calc ? (calc as any).carryMonths : null);
  const carryTotal =
    (summary as any)?.carry_total_dollars ??
    toNumber(calc ? (calc as any).carryCosts : null);
  const carryMonthly =
    (summary as any)?.hold_monthly_dollars ??
    (carryMonths && carryMonths > 0 && carryTotal != null ? carryTotal / carryMonths : null);

  let urgencyTone: TimelineUrgencyTone = "neutral";
  let urgencyLabel = "Unknown";
  if (summary?.urgency === "critical") {
    urgencyTone = "high";
    urgencyLabel = "Critical";
  } else if (summary?.urgency === "elevated") {
    urgencyTone = "medium";
    urgencyLabel = "Elevated";
  } else if (summary?.urgency === "normal") {
    urgencyTone = "low";
    urgencyLabel = "Normal";
  }

  return {
    daysToMoney,
    carryMonths,
    speedBand: summary?.speed_band ?? null,
    urgencyLabel,
    urgencyTone,
    carryMonthly,
    carryTotal,
    auctionDate: summary?.auction_date_iso ?? null,
  };
}

export function buildEvidenceView(
  outputs: AnalyzeOutputs | null | undefined,
  traceFrames?: any[] | null,
): EvidenceViewModel {
  const summary = outputs?.evidence_summary;
  const gradeRaw =
    outputs?.confidence_grade ?? summary?.confidence_grade ?? null;
  const grade: EvidenceViewModel["confidenceGrade"] =
    gradeRaw === "A" || gradeRaw === "B" || gradeRaw === "C"
      ? gradeRaw
      : "Unknown";

  const missingKinds: string[] = [];
  const staleKinds: string[] = [];
  const blockingKinds: string[] = [];
  const freshnessRows: EvidenceViewModel["freshnessRows"] = [];
  const freshness = summary?.freshness_by_kind ?? {};
  Object.entries(freshness).forEach(([kind, statusObj]) => {
    const status =
      typeof statusObj === "string"
        ? statusObj
        : typeof statusObj === "object"
        ? statusObj?.status
        : null;
    const ageDays =
      typeof statusObj === "object" && statusObj
        ? (statusObj as any).age_days ?? null
        : null;
    const blocking =
      typeof statusObj === "object" && statusObj
        ? Boolean((statusObj as any).blocking_for_ready)
        : false;
    const reasons =
      (typeof statusObj === "object" && statusObj && Array.isArray((statusObj as any).reasons)
        ? ((statusObj as any).reasons as string[])
        : []) ?? [];
    const label = evidenceLabel(kind);
    if (status === "missing") {
      missingKinds.push(label);
    } else if (status === "stale") {
      staleKinds.push(label);
    }
    if (blocking) {
      blockingKinds.push(label);
    }
    if (status) {
      freshnessRows.push({
        kind,
        label,
        status,
        ageDays: typeof ageDays === "number" ? ageDays : null,
        blocking,
        reasons,
      });
    }
  });

  const evidenceTrace = Array.isArray(traceFrames)
    ? traceFrames.find((t: any) => t?.rule === "EVIDENCE_FRESHNESS_POLICY")
    : null;
  const placeholdersAllowed =
    evidenceTrace?.details?.allow_placeholders_when_evidence_missing === true;
  const placeholdersUsed = evidenceTrace?.details?.placeholders_used === true;
  const placeholderKinds =
    Array.isArray(evidenceTrace?.details?.placeholder_kinds) && evidenceTrace?.details?.placeholder_kinds.length > 0
      ? (evidenceTrace.details.placeholder_kinds as string[])
      : [];

  return {
    confidenceGrade: grade,
    confidenceLabel: grade === "Unknown" ? "Unknown" : `Confidence ${grade}`,
    confidenceReasons: outputs?.confidence_reasons ?? summary?.confidence_reasons ?? [],
    missingKinds,
    staleKinds,
    blockingKinds,
    freshnessRows,
    isComplete:
      grade !== "Unknown" &&
      missingKinds.length === 0 &&
      staleKinds.length === 0 &&
      blockingKinds.length === 0,
    placeholdersAllowed,
    placeholdersUsed,
    placeholderKinds,
  };
}
