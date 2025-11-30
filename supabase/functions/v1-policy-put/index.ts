/* v1-policy-put — strict I/O; update active policy + snapshot policy_versions; caller-scoped RLS */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const Body = z.object({
  org_id: z.string().uuid(),
  posture: z.enum(["conservative","base","aggressive"]),
  policy_json: z.record(z.any()),
  change_summary: z.string().min(1).max(500),
});

const PolicyRow = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  posture: z.enum(["conservative","base","aggressive"]),
  policy_json: z.record(z.any()),
  is_active: z.boolean().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

const VersionRow = z.object({
  id: z.string().uuid().optional(),        // if UUID, else bigint -> coerce string ok in JS layer
  org_id: z.string().uuid(),
  posture: z.enum(["conservative","base","aggressive"]),
  policy_json: z.record(z.any()),
  change_summary: z.string(),
  created_at: z.string().datetime().optional(),
  created_by: z.string().uuid().optional(),
});

const Ok = z.object({ ok: z.literal(true), policy: PolicyRow, version: VersionRow });
const Fail = z.object({ ok: z.literal(false), error: z.string() });

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ ok:false, error:"Missing Authorization" }), { status: 401 });

    const url  = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supa = createClient(url, anon, { global: { headers: { Authorization: auth } } });

    const { org_id, posture, policy_json, change_summary } = Body.parse(await req.json());

    // Update active policy for this org/posture
    const { data: pol, error: uerr } = await supa
      .from("policies")
      .update({ policy_json })
      .eq("org_id", org_id)
      .eq("posture", posture)
      .eq("is_active", true)
      .select("id,org_id,posture,policy_json,is_active,created_at,updated_at")
      .single();

    if (uerr || !pol) {
      const status = (uerr?.code === "PGRST116" || !pol) ? 404 : 403; // not found vs likely blocked by RLS
      return new Response(JSON.stringify({ ok:false, error: uerr?.message || "Policy update failed" }), { status });
    }

    // Snapshot version (created_by defaults to auth.uid() in DB)
    const { data: ver, error: verr } = await supa
      .from("policy_versions")
      .insert({ org_id, posture, policy_json, change_summary })
      .select("id,org_id,posture,policy_json,change_summary,created_at,created_by")
      .single();

    if (verr || !ver) {
      return new Response(JSON.stringify({ ok:false, error: verr?.message || "Version snapshot failed" }), { status: 500 });
    }

    const payload = Ok.parse({ ok:true, policy: pol, version: ver });
    return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" }, status: 200 });
  } catch (e) {
    if (e?.issues) return new Response(JSON.stringify({ ok:false, error:"Invalid input" }), { status: 422 });
    return new Response(JSON.stringify({ ok:false, error: e?.message ?? "Error" }), { status: 500 });
  }
});
