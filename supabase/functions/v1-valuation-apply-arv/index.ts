import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, toCanonical } from "../_shared/valuation.ts";
import { canonicalJson } from "../_shared/contracts.ts";

type RequestBody = {
  deal_id: string;
  valuation_run_id: string;
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

  if (!body?.deal_id || !body?.valuation_run_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "deal_id and valuation_run_id are required" },
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

  // Verify caller
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

    const { data: valuationRun, error: valuationError } = await supabase
      .from("valuation_runs")
      .select("id, org_id, deal_id, output, provenance, created_at")
      .eq("id", body.valuation_run_id)
      .eq("org_id", deal.org_id)
      .eq("deal_id", deal.id)
      .maybeSingle();

    if (valuationError) throw valuationError;
    if (!valuationRun) {
      return jsonResponse(
        req,
        { ok: false, error: "valuation_run_not_found", message: "Valuation run not found for this deal/org" },
        404,
      );
    }

    const suggestedArv = Number((valuationRun as any)?.output?.suggested_arv);
    if (!Number.isFinite(suggestedArv)) {
      return jsonResponse(
        req,
        { ok: false, error: "suggested_arv_missing", message: "Valuation run does not contain a suggested ARV" },
        400,
      );
    }

    const arvAsOf =
      (valuationRun as any)?.provenance?.as_of ??
      (valuationRun as any)?.output?.as_of ??
      (valuationRun as any)?.created_at ??
      new Date().toISOString();

    const currentPayload = (deal as any).payload ?? {};
    const currentMarket = (currentPayload as any).market ?? {};
    const nextPayload = {
      ...currentPayload,
      market: {
        ...currentMarket,
        arv: suggestedArv,
        arv_source: "valuation_run",
        arv_valuation_run_id: valuationRun.id,
        arv_as_of: arvAsOf,
      },
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
      console.error("[v1-valuation-apply-arv] update error", updateError);
      throw new Error("deal_update_failed");
    }

    return jsonResponse(
      req,
      {
        ok: true,
        deal: updatedDeal,
        applied: {
          arv: suggestedArv,
          arv_as_of: arvAsOf,
          valuation_run_id: valuationRun.id,
        },
      },
      200,
    );
  } catch (err: any) {
    console.error("[v1-valuation-apply-arv] error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: "valuation_apply_error",
        message: err?.message ?? "Failed to apply valuation ARV",
      },
      500,
    );
  }
});
