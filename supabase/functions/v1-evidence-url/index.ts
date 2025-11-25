/* v1-evidence-url — returns short-lived signed read URL for a given object path
   Requires SELECT policy on storage.objects (enforced by RLS). */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const Body = z.object({
  path: z.string().min(1),
  expiresIn: z.number().int().positive().max(3600).default(300),
});

Deno.serve(async (req) => {
  try {
    const url  = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });

    const { path, expiresIn } = Body.parse(await req.json());

    const { data, error } = await supa.storage.from("evidence").createSignedUrl(path, expiresIn);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, url: data.signedUrl }), {
      headers: { "content-type": "application/json" }, status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Error" }), {
      headers: { "content-type": "application/json" }, status: 400,
    });
  }
});
