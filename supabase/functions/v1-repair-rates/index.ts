import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,apikey",
};

type RepairRateSetRow = {
  org_id: string;
  market_code: string;
  as_of: string;
  source: string | null;
  version: string;
  is_active: boolean;
  repair_psf_tiers: Record<string, number> | null;
  repair_big5: Record<string, number> | null;
  line_item_rates: unknown;
};

type RepairRatesResponse = {
  orgId: string;
  marketCode: string;
  asOf: string;
  source: string | null;
  version: string;
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

type RequestBody = {
  orgId?: string;
  marketCode?: string | null;
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers,
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed. Use POST." },
      { status: 405 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const orgId = body.orgId;
  const marketCode = body.marketCode ?? "ORL";

  if (!orgId || typeof orgId !== "string") {
    return jsonResponse(
      { error: "Missing or invalid orgId in request body." },
      { status: 400 },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const { data, error } = await supabase
    .from("repair_rate_sets")
    .select(
      "org_id, market_code, as_of, source, version, is_active, repair_psf_tiers, repair_big5, line_item_rates",
    )
    .eq("org_id", orgId)
    .eq("market_code", marketCode)
    .eq("is_active", true)
    .maybeSingle<RepairRateSetRow>();

  if (error) {
    console.error("Error fetching repair_rate_sets:", error);
    return jsonResponse(
      { error: "Failed to load repair rates." },
      { status: 500 },
    );
  }

  if (!data) {
    return jsonResponse(
      {
        error: "No active repair rate set found for this org/market.",
        orgId,
        marketCode,
      },
      { status: 404 },
    );
  }

  const psf = data.repair_psf_tiers ?? {};
  const big5 = data.repair_big5 ?? {};

  const response: RepairRatesResponse = {
    orgId: data.org_id,
    marketCode: data.market_code,
    asOf: data.as_of,
    source: data.source,
    version: data.version,
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
    lineItemRates: data.line_item_rates,
  };

  return jsonResponse(response, { status: 200 });
});
