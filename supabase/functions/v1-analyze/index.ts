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

  return { posture, input };
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

  const { posture, input } = coerceInput(raw);

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

  const outputs: AnalyzeOutputs = {
    arv: input.arv ?? null,
    aiv: input.aiv ?? null,
    aivSafetyCap,
    carryMonths,
    buyer_ceiling: null,
    respect_floor: null,
    wholesale_fee: null,
    wholesale_fee_dc: null,
    market_temp_score: null,
    window_floor_to_offer: null,
    headroom_offer_to_ceiling: null,
    cushion_vs_payoff: null,
    seller_script_cash: null,
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