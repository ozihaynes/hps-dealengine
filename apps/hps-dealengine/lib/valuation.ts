import { getSupabase } from "./supabaseClient";
import type { ValuationRun, PropertySnapshot } from "@hps-internal/contracts";

export type ValuationRunResponse = {
  valuation_run: ValuationRun;
  snapshot: PropertySnapshot;
  deduped?: boolean;
};

export async function invokeValuationRun(dealId: string, posture: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("v1-valuation-run", {
    body: { deal_id: dealId, posture },
  });
  if (error) {
    throw new Error(error.message ?? "Valuation run failed");
  }
  return data as ValuationRunResponse;
}

export async function invokeConnectorsProxy(
  dealId: string,
  opts?: { forceRefresh?: boolean; posture?: string },
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("v1-connectors-proxy", {
    body: {
      deal_id: dealId,
      force_refresh: opts?.forceRefresh ?? false,
      posture: opts?.posture ?? "base",
    },
  });
  if (error) {
    throw new Error(error.message ?? "Connector proxy failed");
  }
  return data as { snapshot: PropertySnapshot };
}

export async function applySuggestedArv(dealId: string, valuationRunId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("v1-valuation-apply-arv", {
    body: {
      deal_id: dealId,
      valuation_run_id: valuationRunId,
    },
  });
  if (error) {
    throw new Error(error.message ?? "Apply ARV failed");
  }
  return data as { ok: boolean; deal?: { payload?: unknown } };
}

export async function overrideMarketValue(params: {
  dealId: string;
  field: "arv" | "as_is_value";
  value: number;
  reason: string;
  valuationRunId?: string | null;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("v1-valuation-override-market", {
    body: {
      deal_id: params.dealId,
      field: params.field,
      value: params.value,
      reason: params.reason,
      valuation_run_id: params.valuationRunId ?? null,
    },
  });
  if (error) {
    throw new Error(error.message ?? "Override failed");
  }
  return data as { ok: boolean; deal?: { payload?: unknown } };
}

export async function fetchLatestValuationRun(dealId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("valuation_runs")
    .select(
      "*, property_snapshots:property_snapshot_id(id, org_id, address_fingerprint, source, provider, as_of, window_days, sample_n, comps, market, raw, stub, expires_at, created_at)",
    )
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Failed to load valuation run");
  }

  return data as (ValuationRun & { property_snapshots?: PropertySnapshot | null }) | null;
}
