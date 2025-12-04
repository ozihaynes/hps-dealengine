import type { AnalyzeOutputs } from "@hps-internal/contracts";

import { evidenceLabel } from "./evidenceFreshness";
import type { EngineCalculations } from "../types";

export type RiskStatus = "pass" | "watch" | "fail" | "unknown";

export type RiskGate = {
  key: keyof NonNullable<AnalyzeOutputs["risk_summary"]>;
  label: string;
  status: RiskStatus;
  reason?: string | null;
};

export type RiskViewModel = {
  overallStatus: RiskStatus;
  gates: RiskGate[];
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
  isComplete: boolean;
};

const RISK_GATES: Array<{ key: RiskGate["key"]; label: string }> = [
  { key: "insurability", label: "Insurability" },
  { key: "payoff", label: "Payoff" },
  { key: "title", label: "Title / Liens" },
  { key: "fha_va_flip", label: "FHA / VA Flip Rules" },
  { key: "firpta", label: "FIRPTA" },
  { key: "pace_solar_ucc", label: "PACE / Solar / UCC" },
  { key: "condo_sirs", label: "Condo / SIRS" },
  { key: "manufactured", label: "Manufactured" },
  { key: "scra", label: "SCRA / Active Duty" },
];

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

const deriveUrgency = (
  raw: "normal" | "elevated" | "critical" | null | undefined,
  daysToMoney: number | null,
): { label: string; tone: TimelineUrgencyTone } => {
  if (raw === "critical") return { label: "Critical", tone: "high" };
  if (raw === "elevated") return { label: "Elevated", tone: "medium" };
  if (raw === "normal") return { label: "Normal", tone: "low" };

  // UI-only fallback: derive urgency from days-to-money if present.
  if (daysToMoney != null) {
    if (daysToMoney <= 14) return { label: "Critical", tone: "high" }; // presentation-only threshold
    if (daysToMoney <= 45) return { label: "Elevated", tone: "medium" }; // presentation-only threshold
    return { label: "Normal", tone: "low" };
  }

  return { label: "Unknown", tone: "neutral" };
};

export function buildRiskView(
  outputs: AnalyzeOutputs | null | undefined,
): RiskViewModel {
  const summary = outputs?.risk_summary;
  const reasons = summary?.reasons ?? [];

  const gates: RiskGate[] = RISK_GATES.map((gate) => {
    const status = mapGateStatus((summary as any)?.[gate.key]);
    const reason =
      reasons.find((r) => r.toLowerCase().includes(gate.key.toLowerCase())) ??
      null;
    return {
      ...gate,
      status,
      reason,
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
  const carryMonths =
    summary?.carry_months ?? toNumber(calc ? (calc as any).carryMonths : null);
  const carryTotal = toNumber(calc ? (calc as any).carryCosts : null);
  const carryMonthly =
    carryMonths && carryMonths > 0 && carryTotal != null
      ? carryTotal / carryMonths
      : null;

  const urgency = deriveUrgency(summary?.urgency ?? null, daysToMoney);

  return {
    daysToMoney,
    carryMonths,
    speedBand: summary?.speed_band ?? null,
    urgencyLabel: urgency.label,
    urgencyTone: urgency.tone,
    carryMonthly,
    carryTotal,
    auctionDate: summary?.auction_date_iso ?? null,
  };
}

export function buildEvidenceView(
  outputs: AnalyzeOutputs | null | undefined,
): EvidenceViewModel {
  const summary = outputs?.evidence_summary;
  const gradeRaw =
    summary?.confidence_grade ?? outputs?.confidence_grade ?? null;
  const grade: EvidenceViewModel["confidenceGrade"] =
    gradeRaw === "A" || gradeRaw === "B" || gradeRaw === "C"
      ? gradeRaw
      : "Unknown";

  const missingKinds: string[] = [];
  const staleKinds: string[] = [];
  const freshness = summary?.freshness_by_kind ?? {};
  Object.entries(freshness).forEach(([kind, status]) => {
    const label = evidenceLabel(kind);
    if (status === "missing") {
      missingKinds.push(label);
    } else if (status === "stale") {
      staleKinds.push(label);
    }
  });

  return {
    confidenceGrade: grade,
    confidenceLabel: grade === "Unknown" ? "Unknown" : `Confidence ${grade}`,
    confidenceReasons:
      summary?.confidence_reasons ?? outputs?.confidence_reasons ?? [],
    missingKinds,
    staleKinds,
    isComplete:
      grade !== "Unknown" && missingKinds.length === 0 && staleKinds.length === 0,
  };
}
