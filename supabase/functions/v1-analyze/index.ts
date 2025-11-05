/** supabase/functions/v1-analyze/index.ts */
function num(x: unknown): number {
  if (x == null) return 0;
  const s = String(x).replace(/[$,\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

  const deal = body?.deal ?? {};

  const asIs     = num(deal?.market?.as_is_value);
  const repairs  = num(deal?.costs?.repairs_base);
  const contPct  = num(deal?.costs?.contingency_pct);
  const payoff   = num(deal?.debt?.senior_principal) + num(deal?.debt?.hoa_arrears) + num(deal?.debt?.muni_fines) + num(deal?.title?.cure_cost);

  const repairsWithCont        = repairs * (1 + contPct);
  const instantCashOffer       = Math.max(0, asIs - repairsWithCont);
  const projectedPayoffClose   = payoff;
  const netToSeller            = instantCashOffer - projectedPayoffClose;

  const urgencyDays =
    (deal?.policy?.manual_days_to_money ?? null) != null
      ? num(deal?.policy?.manual_days_to_money)
      : num(deal?.timeline?.days_to_sale_manual);

  return new Response(JSON.stringify({
    calculations: { instantCashOffer, projectedPayoffClose, netToSeller, urgencyDays, repairs_with_contingency: repairsWithCont }
  }), { headers: { "Content-Type": "application/json" }});
});