import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { computeUnderwriting } from "@hps-internal/engine";
import {
  buildUnderwritingPolicyFromOptions,
} from "@hps-internal/engine/policy_builder";
import type { UnderwritingPolicy } from "@hps-internal/engine";

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

/**
 * Shape aligned with @hps-internal/contracts AnalyzeInput.deal.
 * Kept tolerant and numeric-coercion friendly at the edge.
 */
type AnalyzeInput = {
  arv?: number | null;
  aiv?: number | null;
  dom_zip_days?: number | null;
  months_of_inventory_zip?: number | null;
  price_to_list_pct?: number | null;
  local_discount_pct?: number | null;
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
    price_to_list_pct: numOrNull(
      dealLike?.price_to_list_pct ?? dealLike?.["price-to-list-pct"],
    ),
    local_discount_pct: numOrNull(
      dealLike?.local_discount_pct ?? dealLike?.local_discount_20th_pct,
    ),
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

  const envelope: AnalyzeOkEnvelope = {
    ok: true,
    result: {
      outputs: result.outputs as AnalyzeOutputs,
      infoNeeded: result.infoNeeded ?? [],
      trace: result.trace as TraceFrame[],
    },
  };

  return jsonResponse(envelope, 200);
});
