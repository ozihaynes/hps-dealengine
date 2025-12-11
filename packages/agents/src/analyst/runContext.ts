import type { AnalyzeOutputs } from "@hps-internal/contracts";
import type { AnalystRunContext } from "./types";

export type RunRow = {
  id: string;
  org_id: string;
  deal_id?: string | null;
  input?: unknown;
  output?: unknown;
  trace?: unknown;
  policy_snapshot?: unknown;
  created_at?: string;
};

function pickOutputs(rawOutput: unknown): AnalyzeOutputs {
  if (!rawOutput || typeof rawOutput !== "object") return {} as AnalyzeOutputs;
  if ("outputs" in (rawOutput as any) && (rawOutput as any).outputs) {
    return (rawOutput as any).outputs as AnalyzeOutputs;
  }
  return rawOutput as AnalyzeOutputs;
}

function extractTrace(raw: RunRow): unknown {
  const outputTrace = Array.isArray((raw.output as any)?.trace) ? (raw.output as any).trace : null;
  if (outputTrace) return outputTrace;
  if (Array.isArray(raw.trace)) return raw.trace;
  return null;
}

function summarizeTrace(trace: any[]): Array<{ frameCode: string; summary: string }> {
  const codes = new Set([
    "SPREAD_LADDER",
    "CASH_GATE",
    "RESPECT_FLOOR",
    "BUYER_CEILING",
    "MAO_CLAMP",
    "TIMELINE_SUMMARY",
    "DTM_URGENCY",
    "CARRY_MONTHS_POLICY",
    "RISK_GATES",
    "EVIDENCE_FRESHNESS",
    "WORKFLOW_DECISION",
    "STRATEGY_RECOMMENDATION",
  ]);
  const gateStatuses = new Set(["fail", "watch", "warning", "warn", "error"]);
  const maxLen = 320;

  return trace.reduce<Array<{ frameCode: string; summary: string }>>((acc, frame) => {
    const rawCode = (frame?.code ?? frame?.key ?? frame?.id ?? "UNKNOWN").toString();
    const status = (frame?.status ?? "").toString().toLowerCase();
    const include = codes.has(rawCode) || gateStatuses.has(status);
    if (!include) return acc;

    let summary = "";

    if (rawCode === "RISK_GATES" && frame?.details?.per_gate) {
      const perGate = frame.details.per_gate as Record<string, { status?: string; reasons?: string[] }>;
      const gated = Object.entries(perGate)
        .filter(([, v]) => gateStatuses.has((v?.status ?? "").toString().toLowerCase()))
        .slice(0, 4)
        .map(
          ([gate, v]) =>
            `${gate}:${(v?.status ?? "unknown").toString()}${Array.isArray(v?.reasons) && v?.reasons.length > 0 ? ` (${v.reasons[0]})` : ""}`,
        );
      summary = gated.length > 0 ? gated.join("; ") : "Risk gates evaluated; no blocking gates.";
    } else if (rawCode === "EVIDENCE_FRESHNESS" && frame?.details?.freshness_by_kind) {
      const freshness = frame.details.freshness_by_kind as Record<string, { status?: string; age_days?: number }>;
      const blocking = Object.entries(freshness)
        .filter(([, v]) => gateStatuses.has((v?.status ?? "").toString().toLowerCase()))
        .slice(0, 4)
        .map(([kind, v]) => `${kind}:${v?.status ?? "unknown"}${v?.age_days != null ? ` (${v.age_days}d)` : ""}`);
      summary = blocking.length > 0 ? blocking.join("; ") : "Evidence freshness reviewed; no blocking items.";
    } else {
      summary =
        frame?.message ??
        frame?.label ??
        frame?.summary ??
        frame?.status ??
        (frame?.data ? JSON.stringify(frame.data) : "");
    }

    const trimmed = (summary ?? "").toString().replace(/\s+/g, " ").trim();
    acc.push({
      frameCode: rawCode,
      summary: trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}.` : trimmed,
    });
    return acc;
  }, []);
}

export function buildAnalystRunContextFromRow(
  raw: RunRow,
  opts: { orgId: string; userId: string; isStale: boolean },
): AnalystRunContext {
  const outputs = pickOutputs(raw.output);
  const timelineSummary = (outputs as any)?.timeline_summary ?? {};
  const riskSummary = (outputs as any)?.risk_summary ?? {};
  const traceRaw = extractTrace(raw);
  const trace = Array.isArray(traceRaw) ? summarizeTrace(traceRaw) : traceRaw;

  return {
    orgId: opts.orgId,
    userId: opts.userId,
    dealId: raw.deal_id ?? "",
    runId: raw.id,
    runCreatedAt: raw.created_at ?? "",
    isStale: opts.isStale,
    input: (raw as any)?.input ?? null,
    outputs,
    trace,
    policySnapshot: raw.policy_snapshot ?? null,
    kpis: {
      mao: (outputs as any)?.primary_offer ?? null,
      spread: (outputs as any)?.spread_cash ?? (outputs as any)?.spread_wholesale ?? null,
      respectFloor: (outputs as any)?.respect_floor ?? (outputs as any)?.respectFloorPrice ?? null,
      buyerCeiling: (outputs as any)?.buyer_ceiling ?? (outputs as any)?.buyerCeiling ?? null,
      assignmentFee: (outputs as any)?.wholesale_fee ?? (outputs as any)?.wholesale_fee_dc ?? null,
      payoff: (outputs as any)?.payoff ?? null,
      dtmDays: timelineSummary?.days_to_money ?? timelineSummary?.dtm_selected_days ?? null,
      urgencyBand: timelineSummary?.urgency_band ?? timelineSummary?.speed_band ?? null,
      marketTemp: timelineSummary?.speed_band ?? null,
      carryMonths: timelineSummary?.carry_months_raw ?? timelineSummary?.carry_months ?? null,
      riskOverall: riskSummary?.overall ?? null,
    },
  };
}
