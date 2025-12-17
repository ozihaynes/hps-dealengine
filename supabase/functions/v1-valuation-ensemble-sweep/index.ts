import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";

type RequestBody = {
  eval_run_id?: string;
  org_id?: string | null;
  step?: number | null;
  apply_cap?: boolean | null;
};

type EvalRunRow = {
  id: string;
  org_id: string;
  metrics: Record<string, unknown> | null;
};

type CaseRow = {
  deal_id: string;
  valuation_run_id: string | null;
  realized_price: unknown;
};

type ValuationRunRow = {
  id: string;
  org_id: string;
  output: Record<string, unknown> | null;
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
  return vals.reduce((acc, v) => acc + v, 0) / vals.length;
};

function clampStep(raw: number | null): number {
  if (raw == null || !Number.isFinite(raw)) return 0.05;
  const s = Math.max(0.01, Math.min(1, raw));
  return Math.round(s * 1000) / 1000;
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

  const evalRunId = body.eval_run_id?.trim();
  if (!evalRunId) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "eval_run_id is required" },
      400,
    );
  }

  const step = clampStep(safeNumber(body.step));
  const applyCap = body.apply_cap === true;

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
      console.error("[v1-valuation-ensemble-sweep] memberships lookup failed", memError);
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

    const requestedOrgId = body.org_id?.trim() || null;
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

    const { data: evalRun, error: evalError } = await supabase
      .from("valuation_eval_runs")
      .select("id, org_id, metrics")
      .eq("id", evalRunId)
      .maybeSingle();

    if (evalError || !evalRun) {
      console.error("[v1-valuation-ensemble-sweep] eval run fetch failed", evalError);
      return jsonResponse(
        req,
        { ok: false, error: "eval_run_not_found", message: "Evaluation run not found" },
        404,
      );
    }

    if (evalRun.org_id !== orgId) {
      return jsonResponse(
        req,
        { ok: false, error: "forbidden", message: "Eval run does not belong to this org" },
        403,
      );
    }

    const casesRaw = Array.isArray((evalRun.metrics as any)?.cases) ? ((evalRun.metrics as any).cases as unknown[]) : [];
    const cases: CaseRow[] = casesRaw
      .map((c: any) => ({
        deal_id: c?.deal_id,
        valuation_run_id: c?.valuation_run_id ?? null,
        realized_price: c?.realized_price ?? null,
      }))
      .filter((c): c is CaseRow => !!c.deal_id);

    const valuationRunIds = Array.from(
      new Set(
        cases
          .map((c) => c.valuation_run_id)
          .filter((id): id is string => !!id),
      ),
    );

    const runsById = new Map<string, ValuationRunRow>();
    if (valuationRunIds.length > 0) {
      const { data: runRows, error: runError } = await supabase
        .from("valuation_runs")
        .select("id, org_id, output")
        .eq("org_id", orgId)
        .in("id", valuationRunIds);

      if (runError) {
        console.error("[v1-valuation-ensemble-sweep] valuation_runs fetch failed", runError);
        throw new Error("valuation_runs_fetch_failed");
      }

      for (const r of runRows ?? []) {
        runsById.set(r.id, r as ValuationRunRow);
      }
    }

    const weights: number[] = [];
    for (let w = 0; w <= 1 + 1e-9; w += step) {
      const rounded = Math.min(1, Math.max(0, Math.round(w * 1000) / 1000));
      if (!weights.includes(rounded)) weights.push(rounded);
    }
    if (!weights.includes(1)) weights.push(1);
    weights.sort((a, b) => a - b);

    const sortedCases = [...cases].sort((a, b) => {
      if (a.deal_id === b.deal_id) {
        return (a.valuation_run_id ?? "").localeCompare(b.valuation_run_id ?? "");
      }
      return a.deal_id.localeCompare(b.deal_id);
    });

    const results = weights.map((w) => {
      const absErrors: number[] = [];
      const pctErrors: number[] = [];

      for (const c of sortedCases) {
        const run = c.valuation_run_id ? runsById.get(c.valuation_run_id) : null;
        const output = (run as any)?.output ?? {};
        const compEst = safeNumber((output as any)?.ensemble_comp_estimate);
        const avmEstRaw = safeNumber((output as any)?.ensemble_avm_estimate);
        const avmEst = avmEstRaw ?? compEst;
        const capVal = safeNumber((output as any)?.ensemble_cap_value);
        if (compEst == null || avmEst == null) continue;

        let predicted = (1 - w) * compEst + w * avmEst;
        if (applyCap && capVal != null) {
          predicted = Math.min(predicted, capVal);
        }

        const realized = safeNumber(c.realized_price);
        if (realized == null) continue;
        const absErr = Math.abs(predicted - realized);
        const denom = Math.abs(realized);
        absErrors.push(absErr);
        if (denom > 0) {
          pctErrors.push(absErr / denom);
        }
      }

      return {
        avm_weight: w,
        mae: average(absErrors),
        mape: average(pctErrors),
        count: Math.max(absErrors.length, pctErrors.length),
      };
    });

    const bestByMae = results
      .filter((r) => r.mae != null)
      .sort((a, b) => (a.mae ?? Infinity) - (b.mae ?? Infinity))[0] ?? null;
    const bestByMape = results
      .filter((r) => r.mape != null)
      .sort((a, b) => (a.mape ?? Infinity) - (b.mape ?? Infinity))[0] ?? null;

    return jsonResponse(
      req,
      {
        ok: true,
        eval_run_id: evalRunId,
        step,
        apply_cap: applyCap,
        results,
        best_by_mae: bestByMae,
        best_by_mape: bestByMape,
      },
      200,
    );
  } catch (err: any) {
    console.error("[v1-valuation-ensemble-sweep] error", err);
    const message = err?.message === "requested_org_forbidden"
      ? "User is not a member of the requested org"
      : err?.message ?? "Ensemble sweep failed";
    const status = err?.message === "requested_org_forbidden" ? 403 : 500;
    return jsonResponse(
      req,
      {
        ok: false,
        error: "valuation_ensemble_sweep_error",
        message,
      },
      status,
    );
  }
});
