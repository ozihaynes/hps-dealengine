import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { computeUnderwriting } from "../_vendor/engine/index.js";
import {
  buildUnderwritingPolicyFromOptions,
} from "../_vendor/engine/policy_builder.js";
import type { UnderwritingPolicy } from "../_vendor/engine/index.js";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function createSupabaseClient(authorization: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token ? token : null;
}

/**
 * Shape aligned with @hps-internal/contracts AnalyzeInput.deal.
 * Kept tolerant and numeric-coercion friendly at the edge.
 */
type AnalyzeInput = {
  arv?: number | null;
  aiv?: number | null;
  payoff?: number | null;
  dom_zip_days?: number | null;
  months_of_inventory_zip?: number | null;
  price_to_list_pct?: number | null;
  local_discount_pct?: number | null;
  market?: {
    arv_source?: string | null;
    arv_as_of?: string | null;
    arv_valuation_run_id?: string | null;
    as_is_value_source?: string | null;
    as_is_value_as_of?: string | null;
    as_is_value_valuation_run_id?: string | null;
  };
  options?: {
    trace?: boolean;
  };
};

type AnalyzeSandboxOptions = {
  valuation?: Record<string, unknown>;
  floorsSpreads?: Record<string, unknown>;
  repairs?: Record<string, unknown>;
  carryTimeline?: Record<string, unknown>;
  carry?: Record<string, unknown>;
  holdCosts?: Record<string, unknown>;
  timeline?: Record<string, unknown>;
  profitUninsurable?: Record<string, unknown>;
  profit_and_fees?: Record<string, unknown>;
  disposition_and_double_close?: Record<string, unknown>;
  wholetail?: Record<string, unknown>;
};

/**
 * Output surface aligned with AnalyzeResultSchema.outputs,
 * plus aivSafetyCap & carryMonths for the current UI slice.
 */
type AnalyzeOutputs = {
  arv: number | null;
  aiv: number | null;
  aivCapped?: number | null;
  aivSafetyCap: number | null;
  carryMonths: number | null;
  buyer_ceiling: number | null;
  respect_floor: number | null;
  wholesale_fee: number | null;
  wholesale_fee_dc: number | null;
  market_temp_score: number | null;
  window_floor_to_offer: number | null;
  headroom_offer_to_ceiling: number | null;
  cushion_vs_payoff: number | null;
  seller_script_cash: string | null;

  // Strategy / offer bundle (optional back-compat)
  mao_wholesale?: number | null;
  mao_flip?: number | null;
  mao_wholetail?: number | null;
  mao_as_is_cap?: number | null;
  mao_cap_wholesale?: number | null;
  buyer_ceiling_unclamped?: number | null;
  floor_investor?: number | null;
  payoff_plus_essentials?: number | null;
  spread_cash?: number | null;
  min_spread_required?: number | null;
  cash_gate_status?: "pass" | "shortfall" | "unknown" | null;
  cash_deficit?: number | null;
  borderline_flag?: boolean | null;
  primary_offer?: number | null;
  primary_offer_track?: "wholesale" | "flip" | "wholetail" | "as_is_cap" | null;
  payoff_projected?: number | null;
  shortfall_vs_payoff?: number | null;
  seller_offer_band?: "low" | "fair" | "high" | null;
  buyer_ask_band?: "aggressive" | "balanced" | "generous" | null;
  sweet_spot_flag?: boolean | null;
  gap_flag?: "no_gap" | "narrow_gap" | "wide_gap" | null;
  strategy_recommendation?: string | null;
  workflow_state?: "NeedsInfo" | "NeedsReview" | "ReadyForOffer" | null;
  confidence_grade?: "A" | "B" | "C" | null;
  confidence_reasons?: string[] | null;
};

type AnalyzeResult = {
  outputs: AnalyzeOutputs;
  infoNeeded: string[];
  trace: unknown;
};

type TraceFrame = {
  key: string;
  label: string;
  details?: unknown;
};

type AnalyzeOkEnvelope = {
  ok: true;
  result: AnalyzeResult;
};

type AnalyzeErrorEnvelope = {
  ok: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

type AnalyzeEnvelope = AnalyzeOkEnvelope | AnalyzeErrorEnvelope;

function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

/**
 * Normalize the incoming body from either:
 *  - { arv, aiv, dom_zip_days, ... }
 *  - { org_id, posture, deal: { arv, aiv, dom_zip_days, ... } }
 */
function coerceInput(raw: unknown): {
  posture: string | null;
  input: AnalyzeInput;
  sandboxOptions?: AnalyzeSandboxOptions;
  sandboxSnapshot?: unknown;
} {
  const anyRaw = raw as any;

  const dealLike =
    anyRaw && typeof anyRaw.deal === "object" ? anyRaw.deal : anyRaw;

  const posture: string | null =
    (anyRaw?.posture as string | undefined) ??
    (dealLike?.posture as string | undefined) ??
    null;

  const market = dealLike?.market;
  const marketProvenance =
    market && typeof market === "object"
      ? {
          arv_source: (market as any)?.arv_source,
          arv_as_of: (market as any)?.arv_as_of,
          arv_valuation_run_id: (market as any)?.arv_valuation_run_id,
          as_is_value_source: (market as any)?.as_is_value_source,
          as_is_value_as_of: (market as any)?.as_is_value_as_of,
          as_is_value_valuation_run_id: (market as any)?.as_is_value_valuation_run_id,
        }
      : undefined;
  const marketProvenanceHasValues =
    marketProvenance &&
    Object.values(marketProvenance).some((value) => typeof value !== "undefined");

  const input: AnalyzeInput = {
    arv: numOrNull(dealLike?.arv),
    aiv: numOrNull(dealLike?.aiv ?? dealLike?.as_is_value),
    dom_zip_days: numOrNull(
      dealLike?.dom_zip_days ?? dealLike?.dom_zip ?? dealLike?.dom,
    ),
    months_of_inventory_zip: numOrNull(
      dealLike?.months_of_inventory_zip ??
        dealLike?.moi_zip_months ??
        dealLike?.moi_zip,
    ),
    payoff: numOrNull(dealLike?.payoff ?? dealLike?.payoff_total),
    price_to_list_pct: numOrNull(
      dealLike?.price_to_list_pct ?? dealLike?.["price-to-list-pct"],
    ),
    local_discount_pct: numOrNull(
      dealLike?.local_discount_pct ?? dealLike?.local_discount_20th_pct,
    ),
    market: marketProvenanceHasValues ? marketProvenance : undefined,
    options: dealLike?.options,
  };

  return {
    posture,
    input,
    sandboxOptions: anyRaw?.sandboxOptions ?? anyRaw?.analysisOptions,
    sandboxSnapshot: anyRaw?.sandboxSnapshot ?? anyRaw?.sandbox,
  };
}

/**
 * Basic semantic validation on the normalized input.
 * Ensures we have at least some meaningful numeric content.
 */
function validateInput(posture: string | null, input: AnalyzeInput): {
  ok: boolean;
  error?: AnalyzeErrorEnvelope["error"];
} {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      error: {
        message: "Invalid AnalyzeInput; expected an object.",
        code: "invalid_input_shape",
      },
    };
  }

  const hasAnyMetric =
    input.arv != null ||
    input.aiv != null ||
    input.payoff != null ||
    input.dom_zip_days != null ||
    input.months_of_inventory_zip != null ||
    input.price_to_list_pct != null ||
    input.local_discount_pct != null;

  if (!hasAnyMetric) {
    return {
      ok: false,
      error: {
        message:
          "Invalid AnalyzeInput; missing key numeric fields (arv, aiv, dom, moi, price_to_list_pct, or local_discount_pct).",
        code: "missing_numeric_fields",
        details: {
          posture,
          input,
        },
      },
    };
  }

  return { ok: true };
}

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    const envelope: AnalyzeErrorEnvelope = {
      ok: false,
      error: { message: "Method not allowed", code: "method_not_allowed" },
    };
    return jsonResponse(envelope, 405);
  }

  const requestId = req.headers.get("x-request-id") ?? "(missing)";
  const hasTraceparent = Boolean(req.headers.get("traceparent"));
  const hasTracestate = Boolean(req.headers.get("tracestate"));
  console.info("[v1-analyze] request", {
    function: "v1-analyze",
    request_id: requestId,
    has_traceparent: hasTraceparent,
    has_tracestate: hasTracestate,
  });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "missing_authorization" }, 401);
  }

  const token = parseBearerToken(authHeader);
  if (!token) {
    return jsonResponse({ error: "invalid_authorization" }, 401);
  }

  let supabase;
  try {
    supabase = createSupabaseClient(`Bearer ${token}`);
  } catch (error) {
    console.error("[v1-analyze] auth config error", error);
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
  } catch (error) {
    console.error("[v1-analyze] auth check failed", error);
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    const envelope: AnalyzeErrorEnvelope = {
      ok: false,
      error: { message: "Invalid JSON body; expected AnalyzeInput", code: "invalid_json" },
    };
    return jsonResponse(envelope, 400);
  }

  const { posture, input, sandboxOptions, sandboxSnapshot } = coerceInput(raw);

  const validation = validateInput(posture, input);
  if (!validation.ok) {
    const envelope: AnalyzeErrorEnvelope = {
      ok: false,
      error: validation.error ?? {
        message: "Invalid AnalyzeInput",
        code: "invalid_input",
      },
    };
    return jsonResponse(envelope, 400);
  }

  const basePolicy: UnderwritingPolicy = {} as UnderwritingPolicy;
  const uwPolicy = buildUnderwritingPolicyFromOptions(
    basePolicy,
    sandboxOptions ?? null,
  );

  const deal = {
    market: {
      arv: input.arv ?? null,
      aiv: input.aiv ?? null,
      dom_zip: input.dom_zip_days ?? null,
      moi_zip: input.months_of_inventory_zip ?? null,
      price_to_list_pct: input.price_to_list_pct ?? null,
      local_discount_pct: input.local_discount_pct ?? null,
    },
  };

  const result = computeUnderwriting(deal as unknown as Record<string, unknown>, uwPolicy as unknown as Record<string, unknown>);

  if (!result.ok) {
    const envelope: AnalyzeErrorEnvelope = {
      ok: false,
      error: { message: "Engine error", code: "engine_error", details: result },
    };
    return jsonResponse(envelope, 500);
  }

  const traceFrames = Array.isArray(result.trace) ? result.trace : [];
  const provenanceFrame: TraceFrame = {
    key: "MARKET_PROVENANCE",
    label: "Market Provenance",
    details: input.market ?? {},
  };
  const traceWithProvenance = [...traceFrames, provenanceFrame];

  const outputs = result.outputs as AnalyzeOutputs;
  const aivCapPct = 0.97;
  const aiv = input.aiv ?? outputs.aiv ?? null;
  const arv = input.arv ?? outputs.arv ?? null;
  const dom = input.dom_zip_days ?? null;
  const payoff = input.payoff ?? null;
  const derivedAivCapped =
    aiv != null ? Math.round(aiv * aivCapPct * 100) / 100 : null;
  const derivedCarryMonths =
    dom != null ? Math.min(6, Math.max(1, Math.ceil(dom / 30))) : null;
  const minSpreadRequired =
    outputs.min_spread_required ??
    ((arv ?? aiv) != null
      ? Math.round((arv ?? aiv ?? 0) * 0.08)
      : null);
  const spreadCash =
    outputs.spread_cash ??
    ((arv ?? aiv) != null && payoff != null && minSpreadRequired != null
      ? Math.round((arv ?? aiv ?? 0) - payoff - minSpreadRequired)
      : null);
  const borderlineFlag =
    outputs.borderline_flag ??
    (minSpreadRequired != null && spreadCash != null
      ? spreadCash < minSpreadRequired
      : null);

  const mergedOutputs: AnalyzeOutputs = {
    ...outputs,
    arv,
    aiv,
    aivCapped: derivedAivCapped ?? (outputs as any).aivCapped ?? null,
    aivSafetyCap: aivCapPct,
    carryMonths: outputs.carryMonths ?? derivedCarryMonths ?? null,
    min_spread_required: minSpreadRequired ?? null,
    spread_cash: spreadCash ?? null,
    borderline_flag: borderlineFlag ?? null,
  };

  const envelope: AnalyzeOkEnvelope = {
    ok: true,
    // Back-compat for consumers expecting outputs at the top level.
    // @ts-expect-error widen envelope for convenience
    outputs: mergedOutputs,
    result: {
      outputs: mergedOutputs,
      infoNeeded: result.infoNeeded ?? [],
      trace: traceWithProvenance,
    },
  };

  return jsonResponse(envelope, 200);
});
