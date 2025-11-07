/* v1-policy-get: returns active policy for caller's org/posture
   Methods: GET ?posture=..., POST { posture?: "conservative"|"base"|"aggressive" }
   Auth: Authorization: Bearer <user JWT> is forwarded so RLS evaluates as caller.
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "missing_bearer" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  // posture from query or body; default base
  let posture: string | null = new URL(req.url).searchParams.get("posture");
  if (!posture) {
    try {
      const b = await req.json();
      if (typeof b?.posture === "string") posture = b.posture;
    } catch {}
  }
  posture = posture ?? "base";

  // resolve caller org via memberships (RLS enforces auth.uid())
  const mRes = await supabase.from("memberships").select("org_id").limit(1);
  if (mRes.error) return json({ error: "membership_error", details: mRes.error.message }, 403);
  const org = (mRes.data && mRes.data[0]?.org_id) || null;
  if (!org) return json({ error: "no_membership" }, 403);

  // newest active policy (no .single(); tolerate future dup protections)
  const pRes = await supabase
    .from("policies")
    .select("id, org_id, posture, is_active, policy_json, tokens, metadata, created_at")
    .eq("org_id", org)
    .eq("posture", posture)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (pRes.error) return json({ error: "policy_query_error", details: pRes.error.message }, 500);
  const policy = pRes.data && pRes.data[0];
  if (!policy) return json({ error: "policy_not_found" }, 404);

  return json({ ok: true, policy }, 200);
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}
