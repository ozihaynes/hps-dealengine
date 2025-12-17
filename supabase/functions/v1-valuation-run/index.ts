import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { canonicalJson } from "../_shared/contracts.ts";
import { createSupabaseClient, type ValuationPolicyShape } from "../_shared/valuation.ts";
import {
  ensureSnapshotForDeal,
  loadDealAndOrg,
  type ValuationPolicy,
} from "../_shared/valuationSnapshot.ts";
import { fetchActivePolicyForOrg } from "../_shared/policy.ts";
import { sortCompsDeterministic } from "../_shared/valuationComps.ts";
import { runValuationSelection } from "../_shared/valuationSelection.ts";
import { applyMarketTimeAdjustment } from "../_shared/marketIndex.ts";
import { computeValuationConfidence } from "../_shared/valuationConfidence.ts";
import { stableHash } from "../_shared/determinismHash.ts";
import { buildCompAdjustedValue, weightedMedianDeterministic } from "../_shared/valuationAdjustments.ts";
import { computeEnsemble } from "../_shared/valuationEnsemble.ts";
import { computeUncertainty } from "../_shared/valuationUncertainty.ts";

type RequestBody = {
  deal_id: string;
  posture?: "conservative" | "base" | "aggressive";
  force_refresh?: boolean;
  eval_tags?: string[];
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
  const evalTags = Array.isArray(body.eval_tags)
    ? body.eval_tags
        .filter((t) => typeof t === "string")
        .map((t) => (t as string).trim())
        .filter((t) => t.length > 0)
    : [];

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
    const sortedComps = sortCompsDeterministic(rawComps as any[]);
    const subjectResolved = (snapshot.raw as any)?.subject_property_resolved ?? null;

    const concessionsConfig = (valuationPolicy as any)?.concessions ?? {};
    const conditionConfig = (valuationPolicy as any)?.condition ?? {};
    const ensembleConfig = (valuationPolicy as any)?.ensemble ?? {};
    const ceilingConfig = (valuationPolicy as any)?.ceiling ?? {};
    const uncertaintyConfig = (valuationPolicy as any)?.uncertainty ?? {};
    const concessionsEnabled = concessionsConfig?.enabled === true;
    const conditionEnabled = conditionConfig?.enabled === true;
    const ensembleEnabled = ensembleConfig?.enabled === true;
    const uncertaintyEnabled = uncertaintyConfig?.enabled === true;

    const { data: overrideRows, error: overrideError } = await supabase
      .from("valuation_comp_overrides")
      .select("comp_id, comp_kind, seller_credit_pct, seller_credit_usd, condition_adjustment_usd, notes")
      .eq("org_id", deal.org_id)
      .eq("deal_id", deal.id)
      .order("comp_kind", { ascending: true })
      .order("comp_id", { ascending: true });

    if (overrideError) {
      console.error("[v1-valuation-run] overrides fetch error", overrideError);
      throw new Error("overrides_fetch_failed");
    }

    const overrides = Array.isArray(overrideRows)
      ? overrideRows.map((o) => ({
          comp_id: o.comp_id ?? "",
          comp_kind: o.comp_kind ?? "",
          seller_credit_pct: safeNumber(o.seller_credit_pct),
          seller_credit_usd: safeNumber(o.seller_credit_usd),
          condition_adjustment_usd: safeNumber(o.condition_adjustment_usd),
          notes: typeof o.notes === "string" ? o.notes : "",
        }))
      : [];

    const overridesForHash = overrides.map((o) => ({
      comp_id: o.comp_id ?? "",
      comp_kind: o.comp_kind ?? "",
      seller_credit_pct: o.seller_credit_pct,
      seller_credit_usd: o.seller_credit_usd,
      condition_adjustment_usd: o.condition_adjustment_usd,
      notes: o.notes ?? "",
    }));
    const overrides_hash = await stableHash({ overrides: overridesForHash });

    const overridesMap = new Map<string, (typeof overrides)[number]>();
    for (const o of overrides) {
      const key = `${o.comp_kind ?? ""}::${o.comp_id ?? ""}`;
      overridesMap.set(key, o);
    }

    const precedence = concessionsConfig?.precedence === "pct_over_usd" ? "pct_over_usd" : "usd_over_pct";
    const thresholdPct = safeNumber(concessionsConfig?.threshold_pct) ?? 0.03;
    const reactionFactor = safeNumber(concessionsConfig?.reaction_factor) ?? 1.0;

    const applyOverridesToComp = (comp: any) => {
      if (!concessionsEnabled && !conditionEnabled) return comp;
      const compId = comp?.id?.toString?.() ?? "";
      const compKind = comp?.comp_kind ?? "";
      const key = `${compKind}::${compId}`;
      const override = overridesMap.get(key);
      if (!override) return comp;

      const updated = { ...comp };

      if (concessionsEnabled) {
        const basePrice = safeNumber(updated.price_adjusted) ?? safeNumber(updated.price);
        const usdRaw = override.seller_credit_usd;
        const pctRaw = override.seller_credit_pct;
        const pctEligible = pctRaw != null && pctRaw >= thresholdPct;
        const usdAmount = usdRaw != null ? usdRaw * reactionFactor : null;
        const pctAmount = pctEligible && basePrice != null ? basePrice * pctRaw! * reactionFactor : null;
        let appliedAmount: number | null = null;
        let method: "usd" | "pct" | null = null;
        if (precedence === "usd_over_pct") {
          if (usdAmount != null) {
            appliedAmount = usdAmount;
            method = "usd";
          } else if (pctAmount != null) {
            appliedAmount = pctAmount;
            method = "pct";
          }
        } else {
          if (pctAmount != null) {
            appliedAmount = pctAmount;
            method = "pct";
          } else if (usdAmount != null) {
            appliedAmount = usdAmount;
            method = "usd";
          }
        }

        if (appliedAmount != null && basePrice != null) {
          const priceBefore = basePrice;
          const priceAfter = Math.max(0, priceBefore - appliedAmount);
          updated.price = priceAfter;
          (updated as any).price_adjusted = priceAfter;
          (updated as any)._override_concessions = {
            applied: true,
            method,
            seller_credit_pct: pctRaw,
            seller_credit_usd: usdRaw,
            threshold_pct: thresholdPct,
            reaction_factor: reactionFactor,
            amount_usd_applied: appliedAmount,
            price_before: priceBefore,
            price_after: priceAfter,
            notes: override.notes ?? "",
            source: "manual_override",
          };
        }
      }

      if (conditionEnabled) {
        const condAmount = override.condition_adjustment_usd;
        if (condAmount != null) {
          (updated as any)._override_condition = {
            amount_usd: condAmount,
            source: "manual_override",
            notes: override.notes ?? "",
          };
        }
      }

      return updated;
    };

    const comps = sortedComps.map((c) => applyOverridesToComp(c));

    const buildSubject = () => ({
      sqft: safeNumber(subjectResolved?.sqft) ?? null,
      beds: safeNumber(subjectResolved?.beds) ?? null,
      baths: safeNumber(subjectResolved?.baths) ?? null,
      year_built: safeNumber(subjectResolved?.year_built) ?? null,
      lot_sqft: safeNumber((subjectResolved as any)?.lot_sqft) ?? null,
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

    const marketAdjustment = await applyMarketTimeAdjustment({
      supabase,
      orgId: deal.org_id,
      dealState: deal.state,
      comps: closedComps as any[],
      asOf: snapshot.as_of,
      policy: (valuationPolicy as any)?.market_time_adjustment,
      cache: new Map(),
    });

    const closedSelection = runValuationSelection({
      subject: buildSubject(),
      comps: marketAdjustment.comps as any[],
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

    const subjectSources = Array.isArray((snapshot.raw as any)?.subject_sources)
      ? ((snapshot.raw as any).subject_sources as unknown[])
          .map((s) => (typeof s === "string" ? s : null))
          .filter((s): s is string => !!s)
      : [];

    const warningCodes: string[] = [...(selection.warning_codes ?? []), ...(marketAdjustment.warning_codes ?? [])];
    if (!hasClosed && listingSelection) {
      warningCodes.push("insufficient_closed_sales_comps", "listing_based_comps_only");
    }
    if ((snapshot.raw as any)?.closed_sales_fetch_failed) {
      warningCodes.push("closed_sales_fetch_failed");
    }
    const warningCodesSorted = Array.from(new Set(warningCodes)).sort();

    const avmPrice = (snapshot.market as any)?.avm_price ?? null;
    const avmLow = (snapshot.market as any)?.avm_price_range_low ?? null;
    const avmHigh = (snapshot.market as any)?.avm_price_range_high ?? null;

    const compsUsed = selection.selected_comps ?? [];
    let selectedCompsForOutput = compsUsed;
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

    const adjustmentsConfig = (valuationPolicy as any)?.adjustments ?? null;
    const adjustmentsEnabled = adjustmentsConfig?.enabled === true;

    let suggestedArv = selection.suggested_arv ?? null;
    if (adjustmentsEnabled) {
      const subjectForAdjustments = {
        ...buildSubject(),
      };
      const adjustedComps = (selection.selected_comps ?? []).map((comp) => {
        const adjusted = buildCompAdjustedValue({
          subject: subjectForAdjustments,
          comp,
          policy: adjustmentsConfig,
          asOf: snapshot.as_of ?? null,
        });
        return {
          ...comp,
          time_adjusted_price: adjusted.time_adjusted_price,
          value_basis_before_adjustments: adjusted.value_basis_before_adjustments,
          value_basis_method: adjusted.value_basis_method,
          adjusted_value: adjusted.adjusted_value,
          adjustments: adjusted.adjustments,
        };
      });
      selectedCompsForOutput = adjustedComps;

      const samples = adjustedComps
        .map((comp, idx) => {
          const val = safeNumber((comp as any)?.adjusted_value);
          if (val == null) return null;
          const weight = safeNumber((comp as any)?.score) ?? 1;
          const id =
            typeof (comp as any)?.id === "string" && (comp as any).id.trim().length > 0
              ? (comp as any).id
              : `comp-${idx}`;
          return { value: val, weight, id };
        })
        .filter((s): s is { value: number; weight: number; id: string } => !!s);

      const adjustedMedian = weightedMedianDeterministic(
        samples,
        Number.isInteger(adjustmentsConfig?.rounding?.cents ?? null)
          ? Number(adjustmentsConfig?.rounding?.cents)
          : 2,
      );
      if (adjustedMedian != null) {
        suggestedArv = adjustedMedian;
      }
    }

    const ensembleResult = ensembleEnabled
      ? computeEnsemble({
          compEstimate: suggestedArv ?? null,
          compCount: compCount,
          avmEstimate: avmPrice ?? null,
          listingComps,
          ensembleConfig,
          ceilingConfig,
        })
      : null;

    if (ensembleResult?.value != null) {
      suggestedArv = ensembleResult.value;
    }

    const ladderRaw = (snapshot.raw as any)?.closed_sales ?? {};
    const ladderStages = Array.isArray(ladderRaw?.stages)
      ? ladderRaw.stages
          .map((s: any) => (typeof s === "string" ? s : s?.name ?? null))
          .filter((s: any): s is string => typeof s === "string")
      : [];
    const marketAdjustmentWarnings = Array.from(new Set(marketAdjustment.warning_codes ?? [])).sort();

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
      market_time_adjustment: {
        ...(marketAdjustment.summary ?? {}),
        warning_codes: marketAdjustmentWarnings,
      },
      closed_attempt: closedSelection?.selection_summary ?? null,
      listing_attempt: listingSelection?.selection_summary ?? null,
      active_attempt: hasClosed ? "closed_sale" : listingSelection ? "sale_listing" : null,
    };

    const ensembleWeightsForUncertainty = ensembleResult?.weights ?? null;
    const uncertaintyResult = uncertaintyEnabled
      ? computeUncertainty({
          comps: selectedCompsForOutput ?? [],
          suggestedArv: suggestedArv ?? null,
          avmRangeLow: avmLow ?? null,
          avmRangeHigh: avmHigh ?? null,
          ensembleWeights: ensembleWeightsForUncertainty,
          config: uncertaintyConfig ?? {},
        })
      : null;

    const confidence = computeValuationConfidence({
      suggested_arv: suggestedArv,
      suggested_arv_range_low: selection.suggested_arv_range_low,
      suggested_arv_range_high: selection.suggested_arv_range_high,
      comp_kind_used: selection.comp_kind_used ?? null,
      comp_count_used: compCount,
      min_closed_comps_required: Number(minClosedComps),
      median_correlation: stats.median_correlation,
      selection_summary: selectionSummary,
      warning_codes: warningCodesSorted,
      snapshot_stub: snapshot.stub,
      confidence_rubric: (valuationPolicy as any)?.confidence_rubric,
    });
    const valuationConfidence: "A" | "B" | "C" = confidence.grade;

    const failureReasons: string[] = [];
    if (suggestedArv == null) {
      failureReasons.push("missing_suggested_arv");
    }

    const status = failureReasons.length === 0 ? "succeeded" : "failed";
    const failureReason = failureReasons.length > 0 ? failureReasons.join("; ") : null;
    const includeOverridesInHash = concessionsEnabled || conditionEnabled;
    const includeEnsembleUncertaintyInHash = ensembleEnabled || uncertaintyEnabled;

    const ensembleHashSummary = ensembleEnabled
      ? {
          ensemble_enabled: true,
          ensemble_version: ensembleConfig?.version ?? "ensemble_v1",
          ensemble_weights: {
            comps: safeNumber(ensembleConfig?.weights?.comps) ?? 0.7,
            avm: safeNumber(ensembleConfig?.weights?.avm) ?? 0.3,
          },
          max_avm_weight: safeNumber(ensembleConfig?.max_avm_weight) ?? null,
          min_comps_for_avm_blend: safeNumber(ensembleConfig?.min_comps_for_avm_blend) ?? null,
          ceiling_enabled: ceilingConfig?.enabled === true,
          ceiling_method: ceilingConfig?.method ?? null,
          ceiling_max_over_pct: safeNumber(ceilingConfig?.max_over_pct) ?? null,
        }
      : null;

    const uncertaintyHashSummary = uncertaintyEnabled
      ? {
          uncertainty_enabled: true,
          uncertainty_version: uncertaintyConfig?.version ?? "uncertainty_v1",
          uncertainty_method: uncertaintyConfig?.method ?? "weighted_quantiles_v1",
          p_low: safeNumber(uncertaintyConfig?.p_low) ?? 0.1,
          p_high: safeNumber(uncertaintyConfig?.p_high) ?? 0.9,
          min_comps: safeNumber(uncertaintyConfig?.min_comps) ?? 3,
          floor_pct: safeNumber(uncertaintyConfig?.floor_pct) ?? 0.05,
        }
      : null;

    const ensembleUncertaintyHashBlock =
      includeEnsembleUncertaintyInHash && (ensembleHashSummary || uncertaintyHashSummary)
        ? {
            ensemble_config: ensembleHashSummary,
            uncertainty_config: uncertaintyHashSummary,
          }
        : null;

    const snapshotForHash = {
      address_fingerprint: fingerprint,
      provider: snapshot.provider ?? null,
      source: snapshot.source ?? null,
      as_of: snapshot.as_of ?? null,
      window_days: snapshot.window_days ?? null,
      sample_n: snapshot.sample_n ?? null,
      comps: sortedComps,
      market: snapshot.market ?? null,
      raw: snapshot.raw ?? null,
      stub: !!snapshot.stub,
      subject_resolved: subjectResolved,
    };

    const [policyHash, snapshotHash] = await Promise.all([
      stableHash(policyRow.policy_json ?? {}),
      stableHash(snapshotForHash),
    ]);

    const inputPayload = {
      deal_id: deal.id,
      posture,
      address_fingerprint: fingerprint,
      property_snapshot_id: snapshot.id,
      property_snapshot_hash: snapshotHash,
      min_closed_comps_required: minClosedComps,
      policy_version_id: policyRow.id,
      ...(includeOverridesInHash ? { overrides_hash } : {}),
      ...(ensembleUncertaintyHashBlock ? { ensemble_uncertainty_config: ensembleUncertaintyHashBlock } : {}),
    };

    const overridesAppliedCount =
      includeOverridesInHash && Array.isArray(selectedCompsForOutput)
        ? selectedCompsForOutput.filter((comp: any) => {
            const adjustmentsApplied =
              Array.isArray(comp?.adjustments) &&
              comp.adjustments.some(
                (adj: any) => (adj?.type === "concessions" || adj?.type === "condition") && adj?.applied === true,
              );
            const metaApplied =
              !!(comp as any)?._override_concessions?.applied || (comp as any)?._override_condition != null;
            return adjustmentsApplied || metaApplied;
          }).length
        : null;

    let suggestedArvSourceMethod = `selection_v1_1_${valuationPolicy.selection_method ?? "weighted_median_ppsf"}`;
    let suggestedArvBasisValue: "adjusted_v1_2" | "ensemble_v1" | null = null;

    let outputBase: Record<string, unknown> = {
      suggested_arv: suggestedArv ?? null,
      arv_range_low: selection.suggested_arv_range_low ?? null,
      arv_range_high: selection.suggested_arv_range_high ?? null,
      suggested_arv_range_low: selection.suggested_arv_range_low ?? null,
      suggested_arv_range_high: selection.suggested_arv_range_high ?? null,
      selected_comp_ids: selection.selected_comp_ids ?? [],
      selected_comps: selectedCompsForOutput ?? [],
      selection_summary: selectionSummary ?? null,
      avm_reference_price: avmPrice ?? null,
      avm_reference_range_low: avmLow ?? null,
      avm_reference_range_high: avmHigh ?? null,
      suggested_arv_source_method: suggestedArvSourceMethod,
      suggested_arv_comp_kind_used: selection.comp_kind_used ?? null,
      suggested_arv_comp_count_used: compCount ?? null,
      confidence_details: confidence,
      as_is_value: null,
      valuation_confidence: valuationConfidence,
      comp_count: compCount,
      comp_set_stats: stats,
      warnings: warningCodesSorted,
      warning_codes: warningCodesSorted,
      messages: failureReason ? [failureReason] : [],
      subject_sources: subjectSources,
    };

    if (includeOverridesInHash) {
      outputBase = {
        ...outputBase,
        overrides_hash,
        overrides_applied_count: overridesAppliedCount ?? 0,
      };
    }

    if (adjustmentsEnabled) {
      suggestedArvBasisValue = "adjusted_v1_2";
      outputBase = {
        ...outputBase,
        suggested_arv_basis: suggestedArvBasisValue,
        adjustments_version: adjustmentsConfig?.version ?? "selection_v1_2",
        selected_comps: selectedCompsForOutput ?? [],
        suggested_arv: suggestedArv ?? null,
      };
    }

    if (ensembleEnabled && ensembleResult) {
      suggestedArvBasisValue = "ensemble_v1";
      suggestedArvSourceMethod = "ensemble_v1";
      outputBase = {
        ...outputBase,
        suggested_arv: ensembleResult.value ?? suggestedArv ?? null,
        suggested_arv_basis: suggestedArvBasisValue,
        suggested_arv_source_method: suggestedArvSourceMethod,
        ensemble_version: ensembleResult.version ?? "ensemble_v1",
        ensemble_weights: ensembleResult.weights,
        ensemble_comp_estimate: ensembleResult.comp_estimate,
        ensemble_avm_estimate: ensembleResult.avm_estimate,
        ensemble_cap_value: ensembleResult.cap_value,
        ensemble_cap_applied: ensembleResult.cap_applied,
      };
    }

    if (uncertaintyEnabled && uncertaintyResult) {
      outputBase = {
        ...outputBase,
        uncertainty_version: uncertaintyResult.version ?? "uncertainty_v1",
        uncertainty_method: uncertaintyResult.method ?? "weighted_quantiles_v1",
        uncertainty_range_low: uncertaintyResult.range_low,
        uncertainty_range_high: uncertaintyResult.range_high,
        uncertainty_range_pct: uncertaintyResult.range_pct,
      };
    }

    if (evalTags.length > 0) {
      (outputBase as any).eval_tags = evalTags;
    }

    const outputForHash = {
      ...outputBase,
      policy_hash: policyHash,
      snapshot_hash: snapshotHash,
      subject_sources: subjectSources,
    };

    const output_hash = await stableHash(outputForHash);

    const outputPayload = {
      ...outputForHash,
      output_hash,
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

    const input_hash = await stableHash(inputPayload);
    const run_hash = await stableHash({ input_hash, output_hash, policy_hash: policyHash });

    const existing = await supabase
      .from("valuation_runs")
      .select("*")
      .eq("org_id", deal.org_id)
      .eq("deal_id", deal.id)
      .eq("posture", posture)
      .eq("input_hash", input_hash)
      .eq("policy_hash", policyHash)
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
        policy_hash: policyHash,
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
