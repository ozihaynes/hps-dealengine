import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { aivSafetyCap, carryMonthsFromDom } from '@hps-internal/engine';

type Posture = "conservative" | "base" | "aggressive";
type Body = { posture?: Posture; deal?: { aiv?: number; dom_zip?: number } };

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

    const body = (await req.json().catch(() => ({}))) as Body;
    const posture: Posture = body?.posture ?? "base";
    const deal = body?.deal ?? {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { data: pol, error } = await supabase
      .from("policies")
      .select("tokens")
      .eq("posture", posture)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return json({ ok: false, error: error.message }, 400);

    const tokens = (pol?.tokens ?? {}) as Record<string, unknown>;

    const tAIV = num(tokens["AIV_CAP_PCT"]);
    const tCarry = num(tokens["CARRY_MONTHS_CAP"]);
    const aiv = num(deal.aiv);
    const dom = num(deal.dom_zip);

    const outAiv = aivSafetyCap(aiv, tAIV);
    const outCarry = carryMonthsFromDom(dom, tCarry);

    const infoNeeded: string[] = [];
    if (aiv === null) infoNeeded.push("deal.aiv");
    if (dom === null) infoNeeded.push("deal.dom_zip");

    const trace = [
      {
        id: "aiv.cap",
        label: "AIV safety cap",
        formula: "aiv * AIV_CAP_PCT",
        inputs: { aiv, AIV_CAP_PCT: tAIV },
        output: outAiv,
      },
      {
        id: "carry.dom",
        label: "DOM→carry months (cap)",
        formula: "min((dom_zip+35)/30, CARRY_MONTHS_CAP)",
        inputs: { dom_zip: dom, CARRY_MONTHS_CAP: tCarry },
        output: outCarry,
      },
    ];

    const tokens_used: Record<string, number> = {};
    if (tAIV !== null) tokens_used["AIV_CAP_PCT"] = tAIV;
    if (tCarry !== null) tokens_used["CARRY_MONTHS_CAP"] = tCarry;

    return json({
      ok: true,
      posture,
      outputs: { carryMonths: outCarry, aivSafetyCap: outAiv },
      infoNeeded,
      trace,
      tokens_used,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
