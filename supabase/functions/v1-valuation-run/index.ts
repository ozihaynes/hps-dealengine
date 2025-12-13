import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { canonicalJson, hashJson } from "../_shared/contracts.ts";
import { createSupabaseClient, type ValuationPolicyShape } from "../_shared/valuation.ts";
import {
  ensureSnapshotForDeal,
  loadDealAndOrg,
  type ValuationPolicy,
} from "../_shared/valuationSnapshot.ts";
import { fetchActivePolicyForOrg } from "../_shared/policy.ts";

type RequestBody = {
  deal_id: string;
  posture?: "conservative" | "base" | "aggressive";
  force_refresh?: boolean;
};

type PolicyRow = {
  id: string;
  org_id: string;
  posture: string;
  policy_json: any;
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

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

    let policyRow: PolicyRow;
    try {
      const fetched = await fetchActivePolicyForOrg(supabase, deal.org_id, posture);
      policyRow = fetched as PolicyRow;
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

    const valuationPolicy: ValuationPolicyShape =
      (policyRow.policy_json?.valuation as ValuationPolicy | undefined) ?? {};
    const minClosedComps = valuationPolicy.min_closed_comps_required;
    if (minClosedComps == null || !Number.isFinite(Number(minClosedComps))) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "policy_missing_token",
          message: "valuation.min_closed_comps_required missing",
        },
        400,
      );
    }
    if (!valuationPolicy.confidence_rubric || Object.keys(valuationPolicy.confidence_rubric).length === 0) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "policy_missing_token",
          message: "valuation.confidence_rubric missing",
        },
        400,
      );
    }

    const { snapshot, fingerprint } = await ensureSnapshotForDeal({
      supabase,
      deal,
      policyValuation: valuationPolicy as ValuationPolicy,
      forceRefresh: !!body.force_refresh,
    });

    const comps = Array.isArray(snapshot.comps) ? snapshot.comps : [];
    const compCount = comps.length;

    const avmPrice = (snapshot.market as any)?.avm_price ?? null;
    const avmLow = (snapshot.market as any)?.avm_price_range_low ?? null;
    const avmHigh = (snapshot.market as any)?.avm_price_range_high ?? null;

    const medianPrice = median(
      comps
        .map((c: any) => Number((c as any)?.price))
        .filter((n) => Number.isFinite(n)),
    );

    const stats = {
      median_distance_miles: median(
        comps.map((c: any) => Number((c as any)?.distance_miles)).filter((n) => Number.isFinite(n)),
      ),
      median_correlation: median(
        comps.map((c: any) => Number((c as any)?.correlation)).filter((n) => Number.isFinite(n)),
      ),
      median_days_old: median(
        comps.map((c: any) => Number((c as any)?.days_old)).filter((n) => Number.isFinite(n)),
      ),
    };

    const suggestedArv = avmPrice ?? medianPrice ?? null;
    const rangeWidthPct =
      avmPrice && avmLow != null && avmHigh != null && avmPrice !== 0
        ? (Number(avmHigh) - Number(avmLow)) / Number(avmPrice)
        : null;

    const rubric = valuationPolicy.confidence_rubric ?? {};
    const bands: Array<{ grade: "A" | "B" | "C"; cfg: any }> = [
      { grade: "A", cfg: rubric["A"] },
      { grade: "B", cfg: rubric["B"] },
      { grade: "C", cfg: rubric["C"] },
    ];

    const warnings: string[] = [];
    let valuationConfidence: "A" | "B" | "C" | null = null;

    if (stats.median_correlation == null) {
      // Missing correlation should not fail the run; cap confidence at C and surface a warning.
      warnings.push("missing_correlation_signal");
      valuationConfidence = "C";
    } else {
      for (const band of bands) {
        if (!band.cfg) continue;
        const minCompsNeeded = Number(band.cfg.min_comps_multiplier ?? 0) * Number(minClosedComps);
        const minCorr = Number(band.cfg.min_median_correlation ?? 0);
        const maxRange = Number(band.cfg.max_range_pct ?? 1);
        const compsOk = compCount >= minCompsNeeded;
        const corrOk = stats.median_correlation >= minCorr;
        const rangeOk = rangeWidthPct == null ? true : rangeWidthPct <= maxRange;
        if (compsOk && corrOk && rangeOk) {
          valuationConfidence = band.grade;
          break;
        }
      }
      if (!valuationConfidence) {
        valuationConfidence = "C";
      }
    }

    const failureReasons: string[] = [];
    if (compCount < Number(minClosedComps)) {
      failureReasons.push(`insufficient_comps_${compCount}_of_${minClosedComps}`);
    }
    if (suggestedArv == null) {
      failureReasons.push("missing_suggested_arv");
    }

    const status = failureReasons.length === 0 ? "succeeded" : "failed";
    const failureReason = failureReasons.length > 0 ? failureReasons.join("; ") : null;

    const inputPayload = {
      deal_id: deal.id,
      posture,
      address_fingerprint: fingerprint,
      property_snapshot_id: snapshot.id,
      min_closed_comps_required: minClosedComps,
      policy_version_id: policyRow.id,
      property_snapshot_hash: hashJson(snapshot),
    };

    const outputPayload = {
      suggested_arv: suggestedArv ?? null,
      arv_range_low: avmLow ?? null,
      arv_range_high: avmHigh ?? null,
      as_is_value: null,
      valuation_confidence: valuationConfidence,
      comp_count: compCount,
      comp_set_stats: stats,
      warnings,
      messages: failureReason ? [failureReason] : [],
    };

    const provenance = {
      provider_id: snapshot.provider ?? null,
      provider_name: snapshot.provider ?? null,
      endpoints: ["rentcast_avm", "rentcast_markets"],
      stub: !!snapshot.stub,
      source: snapshot.source ?? null,
      as_of: snapshot.as_of ?? null,
      window_days: snapshot.window_days ?? null,
      sample_n: snapshot.sample_n ?? null,
      address_fingerprint: fingerprint,
      property_snapshot_id: snapshot.id,
      min_closed_comps_required: minClosedComps,
    };

    const input_hash = hashJson(inputPayload);
    const output_hash = hashJson(outputPayload);
    const policy_hash = hashJson(policyRow.policy_json ?? {});
    const run_hash = hashJson({ input_hash, output_hash, policy_hash });

    const existing = await supabase
      .from("valuation_runs")
      .select("*")
      .eq("org_id", deal.org_id)
      .eq("deal_id", deal.id)
      .eq("posture", posture)
      .eq("input_hash", input_hash)
      .eq("policy_hash", policy_hash)
      .maybeSingle();

    if (existing.data) {
      return jsonResponse(
        req,
        {
          ok: true,
          deduped: true,
          valuation_run: existing.data,
          snapshot,
        },
        200,
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("valuation_runs")
      .insert({
        org_id: deal.org_id,
        deal_id: deal.id,
        posture,
        address_fingerprint: fingerprint,
        property_snapshot_id: snapshot.id,
        input: JSON.parse(canonicalJson(inputPayload)),
        output: JSON.parse(canonicalJson(outputPayload)),
        provenance: JSON.parse(canonicalJson(provenance)),
        status,
        failure_reason: failureReason,
        input_hash,
        output_hash,
        policy_hash,
        run_hash,
      })
      .select()
      .maybeSingle();

    if (insertError || !inserted) {
      console.error("[v1-valuation-run] insert error", insertError);
      throw new Error("valuation_run_insert_failed");
    }

    return jsonResponse(
      req,
      { ok: true, valuation_run: inserted, snapshot },
      200,
    );
  } catch (err: any) {
    console.error("[v1-valuation-run] error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: "valuation_run_error",
        message: err?.message ?? "Failed to run valuation",
      },
      500,
    );
  }
});
