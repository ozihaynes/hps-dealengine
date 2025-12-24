import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import { buildMarketKeyCandidates, buildValuationBuckets } from "../_shared/valuationBuckets.ts";
import { resolveCalibrationFreezeDecision } from "../_shared/calibrationFreeze.ts";
import { getLatestCalibrationWeightsForMarketCandidates } from "../_shared/valuationCalibrationWeights.ts";
import {
  DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1,
  blendWeightVectorsV1,
  computeWeightsFromBucketRowsV1,
  normalizeContinuousCalibrationConfigV1,
  updateCalibrationBucketRowV1,
  type CalibrationBucketRowV1,
} from "../_shared/continuousCalibration.ts";

type RequestBody = {
  org_id?: string;

  /**
   * Optional: if supplied, we can compute bucket keys from the deal.
   * If omitted, you must provide `bucket`.
   */
  deal_id?: string;

  /**
   * Optional: bypass bucket resolution and provide keys directly.
   * Use when you already computed bucket keys upstream (e.g., eval pipeline).
   */
  bucket?: {
    market_key: string;
    home_band: string;
  };

  ground_truth: {
    /** Actual realized/closed price. */
    actual: number;
    /** ISO timestamp of the ground truth. */
    observed_at?: string;
    /** If true, keep outliers even above cutoff. */
    keep_outliers?: boolean;
  };

  /**
   * Per-strategy estimates for the same deal/ground truth.
   * Example strategies: "comps_v1", "hpi_adjusted_comps", "rentcast_avm".
   */
  strategies: Array<{
    strategy: string;
    estimate: number;
    /** Strategy-level override (keeps even if outlier). */
    keep_outlier?: boolean;
  }>;

  /** Optional override for calibration parameters (defaults are safe). */
  config?: Partial<typeof DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1>;

  /** Optional human note for the published weight version. */
  note?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

serve(async (req: Request) => {
  try {
    const opt = handleOptions(req);
    if (opt) return opt;

    if (req.method !== "POST") {
      return jsonResponse(req, { ok: false, error: "method_not_allowed" }, 405);
    }

    const supabase = createSupabaseClient(req);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return jsonResponse(req, { ok: false, error: "unauthorized" }, 401);
    }

    const bodyRaw = await req.json().catch(() => null);
    if (!isRecord(bodyRaw)) {
      return jsonResponse(req, { ok: false, error: "invalid_json" }, 400);
    }

    const body = bodyRaw as unknown as RequestBody;

    // Resolve org_id: either provided, or default to first membership.
    const orgIdFromBody = asString(body.org_id);

    const { data: memberships, error: membershipsErr } = await supabase
      .from("memberships")
      .select("org_id, role")
      .eq("user_id", user.id);

    if (membershipsErr) {
      return jsonResponse(req, { ok: false, error: "membership_lookup_failed", detail: membershipsErr.message }, 500);
    }

    if (!memberships || memberships.length === 0) {
      return jsonResponse(req, { ok: false, error: "no_membership" }, 403);
    }

    const membership = orgIdFromBody
      ? memberships.find((m) => m.org_id === orgIdFromBody)
      : memberships[0];

    if (!membership) {
      return jsonResponse(req, { ok: false, error: "membership_not_found_for_org" }, 403);
    }

    const orgId = membership.org_id;

    // Only privileged roles can write to calibration tables (RLS also enforces).
    if (!["manager", "vp", "owner"].includes(membership.role)) {
      return jsonResponse(req, { ok: false, error: "forbidden_role" }, 403);
    }

    const actual = asNumber(body.ground_truth?.actual);
    if (actual == null || actual <= 0) {
      return jsonResponse(req, { ok: false, error: "invalid_ground_truth_actual" }, 400);
    }

    const observedAt = asString(body.ground_truth?.observed_at) ?? undefined;
    const keepOutliers = Boolean(body.ground_truth?.keep_outliers);

    const strategies = Array.isArray(body.strategies) ? body.strategies : [];
    if (strategies.length < 2) {
      return jsonResponse(req, { ok: false, error: "need_at_least_two_strategies" }, 400);
    }

    const now = new Date();

    // Normalize config with strategy count.
    const cfg = normalizeContinuousCalibrationConfigV1(body.config ?? null, { strategyCount: strategies.length });

    // Resolve bucket keys.
    let marketKey: string | null = asString(body.bucket?.market_key);
    let homeBand: string | null = asString(body.bucket?.home_band);
    let marketCandidates: string[] = [];

    if (!marketKey || !homeBand) {
      const dealId = asString(body.deal_id);
      if (!dealId) {
        return jsonResponse(req, { ok: false, error: "missing_bucket_and_deal_id" }, 400);
      }

      // Best-effort deal lookup (schema may evolve; keep the select minimal).
      const { data: dealRow, error: dealErr } = await supabase
        .from("deals")
        .select("id, org_id, zip, county, msa, payload")
        .eq("id", dealId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (dealErr) {
        return jsonResponse(req, { ok: false, error: "deal_lookup_failed", detail: dealErr.message }, 500);
      }
      if (!dealRow) {
        return jsonResponse(req, { ok: false, error: "deal_not_found" }, 404);
      }

      const payload = (dealRow as any).payload ?? {};
      const propertyType = payload.property_type ?? payload.propertyType ?? payload.type ?? null;

      const sqft = payload.sqft ?? payload.gba ?? payload.gross_building_area ?? null;
      const beds = payload.beds ?? payload.bedrooms ?? null;
      const baths = payload.baths ?? payload.bathrooms ?? null;
      const yearBuilt = payload.year_built ?? payload.yearBuilt ?? null;

      const marketInput = {
        zip: dealRow.zip ?? payload.zip ?? null,
        county: (dealRow as any).county ?? payload.county ?? null,
        msa: (dealRow as any).msa ?? payload.msa ?? null,
      };
      const buckets = buildValuationBuckets({
        market: {
          zip: marketInput.zip,
          county: marketInput.county,
          msa: marketInput.msa,
        },
        home: {
          property_type: propertyType,
          sqft,
          beds,
          baths,
          year_built: yearBuilt,
        },
      });

      marketKey = buckets.market.key;
      homeBand = buckets.home.band;
      marketCandidates = buildMarketKeyCandidates(marketInput);
    }

    if (!marketKey || !homeBand) {
      return jsonResponse(req, { ok: false, error: "bucket_resolution_failed" }, 400);
    }

    if (marketCandidates.length === 0) {
      const fallback = ["market_unknown"];
      if (marketKey !== "market_unknown") fallback.unshift(marketKey);
      marketCandidates = fallback;
    }

    const { data: freezeRow, error: freezeErr } = await supabase
      .from("valuation_calibration_freezes")
      .select("is_frozen, reason")
      .eq("org_id", orgId)
      .eq("market_key", marketKey)
      .eq("is_frozen", true)
      .maybeSingle();

    if (freezeErr) {
      return jsonResponse(
        req,
        {
          ok: true,
          published: false,
          reason: "freeze_lookup_failed",
          detail: freezeErr.message,
          bucket: { market_key: marketKey, home_band: homeBand },
        },
        200,
      );
    }

    const freezeDecision = resolveCalibrationFreezeDecision(marketKey, freezeRow ?? null);
    if (freezeDecision.frozen) {
      return jsonResponse(
        req,
        {
          ok: true,
          published: false,
          reason: freezeDecision.reason,
          bucket: { market_key: marketKey, home_band: homeBand },
        },
        200,
      );
    }

    const strategyNames = strategies
      .map((s) => asString(s.strategy))
      .filter((s): s is string => Boolean(s));

    if (strategyNames.length < 2) {
      return jsonResponse(req, { ok: false, error: "invalid_strategy_names" }, 400);
    }
    const requiredStrategies = Array.from(new Set(strategyNames)).sort((a, b) => a.localeCompare(b));

    // Fetch any existing per-strategy bucket rows in one query.
    const { data: existingRowsRaw, error: existingErr } = await supabase
      .from("valuation_calibration_buckets")
      .select("strategy, n, mae, mape, mae_norm, median_arv, score_ema")
      .eq("org_id", orgId)
      .eq("market_key", marketKey)
      .eq("home_band", homeBand)
      .in("strategy", strategyNames);

    if (existingErr) {
      return jsonResponse(req, { ok: false, error: "bucket_fetch_failed", detail: existingErr.message }, 500);
    }

    const existingMap = new Map<string, CalibrationBucketRowV1>();
    for (const r of (existingRowsRaw ?? []) as any[]) {
      existingMap.set(r.strategy, {
        strategy: r.strategy,
        n: Number(r.n ?? 0),
        mae: r.mae == null ? null : Number(r.mae),
        mape: r.mape == null ? null : Number(r.mape),
        mae_norm: r.mae_norm == null ? null : Number(r.mae_norm),
        median_arv: r.median_arv == null ? null : Number(r.median_arv),
        score_ema: r.score_ema == null ? null : Number(r.score_ema),
      });
    }

    let droppedOutliers = 0;
    const updatedRows: Array<Required<CalibrationBucketRowV1>> = [];

    for (const s of strategies) {
      const strategy = asString(s.strategy);
      const estimate = asNumber(s.estimate);
      if (!strategy || estimate == null) continue;

      const res = updateCalibrationBucketRowV1(
        existingMap.get(strategy) ?? null,
        {
          strategy,
          estimate,
          actual,
          observed_at: observedAt,
          keep_outlier: keepOutliers || Boolean(s.keep_outlier),
        },
        cfg,
        now,
      );

      if (!res.ok) {
        if (res.reason === "Outlier (MAPE cutoff)") droppedOutliers += 1;
        continue;
      }

      updatedRows.push(res.updated);
    }

    if (updatedRows.length < 2) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "no_valid_strategy_updates",
          detail: "All strategies were filtered (stale/outlier/invalid).",
          dropped_outliers: droppedOutliers,
        },
        400,
      );
    }

    // Upsert updated bucket rows (RLS-protected).
    const upsertPayload = updatedRows.map((r) => ({
      org_id: orgId,
      market_key: marketKey,
      home_band: homeBand,
      strategy: r.strategy,
      n: r.n,
      mae: r.mae,
      mape: r.mape,
      mae_norm: r.mae_norm,
      median_arv: r.median_arv,
      score_ema: r.score_ema,
      updated_at: now.toISOString(),
    }));

    const { data: bucketRowsAfter, error: upsertErr } = await supabase
      .from("valuation_calibration_buckets")
      .upsert(upsertPayload, { onConflict: "org_id,market_key,home_band,strategy" })
      .select("strategy, n, mae, mape, mae_norm, median_arv, score_ema");

    if (upsertErr) {
      return jsonResponse(req, { ok: false, error: "bucket_upsert_failed", detail: upsertErr.message }, 500);
    }

    const bucketRows: CalibrationBucketRowV1[] = ((bucketRowsAfter ?? []) as any[]).map((r) => ({
      strategy: r.strategy,
      n: Number(r.n ?? 0),
      mae: r.mae == null ? null : Number(r.mae),
      mape: r.mape == null ? null : Number(r.mape),
      mae_norm: r.mae_norm == null ? null : Number(r.mae_norm),
      median_arv: r.median_arv == null ? null : Number(r.median_arv),
      score_ema: r.score_ema == null ? null : Number(r.score_ema),
    }));

    const minN = Math.min(...bucketRows.map((r) => Math.max(0, Math.floor(r.n ?? 0))));
    if (!Number.isFinite(minN)) {
      return jsonResponse(req, { ok: false, error: "invalid_sample_counts" }, 500);
    }

    if (minN < cfg.min_samples_per_strategy) {
      return jsonResponse(
        req,
        {
          ok: true,
          published: false,
          reason: "insufficient_samples_per_strategy",
          min_n: minN,
          bucket: { market_key: marketKey, home_band: homeBand },
          dropped_outliers: droppedOutliers,
          bucket_rows: bucketRows,
        },
        200,
      );
    }

    const { weights: bucketWeights, scores } = computeWeightsFromBucketRowsV1(bucketRows, cfg);
    const missingBucketWeights = requiredStrategies.filter((s) => bucketWeights[s] == null);
    if (missingBucketWeights.length > 0) {
      return jsonResponse(
        req,
        {
          ok: true,
          published: false,
          reason: "missing_bucket_weights",
          missing: missingBucketWeights,
          bucket: { market_key: marketKey, home_band: homeBand },
          dropped_outliers: droppedOutliers,
          bucket_rows: bucketRows,
        },
        200,
      );
    }

    let weightsToPublish: Record<string, number> = bucketWeights;
    let blended = false;
    let blendParentMarketKey: string | null = null;
    let blendParentVersion: number | null = null;
    let blendParentSource: "published" | "equal_weights" = "equal_weights";

    if (minN < cfg.min_samples) {
      const parentCandidates = marketCandidates.filter((k) => k !== marketKey);
      const parentResult = parentCandidates.length > 0
        ? await getLatestCalibrationWeightsForMarketCandidates({
          supabase,
          orgId,
          marketKeys: parentCandidates,
          homeBand,
          requiredStrategies,
        })
        : { ok: false, reason: "no_parent_candidates" };

      let parentWeights: Record<string, number> | null = null;

      if (parentResult.ok) {
        blendParentMarketKey = parentResult.marketKey;
        blendParentVersion = parentResult.version;
        blendParentSource = "published";
        parentWeights = Object.fromEntries(parentResult.weights.map((w) => [w.strategy, w.weight]));
      } else {
        blendParentMarketKey = parentCandidates[0] ?? "market_unknown";
        const equal = 1 / requiredStrategies.length;
        parentWeights = Object.fromEntries(requiredStrategies.map((s) => [s, equal]));
      }

      const blendedResult = blendWeightVectorsV1(requiredStrategies, bucketWeights, parentWeights, cfg);
      if (!blendedResult.ok) {
        return jsonResponse(
          req,
          {
            ok: true,
            published: false,
            reason: `blend_failed:${blendedResult.reason}`,
            bucket: { market_key: marketKey, home_band: homeBand },
            dropped_outliers: droppedOutliers,
            bucket_rows: bucketRows,
          },
          200,
        );
      }

      weightsToPublish = blendedResult.weights;
      blended = true;
    }

    const baseNote = asString(body.note) ?? "continuous_calibration_v1";
    const note = blended
      ? `${baseNote} blended_parent:${blendParentMarketKey ?? "market_unknown"} gamma:${cfg.gamma} min_n:${minN}`
      : baseNote;

    const { data: publishedVersion, error: publishErr } = await supabase.rpc(
      "publish_valuation_weights",
      {
        p_org_id: orgId,
        p_market_key: marketKey,
        p_home_band: homeBand,
        p_weights: weightsToPublish,
        p_note: note,
        p_effective_at: now.toISOString(),
      },
    );

    if (publishErr) {
      return jsonResponse(req, { ok: false, error: "weights_publish_failed", detail: publishErr.message }, 500);
    }

    const nextVersion = Number(publishedVersion);
    if (!Number.isFinite(nextVersion) || nextVersion <= 0) {
      return jsonResponse(
        req,
        { ok: false, error: "weights_publish_failed", detail: "invalid_version_returned" },
        500,
      );
    }

    return jsonResponse(
      req,
      {
        ok: true,
        published: true,
        version: nextVersion,
        bucket: { market_key: marketKey, home_band: homeBand },
        dropped_outliers: droppedOutliers,
        min_n: minN,
        scores,
        weights: weightsToPublish,
        ...(blended
          ? {
              blended: true,
              blend_parent_market_key: blendParentMarketKey,
              blend_parent_version: blendParentVersion,
              blend_parent_source: blendParentSource,
              blend_gamma: cfg.gamma,
            }
          : {}),
      },
      200,
    );
  } catch (e) {
    return jsonResponse(req, { ok: false, error: "internal_error", detail: (e as Error).message }, 500);
  }
});
