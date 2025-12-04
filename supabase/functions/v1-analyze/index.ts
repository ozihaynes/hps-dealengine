import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

  const arv = input.arv ?? 0;
  const aiv = input.aiv ?? 0;
  const dom = input.dom_zip_days ?? 0;

  // -------------------------------------------------------------------------
  // Minimal deterministic engine slice:
  //  - AIV safety cap at 90% of ARV
  //  - Carry months from DOM, rounded and clamped [0, 6]
  // -------------------------------------------------------------------------

  const capPct = 0.9;
  const aivCapFromArv = arv * capPct;
  const aivSafetyCap = Math.min(aiv, aivCapFromArv);

  const rawMonths = dom / 30;
  let carryMonths = Math.round(rawMonths);
  if (!Number.isFinite(carryMonths) || carryMonths < 0) carryMonths = 0;
  if (carryMonths > 6) carryMonths = 6;

  const traceFrames: TraceFrame[] = [
    {
      key: "inputs",
      label: "Normalized inputs",
      details: {
        posture,
        arv,
        aiv,
        dom,
        months_of_inventory_zip: input.months_of_inventory_zip,
        price_to_list_pct: input.price_to_list_pct,
        local_discount_pct: input.local_discount_pct,
        sandboxOptions,
      },
    },
    {
      key: "aiv_safety_cap",
      label: "AIV safety cap at 90% of ARV",
      details: {
        arv,
        aiv,
        capPct,
        aivCapFromArv,
        aivSafetyCap,
      },
    },
    {
      key: "carry_months",
      label: "Carry months capped between 0 and 6",
      details: {
        dom,
        rawMonths,
        carryMonths,
      },
    },
  ];

  const buyerCeiling = aivSafetyCap ?? input.aiv ?? null;
  const respectFloor = aivSafetyCap ?? input.aiv ?? null;
  const primaryOffer = respectFloor;
  const windowFloorToOffer =
    primaryOffer != null && respectFloor != null
      ? primaryOffer - respectFloor
      : null;
  const headroomOfferToCeiling =
    buyerCeiling != null && primaryOffer != null
      ? buyerCeiling - primaryOffer
      : null;
  const payoffProjected = null; // TODO(policy): add payoff inputs to AnalyzeInput to compute this deterministically.
  const cushionVsPayoff =
    payoffProjected != null && primaryOffer != null
      ? primaryOffer - payoffProjected
      : null;
  const shortfallVsPayoff =
    payoffProjected != null && primaryOffer != null
      ? payoffProjected - primaryOffer
      : null;

  const sellerOfferBand =
    primaryOffer != null && respectFloor != null && buyerCeiling != null
      ? primaryOffer < respectFloor
        ? "low"
        : primaryOffer > buyerCeiling
        ? "high"
        : "fair"
      : null;

  const buyerAskBand =
    headroomOfferToCeiling != null
      ? headroomOfferToCeiling < 0
        ? "aggressive"
        : headroomOfferToCeiling <= 5000
        ? "balanced"
        : "generous"
      : null;

  const sweetSpotFlag =
    windowFloorToOffer != null &&
    windowFloorToOffer >= 0 &&
    headroomOfferToCeiling != null &&
    headroomOfferToCeiling >= 0;

  const gapFlag =
    windowFloorToOffer == null || headroomOfferToCeiling == null
      ? null
      : windowFloorToOffer < 0 || headroomOfferToCeiling < 0
      ? "wide_gap"
      : Math.min(windowFloorToOffer, headroomOfferToCeiling) <= 5000
      ? "narrow_gap"
      : "no_gap";

  const workflowState =
    primaryOffer == null || respectFloor == null || buyerCeiling == null
      ? "NeedsInfo"
      : windowFloorToOffer != null && windowFloorToOffer < 0
      ? "NeedsReview"
      : "ReadyForOffer";

  const confidenceGrade =
    primaryOffer == null || respectFloor == null || buyerCeiling == null
      ? "C"
      : "B";
  const timelineSummary = {
    days_to_money: dom ?? null,
    carry_months: carryMonths,
    speed_band:
      dom != null ? (dom <= 30 ? "fast" : dom <= 90 ? "balanced" : "slow") : null,
    urgency: dom != null ? (dom <= 14 ? "critical" : dom <= 45 ? "elevated" : "normal") : null,
    auction_date_iso: null,
  };

  const riskSummary = {
    overall: "watch" as const,
    insurability: "info_needed" as const,
    payoff: payoffProjected != null ? ("pass" as const) : ("info_needed" as const),
    reasons: payoffProjected != null ? [] : ["payoff: info_needed"],
  };

  const evidenceSummary = {
    confidence_grade: confidenceGrade,
    confidence_reasons:
      confidenceGrade === "C"
        ? ["Missing inputs for ceiling/floor/offer."]
        : [],
    freshness_by_kind: {
      comps: "missing" as const,
      payoff_letter: payoffProjected != null ? ("fresh" as const) : ("missing" as const),
      title_quote: "missing" as const,
      insurance: "missing" as const,
      repairs: "missing" as const,
    },
  };

  const outputs: AnalyzeOutputs = {
    arv: input.arv ?? null,
    aiv: input.aiv ?? null,
    aivSafetyCap,
    carryMonths,
    buyer_ceiling: buyerCeiling,
    respect_floor: respectFloor,
    wholesale_fee: null,
    wholesale_fee_dc: null,
    market_temp_score: null,
    window_floor_to_offer: windowFloorToOffer,
    headroom_offer_to_ceiling: headroomOfferToCeiling,
    cushion_vs_payoff: cushionVsPayoff,
    seller_script_cash: null,
    mao_wholesale: primaryOffer,
    mao_flip: buyerCeiling,
    mao_wholetail: buyerCeiling,
    mao_as_is_cap: respectFloor,
    primary_offer: primaryOffer,
    primary_offer_track: primaryOffer != null ? "wholesale" : null,
    payoff_projected: payoffProjected,
    shortfall_vs_payoff: shortfallVsPayoff,
    seller_offer_band: sellerOfferBand,
    buyer_ask_band: buyerAskBand,
    sweet_spot_flag: sweetSpotFlag,
    gap_flag: gapFlag,
    strategy_recommendation:
      primaryOffer != null ? "Recommend Wholesale — provisional" : null,
    workflow_state: workflowState,
    confidence_grade: confidenceGrade,
    confidence_reasons:
      confidenceGrade === "C"
        ? ["Missing inputs for ceiling/floor/offer."]
        : null,
    timeline_summary: timelineSummary,
    risk_summary: riskSummary,
    evidence_summary: evidenceSummary,
  };

  const result: AnalyzeResult = {
    outputs,
    infoNeeded: [],
    trace: traceFrames,
  };

  const envelope: AnalyzeOkEnvelope = {
    ok: true,
    result,
  };

  return jsonResponse(envelope, 200);
});
