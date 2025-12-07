import type { SupabaseClient } from "@supabase/supabase-js";

export type DealAiContext = {
  dealId: string;
  runId: string | null;
  kpis: {
    spreadDollars?: number | null;
    spreadPctArv?: number | null;
    wholesaleFee?: number | null;
    wholesaleFeeWithDc?: number | null;
    respectFloor?: number | null;
    buyerCeiling?: number | null;
    arv?: number | null;
    aiv?: number | null;
    dtmDays?: number | null;
    urgencyBand?: string | null;
    marketTempLabel?: string | null;
    riskOverall?: string | null;
    confidenceGrade?: string | null;
    workflowState?: string | null;
  };
  traceHighlights: Array<{
    frameCode: string;
    summary: string;
  }>;
  posture?: {
    name?: string;
    minSpreadPolicySummary?: string | null;
  };
};

type RunRow = {
  id: string;
  deal_id?: string | null;
  posture?: string | null;
  output?: any;
  trace?: any;
  policy_snapshot?: any;
  created_at?: string;
};

const TRACE_CODES_OF_INTEREST = [
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
] as const;

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function pickOutputs(output: any) {
  if (!output) return {} as Record<string, unknown>;
  if (typeof output === "object" && "outputs" in output) return (output as any).outputs ?? output;
  return output as Record<string, unknown>;
}

function extractTrace(run: RunRow): any[] {
  const outputTrace = Array.isArray((run.output as any)?.trace) ? (run.output as any).trace : null;
  if (outputTrace) return outputTrace as any[];
  if (Array.isArray(run.trace)) return run.trace as any[];
  return [];
}

function summarizeTrace(trace: any[]): Array<{ frameCode: string; summary: string }> {
  return trace
    .filter((frame) => {
      const code = (frame?.code ?? frame?.key ?? frame?.id ?? "").toString();
      return TRACE_CODES_OF_INTEREST.includes(code as any);
    })
    .map((frame) => {
      const code = (frame?.code ?? frame?.key ?? frame?.id ?? "UNKNOWN").toString();
      const summary =
        frame?.message ??
        frame?.label ??
        frame?.summary ??
        frame?.status ??
        (frame?.data ? JSON.stringify(frame.data) : "");
      return { frameCode: code, summary: summary ?? "" };
    });
}

export async function getDealAiContext(params: {
  supabase: SupabaseClient;
  dealId: string;
  runId?: string | null;
}): Promise<DealAiContext> {
  const { supabase, dealId, runId } = params;
  let run: RunRow | null = null;

  const query = supabase
    .from("runs")
    .select("id, deal_id, posture, output, trace, policy_snapshot, created_at")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data, error } = runId ? await query.eq("id", runId) : await query;
  if (error) {
    throw new Error(error.message ?? "Failed to load run for AI context.");
  }
  run = (data ?? [])[0] ?? null;

  if (!run) {
    return {
      dealId,
      runId: null,
      kpis: {},
      traceHighlights: [],
    };
  }

  const outputs = pickOutputs(run.output);
  const timelineSummary = (outputs as any)?.timeline_summary ?? {};
  const riskSummary = (outputs as any)?.risk_summary ?? {};
  const kpis: DealAiContext["kpis"] = {
    spreadDollars:
      num((outputs as any)?.spread_cash) ??
      num((outputs as any)?.spread_wholesale) ??
      num((outputs as any)?.dealSpread),
    spreadPctArv: num((outputs as any)?.spread_pct_arv ?? (outputs as any)?.spreadPctArv),
    wholesaleFee: num((outputs as any)?.wholesale_fee),
    wholesaleFeeWithDc: num((outputs as any)?.wholesale_fee_dc ?? (outputs as any)?.wholesaleFeeWithDc),
    respectFloor: num((outputs as any)?.respect_floor ?? (outputs as any)?.respectFloorPrice),
    buyerCeiling: num((outputs as any)?.buyer_ceiling ?? (outputs as any)?.buyerCeiling),
    arv: num((outputs as any)?.arv),
    aiv: num((outputs as any)?.aiv ?? (outputs as any)?.as_is_value),
    dtmDays: num(timelineSummary?.days_to_money ?? timelineSummary?.dtm_days),
    urgencyBand: (timelineSummary?.urgency_band ??
      timelineSummary?.speed_band ??
      timelineSummary?.timeline_band ??
      null) as string | null,
    marketTempLabel: (timelineSummary?.speed_band ?? null) as string | null,
    riskOverall: (riskSummary?.overall ?? null) as string | null,
    confidenceGrade: (riskSummary?.confidence_grade ?? (outputs as any)?.confidence_grade ?? null) as string | null,
    workflowState: (outputs as any)?.workflow_state ?? null,
  };

  const trace = extractTrace(run);
  const traceHighlights = summarizeTrace(trace);

  return {
    dealId,
    runId: run.id,
    kpis,
    traceHighlights,
    posture: { name: run.posture ?? undefined, minSpreadPolicySummary: null },
  };
}
