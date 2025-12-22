import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, normalizeAddress } from "../_shared/valuation.ts";
import {
  ensureSnapshotForDeal,
  loadDealAndOrg,
  type ValuationPolicy,
} from "../_shared/valuationSnapshot.ts";
import { fetchActivePolicyForOrg } from "../_shared/policy.ts";

type RequestBody = {
  deal_id: string;
  force_refresh?: boolean;
  posture?: "conservative" | "base" | "aggressive";
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

  if (!body?.deal_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "deal_id is required" },
      400,
    );
  }

  const posture = body.posture ?? "base";
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
    const deal = await loadDealAndOrg(supabase, body.deal_id);
    const normalizedAddress = normalizeAddress({
      address: deal.address,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
    });
    if (!normalizedAddress) {
      return jsonResponse(
        req,
        { ok: false, error: "missing_address", message: "Deal has no address fields" },
        400,
      );
    }

    let policyRow;
    try {
      policyRow = await fetchActivePolicyForOrg(supabase, deal.org_id, posture);
    } catch (err: any) {
      const message =
        err?.message === "policy_not_found"
          ? "No active policy for this org/posture"
          : err?.message === "policy_multiple_active"
          ? "Multiple active policies found; resolve policy state"
          : "Failed to load policy";
      const status = err?.message === "policy_not_found" ? 404 : 400;
      return jsonResponse(
        req,
        { ok: false, error: err?.message ?? "policy_error", message },
        status,
      );
    }

    const policyValuation: ValuationPolicy =
      (policyRow.policy_json?.valuation as ValuationPolicy | undefined) ?? {};
    if (
      policyValuation.snapshot_ttl_hours == null ||
      !Number.isFinite(Number(policyValuation.snapshot_ttl_hours))
    ) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "policy_missing_token",
          message: "valuation.snapshot_ttl_hours missing",
        },
        400,
      );
    }

    const { snapshot, created, fingerprint } = await ensureSnapshotForDeal({
      supabase,
      deal,
      policyValuation,
      forceRefresh: !!body.force_refresh,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        created,
        snapshot,
        fingerprint,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (err: any) {
    console.error("[v1-connectors-proxy] error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: "connector_error",
        message: err?.message ?? "Failed to fetch property snapshot",
      },
      500,
    );
  }
});
