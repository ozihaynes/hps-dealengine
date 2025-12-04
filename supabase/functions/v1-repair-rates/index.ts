import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { repairRatesRequestSchema } from "../../../packages/contracts/src/repairRates.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import type { RepairRatesRequest } from "../../../packages/contracts/src/repairRates.ts";
import type { RepairRateSetRow } from "./logic.ts";

const ERROR_CODES = {
  METHOD: "REPAIR_RATES_METHOD_NOT_ALLOWED",
  REQUEST_INVALID: "REPAIR_RATES_REQUEST_INVALID",
  DEAL_NOT_FOUND: "REPAIR_RATES_DEAL_NOT_FOUND",
  ORG_RESOLUTION_FAILED: "REPAIR_RATES_ORG_RESOLUTION_FAILED",
  PROFILE_NOT_FOUND: "REPAIR_RATE_PROFILE_NOT_FOUND",
  NO_ACTIVE_PROFILE: "REPAIR_RATES_NO_ACTIVE_PROFILE",
  FETCH_ERROR: "REPAIR_RATES_FETCH_ERROR",
  CONFIG: "REPAIR_RATES_CONFIG",
} as const;

type RepairRatesResponse = {
  ok: true;
  hasData: boolean;
  profileId: string;
  profileName: string;
  orgId: string;
  marketCode: string;
  posture: string;
  asOf: string | null;
  source: string | null;
  version: string | null;
  isDefault: boolean;
  psfTiers: {
    none: number;
    light: number;
    medium: number;
    heavy: number;
  };
  big5: {
    roof: number;
    hvac: number;
    repipe: number;
    electrical: number;
    foundation: number;
  };
  lineItemRates: unknown;
};

type DebugDetails = Record<string, unknown>;

function debugLog(message: string, details?: DebugDetails, opts?: { force?: boolean }) {
  const debug = Deno.env.get("DEBUG_REPAIR_RATES") === "true";
  if (!debug && !opts?.force) return;
  if (details) {
    console.log("[v1-repair-rates]", message, details);
  } else {
    console.log("[v1-repair-rates]", message);
  }
}

function errorPayload(code: string, message: string, extra?: Record<string, unknown>) {
  return { ok: false, error: code, message, ...(extra ?? {}) };
}

function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });
}

async function getUserId(supabase: ReturnType<typeof createSupabaseClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("Unauthorized");
  }
  return data.user.id as string;
}

async function resolveOrgIdFromDeal(
  supabase: ReturnType<typeof createSupabaseClient>,
  dealId: string,
  userId: string,
): Promise<string> {
  debugLog("resolving org via deal", { dealId, userId }, { force: true });
  const { data, error } = await supabase
    .from("deals")
    .select("org_id")
    .eq("id", dealId)
    .maybeSingle<{ org_id: string }>();

  if (error) {
    console.error("[v1-repair-rates] deal lookup failed", error);
    debugLog("error", { reason: "deal_lookup_error", dealId, userId }, { force: true });
    throw new Error(ERROR_CODES.FETCH_ERROR);
  }

  if (!data?.org_id) {
    debugLog("error", { reason: "deal_not_found", dealId, userId }, { force: true });
    throw new Error(ERROR_CODES.DEAL_NOT_FOUND);
  }

  debugLog("org resolved from deal", { dealId, orgId: data.org_id }, { force: true });
  return data.org_id as string;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const jwt = req.headers.get("Authorization");
  const hasAuthHeader = !!jwt;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      errorPayload(ERROR_CODES.METHOD, "Method not allowed. Use POST."),
      405,
    );
  }

  let body: unknown;
  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
    body = rawBodyText ? JSON.parse(rawBodyText) : {};
  } catch (err) {
    debugLog("error", { reason: "invalid_json", message: (err as Error)?.message }, {
      force: true,
    });
    return jsonResponse(
      req,
      errorPayload(ERROR_CODES.REQUEST_INVALID, "Invalid JSON body"),
      400,
    );
  }

  const parsedBody = repairRatesRequestSchema.safeParse(body as RepairRatesRequest);
  if (!parsedBody.success) {
    debugLog(
      "error",
      {
        reason: "validation_failed",
        issues: parsedBody.error.issues,
        bodyRawSnippet: rawBodyText.slice(0, 200),
      },
      { force: true },
    );
    return jsonResponse(
      req,
      errorPayload(
        ERROR_CODES.REQUEST_INVALID,
        "Repair rates request validation failed",
        { issues: parsedBody.error.issues },
      ),
      400,
    );
  }

  const marketCode = parsedBody.data.marketCode.toString().toUpperCase();
  const posture = parsedBody.data.posture.toString().toLowerCase();
  const profileId = parsedBody.data.profileId ?? null;
  const dealId = parsedBody.data.dealId;

  debugLog(
    "request received",
    {
      hasAuthHeader,
      method: req.method,
      dealId,
      marketCode,
      posture,
      profileId,
      bodyRawSnippet: rawBodyText.slice(0, 200),
    },
    { force: true },
  );

  let supabase: ReturnType<typeof createSupabaseClient>;
  try {
    supabase = createSupabaseClient(req);
  } catch (err: any) {
    debugLog("error", { reason: "config", message: err?.message }, { force: true });
    return jsonResponse(
      req,
      errorPayload(ERROR_CODES.CONFIG, err?.message ?? "Configuration error"),
      500,
    );
  }

  let userId: string;
  try {
    userId = await getUserId(supabase);
  } catch {
    return jsonResponse(
      req,
      errorPayload(ERROR_CODES.REQUEST_INVALID, "Unauthorized"),
      401,
    );
  }

  let orgId: string;
  try {
    orgId = await resolveOrgIdFromDeal(supabase, dealId, userId);
  } catch (err: any) {
    if (err?.message === ERROR_CODES.DEAL_NOT_FOUND) {
      return jsonResponse(
        req,
        errorPayload(
          ERROR_CODES.DEAL_NOT_FOUND,
          "Deal not found or not accessible.",
          { dealId },
        ),
        404,
      );
    }
    debugLog("error", { reason: "org_resolution_failed", dealId }, { force: true });
    return jsonResponse(
      req,
      errorPayload(
        ERROR_CODES.FETCH_ERROR,
        "Could not resolve org for deal.",
        { dealId },
      ),
      500,
    );
  }

  debugLog(
    "profile query",
    { orgId, marketCode, posture, profileId, dealId },
    { force: true },
  );

  let selectedRow: RepairRateSetRow | null = null;
  if (profileId) {
    const { data, error } = await supabase
      .from("repair_rate_sets")
      .select(
        "id, name, org_id, market_code, posture, as_of, source, version, is_active, is_default, repair_psf_tiers, repair_big5, line_item_rates",
      )
      .eq("id", profileId)
      .eq("org_id", orgId)
      .eq("market_code", marketCode)
      .eq("posture", posture)
      .maybeSingle<RepairRateSetRow>();

    if (error) {
      console.error("[v1-repair-rates] profile lookup error", error);
      return jsonResponse(
        req,
        errorPayload(ERROR_CODES.FETCH_ERROR, "Failed to load repair rates."),
        500,
      );
    }

    if (!data) {
      debugLog(
        "error",
        { reason: "profile_not_found", profileId, orgId, marketCode, posture },
        { force: true },
      );
      return jsonResponse(
        req,
        errorPayload(
          ERROR_CODES.PROFILE_NOT_FOUND,
          "Repair rate profile not found or not accessible",
          { orgId, profileId },
        ),
        404,
      );
    }
    selectedRow = data as RepairRateSetRow;
  } else {
    const { data, error } = await supabase
      .from("repair_rate_sets")
      .select(
        "id, name, org_id, market_code, posture, as_of, source, version, is_active, is_default, repair_psf_tiers, repair_big5, line_item_rates",
      )
      .eq("org_id", orgId)
      .eq("market_code", marketCode)
      .eq("posture", posture)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[v1-repair-rates] active profile lookup error", error);
      return jsonResponse(
        req,
        errorPayload(ERROR_CODES.FETCH_ERROR, "Failed to load repair rates."),
        500,
      );
    }

    const picked = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!picked) {
      debugLog(
        "error",
        { reason: "no_active_profile", orgId, marketCode, posture },
        { force: true },
      );
      return jsonResponse(
        req,
        errorPayload(
          ERROR_CODES.NO_ACTIVE_PROFILE,
          "No active repair rate set found for this org/market/posture.",
          { orgId, marketCode, posture },
        ),
        404,
      );
    }
    selectedRow = picked as RepairRateSetRow;
  }

  const data = selectedRow;
  const psf = data.repair_psf_tiers ?? {};
  const big5 = data.repair_big5 ?? {};

  debugLog(
    "profile selected",
    {
      id: data.id,
      is_active: data.is_active,
      is_default: data.is_default,
      as_of: data.as_of,
      version: data.version,
    },
    { force: true },
  );

  const response: RepairRatesResponse = {
    ok: true,
    hasData: true,
    profileId: data.id,
    profileName: data.name,
    orgId: data.org_id,
    marketCode: data.market_code,
    posture: data.posture,
    asOf: data.as_of ?? null,
    source: data.source ?? null,
    version: data.version ?? null,
    isDefault: data.is_default,
    psfTiers: {
      none: Number((psf as any).none ?? 0),
      light: Number((psf as any).light ?? 0),
      medium: Number((psf as any).medium ?? 0),
      heavy: Number((psf as any).heavy ?? 0),
    },
    big5: {
      roof: Number((big5 as any).roof ?? 0),
      hvac: Number((big5 as any).hvac ?? 0),
      repipe: Number((big5 as any).repipe ?? 0),
      electrical: Number((big5 as any).electrical ?? 0),
      foundation: Number((big5 as any).foundation ?? 0),
    },
    lineItemRates: data.line_item_rates ?? {},
  };

  return jsonResponse(req, response, 200);
});
