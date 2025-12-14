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
import { sortCompsDeterministic } from "../_shared/valuationComps.ts";
import { runValuationSelection } from "../_shared/valuationSelection.ts";

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

const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const canonicalizePropertyType = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
};

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("health") === "1") {
    return jsonResponse(req, {
      ok: true,
      name: "v1-valuation-run",
      ts: new Date().toISOString(),
      version: "selection_v1_1",
    });
  }

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

    const rawComps = Array.isArray(snapshot.comps) ? snapshot.comps : [];
    const comps = sortCompsDeterministic(rawComps as any[]);
    const subjectResolved = (snapshot.raw as any)?.subject_property_resolved ?? null;

    const buildSubject = () => ({
      sqft: safeNumber(subjectResolved?.sqft) ?? null,
      beds: safeNumber(subjectResolved?.beds) ?? null,
      baths: safeNumber(subjectResolved?.baths) ?? null,
      year_built: safeNumber(subjectResolved?.year_built) ?? null,
      property_type: canonicalizePropertyType(subjectResolved?.property_type) ?? null,
      latitude: safeNumber(subjectResolved?.latitude) ?? null,
      longitude: safeNumber(subjectResolved?.longitude) ?? null,
    });

    const closedSaleTotal = comps.filter((c: any) => c.comp_kind === "closed_sale").length;
    const listingTotal = comps.filter((c: any) => c.comp_kind === "sale_listing").length;

    const pricedComps = comps.filter((c: any) => safeNumber((c as any)?.price) != null);
    const closedComps = pricedComps.filter((c: any) => c.comp_kind === "closed_sale");
    const listingComps = pricedComps.filter((c: any) => c.comp_kind === "sale_listing");
    const closedPriced = closedComps.length;
    const listingPriced = listingComps.length;

    const closedSelection = runValuationSelection({
      subject: buildSubject(),
      comps: closedComps as any[],
      policyValuation: valuationPolicy,
      min_closed_comps_required: Number(minClosedComps),
      comp_kind: "closed_sale",
    });

    const hasClosed =
      closedSelection.selected_comp_ids.length >= Number(minClosedComps) &&
      closedSelection.suggested_arv != null;

    const listingSelection = !hasClosed
      ? runValuationSelection({
          subject: buildSubject(),
          comps: listingComps as any[],
          policyValuation: valuationPolicy,
          min_closed_comps_required: Number(minClosedComps),
          comp_kind: "sale_listing",
        })
      : null;

    const activeSelection = hasClosed ? closedSelection : listingSelection;

    const selection = activeSelection ?? {
      suggested_arv: null,
      suggested_arv_range_low: null,
      suggested_arv_range_high: null,
      selected_comp_ids: [],
      selected_comps: [] as any[],
      warning_codes: [] as string[],
      selection_summary: {},
      comp_kind_used: null,
    };

    const warningCodes: string[] = [...(selection.warning_codes ?? [])];
    if (!hasClosed && listingSelection) {
      warningCodes.push("insufficient_closed_sales_comps", "listing_based_comps_only");
    }

    const avmPrice = (snapshot.market as any)?.avm_price ?? null;
    const avmLow = (snapshot.market as any)?.avm_price_range_low ?? null;
    const avmHigh = (snapshot.market as any)?.avm_price_range_high ?? null;

    const compsUsed = selection.selected_comps ?? [];
    const compCount = compsUsed.length;
    const stats = {
      median_distance_miles: median(
      compsUsed.map((c: any) => Number((c as any)?.distance_miles)).filter((n) => Number.isFinite(n)),
    ),
    median_correlation: median(
        compsUsed.map((c: any) => Number((c as any)?.correlation)).filter((n) => Number.isFinite(n)),
      ),
      median_days_old: median(
        compsUsed.map((c: any) => Number((c as any)?.days_old)).filter((n) => Number.isFinite(n)),
      ),
    };

    const suggestedArv = selection.suggested_arv ?? null;
    const rangeWidthPct =
      suggestedArv &&
      selection.suggested_arv_range_low != null &&
      selection.suggested_arv_range_high != null &&
      suggestedArv !== 0
        ? (Number(selection.suggested_arv_range_high) - Number(selection.suggested_arv_range_low)) /
          Number(suggestedArv)
        : null;

    const rubric = valuationPolicy.confidence_rubric ?? {};
    const bands: Array<{ grade: "A" | "B" | "C"; cfg: any }> = [
      { grade: "A", cfg: rubric["A"] },
      { grade: "B", cfg: rubric["B"] },
      { grade: "C", cfg: rubric["C"] },
    ];

    let valuationConfidence: "A" | "B" | "C" | null = null;

    if (stats.median_correlation == null) {
      warningCodes.push("missing_correlation_signal");
    } else {
      for (const band of bands) {
        if (!band.cfg) continue;
        const minCompsNeeded = Number(band.cfg.min_comps_multiplier ?? 0) * Number(minClosedComps);
        const minCorr = Number(band.cfg.min_median_correlation ?? 0);
        const maxRange = Number(band.cfg.max_range_pct ?? 1);
        const compsOk = compCount >= minCompsNeeded;
        const corrOk = stats.median_correlation == null ? true : stats.median_correlation >= minCorr;
        const rangeOk = rangeWidthPct == null ? true : rangeWidthPct <= maxRange;
        if (compsOk && corrOk && rangeOk) {
          valuationConfidence = band.grade;
          break;
        }
      }
    }

    if (!valuationConfidence) {
      valuationConfidence = "C";
    }
    if (!hasClosed) {
      valuationConfidence = "C";
    }
    if (snapshot.stub) {
      warningCodes.push("snapshot_stub");
      valuationConfidence = "C";
    }

    const failureReasons: string[] = [];
    if (suggestedArv == null) {
      failureReasons.push("missing_suggested_arv");
    }
    if ((snapshot.raw as any)?.closed_sales_fetch_failed) {
      warningCodes.push("closed_sales_fetch_failed");
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

    const ladderRaw = (snapshot.raw as any)?.closed_sales ?? {};
    const ladderStages = Array.isArray(ladderRaw?.stages)
      ? ladderRaw.stages
          .map((s: any) => (typeof s === "string" ? s : s?.name ?? null))
          .filter((s: any): s is string => typeof s === "string")
      : [];
    const selectionSummary = {
      ...(selection.selection_summary ?? {}),
      ladder: {
        stages: ladderStages,
        stop_reason: ladderRaw?.stop_reason ?? null,
      },
      input_counts: {
        closed_sale_total: closedSaleTotal,
        closed_sale_priced: closedPriced,
        listing_total: listingTotal,
        listing_priced: listingPriced,
      },
      closed_attempt: closedSelection?.selection_summary ?? null,
      listing_attempt: listingSelection?.selection_summary ?? null,
      active_attempt: hasClosed ? "closed_sale" : listingSelection ? "sale_listing" : null,
    };

    const outputPayload = {
      suggested_arv: suggestedArv ?? null,
      arv_range_low: selection.suggested_arv_range_low ?? null,
      arv_range_high: selection.suggested_arv_range_high ?? null,
      suggested_arv_range_low: selection.suggested_arv_range_low ?? null,
      suggested_arv_range_high: selection.suggested_arv_range_high ?? null,
      selected_comp_ids: selection.selected_comp_ids ?? [],
      selection_summary: selectionSummary ?? null,
      avm_reference_price: avmPrice ?? null,
      avm_reference_range_low: avmLow ?? null,
      avm_reference_range_high: avmHigh ?? null,
      suggested_arv_source_method: `selection_v1_1_${valuationPolicy.selection_method ?? "weighted_median_ppsf"}`,
      suggested_arv_comp_kind_used: selection.comp_kind_used ?? null,
      suggested_arv_comp_count_used: compCount ?? null,
      as_is_value: null,
      valuation_confidence: valuationConfidence,
      comp_count: compCount,
      comp_set_stats: stats,
      warnings: warningCodes,
      warning_codes: warningCodes,
      messages: failureReason ? [failureReason] : [],
    };

    const endpoints = ["rentcast_avm", "rentcast_markets"];
    if ((snapshot.raw as any)?.closed_sales) {
      endpoints.push("rentcast_properties");
    }

    const provenance = {
      provider_id: snapshot.provider ?? null,
      provider_name: snapshot.provider ?? null,
      endpoints,
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
