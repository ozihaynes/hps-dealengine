/* v1-evidence-start — returns signed upload URL for private "evidence" bucket
   Requires INSERT policy on storage.objects (enforced via RLS with forwarded JWT). */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const Body = z.object({
  org_id: z.string().uuid(),
  filename: z.string().min(1),
});

function safeName(s: string) {
  const base = s.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return base.length ? base : "file";
}

Deno.serve(async (req) => {
  try {
    const url  = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supa = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });

    const { org_id, filename } = Body.parse(await req.json());
    const path = `${org_id}/${Date.now()}-${safeName(filename)}`;

    const { data, error } = await supa.storage.from("evidence").createSignedUploadUrl(path);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, path, signedUrl: data.signedUrl, token: data.token }), {
      headers: { "content-type": "application/json" }, status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Error" }), {
      headers: { "content-type": "application/json" }, status: 400,
    });
  }
});
