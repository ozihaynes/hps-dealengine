import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { canonicalJson } from "../_shared/contracts.ts";
import { createSupabaseClient, toCanonical } from "../_shared/valuation.ts";

type RequestBody = {
  deal_id: string;
  field: "arv" | "as_is_value";
  value: number;
  reason: string;
  valuation_run_id?: string | null;
};

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use POST" },
      405,
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_json", message: "Body must be valid JSON" },
      400,
    );
  }

  if (!body?.deal_id || !body?.field || typeof body.value === "undefined" || !body.reason) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "deal_id, field, value, and reason are required" },
      400,
    );
  }

  const numeric = Number(body.value);
  if (!Number.isFinite(numeric)) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_value", message: "value must be numeric" },
      400,
    );
  }

  if (body.reason.trim().length < 10) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_reason", message: "reason must be at least 10 characters" },
      400,
    );
  }

  let supabase;
  try {
    supabase = createSupabaseClient(req);
  } catch (err: any) {
    return jsonResponse(
      req,
      { ok: false, error: "config_error", message: err?.message ?? "Supabase config missing" },
      500,
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(
      req,
      { ok: false, error: "unauthorized", message: "Valid JWT required" },
      401,
    );
  }

  try {
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, org_id, payload")
      .eq("id", body.deal_id)
      .maybeSingle();

    if (dealError) throw dealError;
    if (!deal) {
      return jsonResponse(
        req,
        { ok: false, error: "deal_not_found", message: "Deal not found or not accessible" },
        404,
      );
    }

    let valuationRun: any | null = null;
    if (body.valuation_run_id) {
      const { data: run, error: runError } = await supabase
        .from("valuation_runs")
        .select("id, org_id, deal_id")
        .eq("id", body.valuation_run_id)
        .eq("deal_id", deal.id)
        .eq("org_id", deal.org_id)
        .maybeSingle();

      if (runError) throw runError;
      valuationRun = run ?? null;
      if (!valuationRun) {
        return jsonResponse(
          req,
          { ok: false, error: "valuation_run_not_found", message: "Valuation run not found for this deal/org" },
          404,
        );
      }
    }

    const nowIso = new Date().toISOString();
    const currentPayload = (deal as any).payload ?? {};
    const currentMarket = (currentPayload as any).market ?? {};

    const nextMarket: Record<string, unknown> = { ...currentMarket };
    if (body.field === "arv") {
      nextMarket.arv = numeric;
      nextMarket.arv_source = "manual_override";
      nextMarket.arv_as_of = nowIso;
      nextMarket.arv_override_reason = body.reason.trim();
      nextMarket.arv_valuation_run_id = valuationRun?.id ?? null;
    } else {
      nextMarket.as_is_value = numeric;
      nextMarket.as_is_value_source = "manual_override";
      nextMarket.as_is_value_as_of = nowIso;
      nextMarket.as_is_value_override_reason = body.reason.trim();
      nextMarket.as_is_value_valuation_run_id = valuationRun?.id ?? null;
    }

    const nextPayload = {
      ...currentPayload,
      market: nextMarket,
    };

    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update({
        payload: JSON.parse(canonicalJson(toCanonical(nextPayload))),
      })
      .eq("id", deal.id)
      .eq("org_id", deal.org_id)
      .select("id, org_id, payload, updated_at")
      .maybeSingle();

    if (updateError || !updatedDeal) {
      throw updateError ?? new Error("deal_update_failed");
    }

    return jsonResponse(
      req,
      {
        ok: true,
        deal: updatedDeal,
      },
      200,
    );
  } catch (err: any) {
    console.error("[v1-valuation-override-market] error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: "valuation_override_error",
        message: err?.message ?? "Failed to save valuation override",
      },
      500,
    );
  }
});
