import { computeUnderwriting } from "@hps-internal/engine";
import { UNDERWRITE_POLICY } from "@hps-internal/engine/policy-defaults.js"; // Deno needs .js
import { createClient } from "jsr:@supabase/supabase-js@2";

type Json = Record<string, unknown>;

function isNum(v: unknown): v is number { return typeof v === "number" && Number.isFinite(v); }
function get(obj: any, path: (string|number)[]): any {
  return path.reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), obj);
}
function tokenNumber(raw: any, tokenPath: (string|number)[], directPath: (string|number)[], fallback?: number|null) {
  const tokVal = get(raw, tokenPath);
  if (isNum(tokVal)) return tokVal;
  if (typeof tokVal === "string" && tokVal.startsWith("<") && raw?.tokens && isNum(raw.tokens[tokVal])) return raw.tokens[tokVal];
  const direct = get(raw, directPath);
  if (isNum(direct)) return direct;
  return fallback ?? null;
}

Deno.serve(async (req) => {
  const authz = req.headers.get("authorization") ?? "";
  const authed = authz.startsWith("Bearer ");

  // Supabase client: forward caller's JWT so RLS applies
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ ok:false, error:"Missing SUPABASE_URL or publishable/anon key env." }, null, 2), { status: 500, headers:{ "content-type":"application/json" }});
  }
  const supabase = createClient(url, key, { global: { headers: authed ? { authorization: authz } : {} }});

  const body: any = await req.json().catch(() => ({}));
  const dealIn = body.deal ?? {};
  const posture = body.options?.posture ?? "base";
  // Optionally constrain org; if omitted, rely on RLS to scope rows by membership
  const orgId = body.org_id ?? "6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2";

  // Normalize to engine deal shape
  const aiv    = isNum(dealIn.aiv) ? dealIn.aiv : (isNum(dealIn.list_price) ? dealIn.list_price : null);
  const domZip = isNum(dealIn.dom) ? dealIn.dom : null;
  const arv    = isNum(dealIn.arv_estimate) ? dealIn.arv_estimate : null;
  const engineDeal = { market: { aiv, arv, dom_zip: domZip } };

  // Fetch latest policy JSON (supports either policies or policy_versions)
  let rawPolicy: Json | null = null;
  {
    // Try policy_versions first
    const { data: pv, error: e1 } = await supabase
      .from("policy_versions")
      .select("policy_json")
      .eq("posture", posture)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pv?.policy_json) rawPolicy = pv.policy_json as Json;

    // Fallback to policies.active row if needed
    if (!rawPolicy) {
      const { data: pol, error: e2 } = await supabase
        .from("policies")
        .select("policy_json")
        .eq("posture", posture)
        .eq("org_id", orgId)
        .eq("is_active", true)
        .maybeSingle();
      if (pol?.policy_json) rawPolicy = pol.policy_json as Json;
    }
  }

  // Build the exact shape the engine expects, resolving *_token where present.
  // If DB missing, fall back to defaults to keep the demo hot.
  const resolved_from = rawPolicy ? "db" : "default";
  const rp = rawPolicy ?? {};
  const aiv_cap_pct = tokenNumber(rp, ["aiv","safety_cap_pct_token"], ["aiv","safety_cap_pct"], UNDERWRITE_POLICY.mao_aiv_cap_pct);
  const carry_cap   = tokenNumber(rp, ["carry","months_cap_token"],     ["carry","months_cap"],     UNDERWRITE_POLICY.carry_month_cap);
  const carry_rule  = (get(rp, ["carry","dom_to_months_rule_token"]) ?? get(rp, ["carry","dom_to_months_rule"]) ?? "DOM/30") as string;

  const list_pct   = tokenNumber(rp, ["fees","list_commission_pct_token"], ["fees","list_commission_pct"], 0.03) ?? 0.03;
  const conc_pct   = tokenNumber(rp, ["fees","concessions_pct_token"],     ["fees","concessions_pct"],     0.02) ?? 0.02;
  const sellc_pct  = tokenNumber(rp, ["fees","sell_close_pct_token"],      ["fees","sell_close_pct"],      0.015) ?? 0.015;

  const policy = {
    ...UNDERWRITE_POLICY,
    aiv:   { safety_cap_pct_token: aiv_cap_pct, safety_cap_pct: aiv_cap_pct },
    carry: { dom_to_months_rule_token: carry_rule, months_cap_token: carry_cap, months_cap: carry_cap },
    fees:  {
      list_commission_pct_token: list_pct,
      concessions_pct_token:     conc_pct,
      sell_close_pct_token:      sellc_pct,
      list_commission_pct:       list_pct,
      concessions_pct:           conc_pct,
      sell_close_pct:            sellc_pct,
    },
    tokens: (rp as any)?.tokens ?? undefined,
    resolved_from,
  };

  const uw = computeUnderwriting(engineDeal, policy);

  return new Response(JSON.stringify({
    ok: true,
    authed,
    inputs: { posture, engineDeal },
    policy: { resolved_from, aiv_cap_pct, carry_cap, carry_rule, fees: { list_pct, conc_pct, sellc_pct } },
    underwriting: uw
  }, null, 2), { headers: { "content-type": "application/json" }});
});
