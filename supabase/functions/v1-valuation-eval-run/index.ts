import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import { canonicalJson } from "../_shared/contracts.ts";
import { stableHash } from "../_shared/determinismHash.ts";

type RequestBody = {
  dataset_name?: string;
  posture?: string | null;
  limit?: number | null;
  org_id?: string | null;
  force?: boolean | null;
};

type GroundTruthRow = {
  id: string;
  org_id: string;
  deal_id: string | null;
  realized_price: unknown;
  realized_date: string | null;
};

type DealRow = {
  id: string;
  org_id: string;
  payload: Record<string, unknown> | null;
};

type ValuationRunRow = {
  id: string;
  org_id: string;
  deal_id: string;
  posture?: string | null;
  output: Record<string, unknown> | null;
  policy_hash?: string | null;
  created_at?: string | null;
};

type EvalCase = {
  deal_id: string;
  valuation_run_id: string | null;
  predicted_arv: number | null;
  realized_price: number | null;
  abs_error: number | null;
  pct_error: number | null;
  confidence_grade: string | null;
  comp_kind_used: string | null;
  in_range: boolean | null;
  range_source: "uncertainty" | "selection" | null;
  range_low: number | null;
  range_high: number | null;
  range_pct: number | null;
  uncertainty_range_low: number | null;
  uncertainty_range_high: number | null;
  uncertainty_range_pct: number | null;
};

const MANAGER_ROLES = ["owner", "vp", "manager"];

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const average = (vals: number[]): number | null => {
  if (!vals.length) return null;
  const sum = vals.reduce((acc, v) => acc + v, 0);
  return sum / vals.length;
};

function pickValuationRun(
  dealId: string,
  preferredRunId: string | null,
  runsByDeal: Map<string, ValuationRunRow[]>,
  posture: string | null,
): ValuationRunRow | null {
  const runs = runsByDeal.get(dealId) ?? [];
  if (preferredRunId) {
    const exact = runs.find((r) => r.id === preferredRunId);
    if (exact) return exact;
  }
  if (posture) {
    const byPosture = runs.find((r) => (r.posture ?? "") === posture);
    if (byPosture) return byPosture;
  }
  return runs.length > 0 ? runs[0] : null;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method === "GET") {
    return jsonResponse(req, {
      ok: true,
      name: "v1-valuation-eval-run",
      ts: new Date().toISOString(),
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

  const datasetName = (body.dataset_name ?? "ground_truth_v1").trim() || "ground_truth_v1";
  const posture = (body.posture ?? "underwrite").trim() || "underwrite";
  const limitRaw = safeNumber(body.limit);
  const limit = limitRaw != null ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;
  const requestedOrgId = body.org_id?.trim() || null;
  const force = body.force === true;

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
  const userId = userData.user.id as string;

  try {
    const { data: memberships, error: memError } = await supabase
      .from("memberships")
      .select("org_id, role")
      .eq("user_id", userId);

    if (memError) {
      console.error("[v1-valuation-eval-run] memberships lookup failed", memError);
      throw new Error("memberships_lookup_failed");
    }

    const membershipRows = (memberships ?? []).filter((m) => !!m?.org_id) as { org_id: string; role?: string | null }[];
    if (membershipRows.length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "membership_missing", message: "User is not a member of any org" },
        403,
      );
    }

    const orgId = requestedOrgId
      ? (() => {
          const match = membershipRows.find((m) => m.org_id === requestedOrgId);
          if (!match) {
            throw new Error("requested_org_forbidden");
          }
          return requestedOrgId;
        })()
      : membershipRows.map((m) => m.org_id).sort()[0];

    const role = membershipRows.find((m) => m.org_id === orgId)?.role?.toLowerCase() ?? "";
    if (!MANAGER_ROLES.includes(role)) {
      return jsonResponse(
        req,
        { ok: false, error: "forbidden", message: "Manager/VP/Owner role required" },
        403,
      );
    }

    const { data: recentEvalRun, error: recentEvalError } = await supabase
      .from("valuation_eval_runs")
      .select("created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!force && !recentEvalError && recentEvalRun?.created_at) {
      const lastTs = Date.parse(recentEvalRun.created_at);
      if (!Number.isNaN(lastTs)) {
        const elapsedMs = Date.now() - lastTs;
        if (elapsedMs >= 0 && elapsedMs < 30_000) {
          return jsonResponse(
            req,
            {
              ok: false,
              error: "rate_limited",
              message: "Too many eval runs; try again in a few seconds or enable bypass.",
              input_hash: null,
            },
            429,
          );
        }
      }
    }

    const { data: gtRows, error: gtError } = await supabase
      .from("valuation_ground_truth")
      .select("id, org_id, deal_id, realized_price, realized_date")
      .eq("org_id", orgId)
      .not("deal_id", "is", null)
      .order("realized_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (gtError) {
      console.error("[v1-valuation-eval-run] ground truth fetch failed", gtError);
      throw new Error("ground_truth_fetch_failed");
    }

    const dealIds = Array.from(
      new Set(
        (gtRows ?? [])
          .map((row) => row.deal_id)
          .filter((id): id is string => !!id),
      ),
    );

    const cases: EvalCase[] = [];
    if (dealIds.length > 0) {
      const { data: dealRows, error: dealError } = await supabase
        .from("deals")
        .select("id, org_id, payload")
        .eq("org_id", orgId)
        .in("id", dealIds);

      if (dealError) {
        console.error("[v1-valuation-eval-run] deal fetch failed", dealError);
        throw new Error("deal_fetch_failed");
      }

      const dealsMap = new Map<string, DealRow>();
      for (const d of dealRows ?? []) {
        dealsMap.set(d.id, d as DealRow);
      }

      const { data: valuationRuns, error: runError } = await supabase
        .from("valuation_runs")
        .select("id, org_id, deal_id, posture, output, policy_hash, created_at")
        .eq("org_id", orgId)
        .in("deal_id", dealIds)
        .order("created_at", { ascending: false });

      if (runError) {
        console.error("[v1-valuation-eval-run] valuation_runs fetch failed", runError);
        throw new Error("valuation_runs_fetch_failed");
      }

      const runsByDeal = new Map<string, ValuationRunRow[]>();
      for (const r of valuationRuns ?? []) {
        const list = runsByDeal.get(r.deal_id) ?? [];
        list.push(r as ValuationRunRow);
        runsByDeal.set(r.deal_id, list);
      }

      for (const gt of gtRows ?? []) {
        if (!gt.deal_id) continue;
        const deal = dealsMap.get(gt.deal_id);
        const preferredRunId =
          (deal as any)?.payload?.market?.arv_valuation_run_id?.toString?.() ??
          null;
        const run = pickValuationRun(gt.deal_id, preferredRunId, runsByDeal, posture);
        const output = (run as any)?.output ?? {};
        const predicted = safeNumber((output as any)?.suggested_arv);
        const realized = safeNumber(gt.realized_price);
        const absError = predicted != null && realized != null ? Math.abs(predicted - realized) : null;
        const denom = realized != null && realized !== 0 ? Math.abs(realized) : null;
        const pctError = absError != null && denom ? absError / denom : null;
        const uncLow = safeNumber((output as any)?.uncertainty_range_low);
        const uncHigh = safeNumber((output as any)?.uncertainty_range_high);
        const uncPct = safeNumber((output as any)?.uncertainty_range_pct);
        const selLow = Coalesce(
          safeNumber((output as any)?.suggested_arv_range_low),
          safeNumber((output as any)?.arv_range_low),
        );
        const selHigh = Coalesce(
          safeNumber((output as any)?.suggested_arv_range_high),
          safeNumber((output as any)?.arv_range_high),
        );
        const rangeSource: "uncertainty" | "selection" | null =
          uncLow != null && uncHigh != null
            ? "uncertainty"
            : selLow != null && selHigh != null
              ? "selection"
              : null;
        const rangeLow = rangeSource === "uncertainty" ? uncLow : rangeSource === "selection" ? selLow : null;
        const rangeHigh = rangeSource === "uncertainty" ? uncHigh : rangeSource === "selection" ? selHigh : null;
        const hasRange = rangeLow != null && rangeHigh != null && realized != null;
        const inRange = hasRange ? realized! >= rangeLow! && realized! <= rangeHigh! : null;
        const rangePct =
          rangeLow != null && rangeHigh != null && predicted != null && predicted !== 0
            ? Math.abs(rangeHigh - rangeLow) / Math.abs(predicted)
            : null;
        const confidenceGrade =
          (output as any)?.valuation_confidence ??
          (output as any)?.confidence_details?.grade ??
          null;
        const compKindUsed = (output as any)?.suggested_arv_comp_kind_used ?? null;

        cases.push({
          deal_id: gt.deal_id,
          valuation_run_id: run?.id ?? null,
          predicted_arv: predicted,
          realized_price: realized,
          abs_error: absError,
          pct_error: pctError,
          confidence_grade: confidenceGrade,
          comp_kind_used: compKindUsed,
          in_range: inRange,
          range_source: rangeSource,
          range_low: rangeLow,
          range_high: rangeHigh,
          range_pct: rangePct,
          uncertainty_range_low: uncLow,
          uncertainty_range_high: uncHigh,
          uncertainty_range_pct: uncPct,
        });
      }
    }

    cases.sort((a, b) => {
      if (a.deal_id === b.deal_id) {
        return (a.valuation_run_id ?? "").localeCompare(b.valuation_run_id ?? "");
      }
      return a.deal_id.localeCompare(b.deal_id);
    });

    const mae = average(
      cases
        .map((c) => c.abs_error)
        .filter((v): v is number => v != null),
    );
    const mape = average(
      cases
        .map((c) => c.pct_error)
        .filter((v): v is number => v != null),
    );
    const inRangeDen = cases.filter((c) => c.in_range !== null).length;
    const inRangeNum = cases.filter((c) => c.in_range === true).length;
    const inRangeRate = inRangeDen > 0 ? inRangeNum / inRangeDen : null;
    const meanRangePct = average(
      cases
        .map((c) => c.range_pct)
        .filter((v): v is number => v != null),
    );
    const rangeSourceOverall = (() => {
      if (cases.some((c) => c.range_source === "uncertainty")) return "uncertainty";
      if (cases.some((c) => c.range_source === "selection")) return "selection";
      return null;
    })();

    const byConfidence: Record<string, unknown> = {};
    const grouped = new Map<string, EvalCase[]>();
    for (const c of cases) {
      const key = (c.confidence_grade ?? "unknown").toString();
      const list = grouped.get(key) ?? [];
      list.push(c);
      grouped.set(key, list);
    }
    for (const [grade, list] of grouped.entries()) {
      const absList = list
        .map((c) => c.abs_error)
        .filter((v): v is number => v != null);
      const pctList = list
        .map((c) => c.pct_error)
        .filter((v): v is number => v != null);
      const inRangeCount = list.filter((c) => c.in_range !== null).length;
      const inRangeTrue = list.filter((c) => c.in_range === true).length;
      const rangePctList = list
        .map((c) => c.range_pct)
        .filter((v): v is number => v != null);
      byConfidence[grade] = {
        count: list.length,
        mae: average(absList),
        mape: average(pctList),
        in_range_rate: inRangeCount > 0 ? inRangeTrue / inRangeCount : null,
        mean_range_pct: average(rangePctList),
      };
    }

    const selectionRule = "deal.market.arv_valuation_run_id || latest_run_by_posture";

    const metrics = {
      count_total: cases.length,
      count_with_ground_truth: cases.filter((c) => c.realized_price != null).length,
      mae,
      mape,
      in_range_rate_overall: inRangeRate,
      range_source_overall: rangeSourceOverall,
      mean_range_pct: meanRangePct,
      by_confidence: byConfidence,
      cases,
    };

    const inputDescriptor = {
      eval_version: "v1",
      dataset_name: datasetName,
      posture,
      limit,
      selection_rule: selectionRule,
      ground_truth_fingerprint: (gtRows ?? []).map((row) => ({
        id: row.id,
        deal_id: row.deal_id,
        realized_price: safeNumber(row.realized_price),
        realized_date: row.realized_date,
      })),
      cases: cases.map((c) => ({
        deal_id: c.deal_id,
        valuation_run_id: c.valuation_run_id,
      })),
    };

    const input_hash = await stableHash(inputDescriptor);

    const { data: existing, error: existingError } = await supabase
      .from("valuation_eval_runs")
      .select("id, metrics, created_at, input_hash")
      .eq("org_id", orgId)
      .eq("input_hash", input_hash)
      .limit(1)
      .maybeSingle();

    if (!existingError && existing) {
      return jsonResponse(
        req,
        {
          ok: true,
          deduped: true,
          eval_run_id: existing.id,
          created_at: existing.created_at,
          metrics: (existing as any)?.metrics ?? null,
          input_hash,
        },
        200,
      );
    }

    const paramsPayload = {
      dataset_name: datasetName,
      posture,
      limit,
      evaluated_at: new Date().toISOString(),
      selection_rule: selectionRule,
      ground_truth_row_count: gtRows?.length ?? 0,
      cases_evaluated: cases.length,
      input_hash,
    };

    const metricsSummary = {
      count_total: metrics.count_total,
      count_with_ground_truth: metrics.count_with_ground_truth,
      mae: metrics.mae,
      mape: metrics.mape,
      in_range_rate_overall: metrics.in_range_rate_overall,
    };
    const output_hash = await stableHash({ input_hash, metrics_summary: metricsSummary });

    const { data: inserted, error: insertError } = await supabase
      .from("valuation_eval_runs")
      .insert({
        org_id: orgId,
        dataset_name: datasetName,
        posture,
        input_hash,
        params: JSON.parse(canonicalJson(paramsPayload)),
        metrics: JSON.parse(canonicalJson(metrics)),
        output_hash,
      })
      .select("id, created_at")
      .maybeSingle();

    if (insertError || !inserted) {
      const uniqueConflict =
        (insertError as any)?.code === "23505" ||
        (insertError as any)?.message?.toLowerCase?.().includes("unique") ||
        (insertError as any)?.details?.toLowerCase?.().includes("idx_valuation_eval_runs_org_input_hash");

      if (uniqueConflict) {
        const { data: existingAfterConflict } = await supabase
          .from("valuation_eval_runs")
          .select("id, metrics, created_at, input_hash")
          .eq("org_id", orgId)
          .eq("input_hash", input_hash)
          .limit(1)
          .maybeSingle();

        if (existingAfterConflict) {
          return jsonResponse(
            req,
            {
              ok: true,
              deduped: true,
              eval_run_id: existingAfterConflict.id,
              created_at: existingAfterConflict.created_at,
              metrics: (existingAfterConflict as any)?.metrics ?? null,
              input_hash,
            },
            200,
          );
        }
      }

      console.error("[v1-valuation-eval-run] insert failed", insertError);
      throw new Error("valuation_eval_run_insert_failed");
    }

    return jsonResponse(
      req,
      {
        ok: true,
        eval_run_id: inserted.id,
        created_at: inserted.created_at,
        metrics,
        input_hash,
      },
      200,
    );
  } catch (err: any) {
    console.error("[v1-valuation-eval-run] error", err);
    const message = err?.message === "requested_org_forbidden"
      ? "User is not a member of the requested org"
      : err?.message ?? "Evaluation run failed";
    const status = err?.message === "requested_org_forbidden" ? 403 : 500;
    return jsonResponse(
      req,
      {
        ok: false,
        error: "valuation_eval_run_error",
        message,
      },
      status,
    );
  }
});
