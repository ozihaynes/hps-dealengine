// v1-policy — GET active policy for the caller's org + posture
// RLS is enforced by forwarding the user's Authorization header to supabase-js.

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PolicySchema = z.object({
  posture: z.enum(["conservative", "base", "aggressive"]),
  tokens: z.record(z.string()),
  metadata: z.record(z.any()).optional().default({})
});

function json(
  body: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*"); // dev convenience
  return new Response(JSON.stringify(body), { ...init, headers });
}

Deno.serve(async (req: Request) => {
  // Basic JWT gate (edge gateway also verifies when verify_jwt=true)
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return json({ code: "unauthorized", message: "Missing/invalid Authorization" }, { status: 401 });
  }

  // Accept posture from query (?posture=base) or JSON body { posture: "base" }
  const url = new URL(req.url);
  let posture = url.searchParams.get("posture") ?? undefined;
  if (!posture) {
    try {
      const body = await req.json();
      if (typeof body?.posture === "string") posture = body.posture;
    } catch {
      // ignore (no body / not JSON)
    }
  }
  if (!posture) posture = "base";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } }
  });

  // Query is org-scoped via RLS; we don't need to pass org_id explicitly.
  // Expect a single active policy per (org, posture).
  const { data, error } = await sb
    .from("policies")
    .select("posture,tokens,metadata,is_active")
    .eq("posture", posture)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    // 403 when RLS blocks; 404 when not found
    const status = error.code === "PGRST116" ? 404 : (error.message?.includes("Denied") ? 403 : 400);
    return json({ code: "policy_fetch_failed", message: error.message }, { status });
  }
  if (!data) {
    return json({ code: "not_found", message: "No active policy for posture" }, { status: 404 });
  }

  const parsed = PolicySchema.safeParse({
    posture: data.posture,
    tokens: data.tokens ?? {},
    metadata: data.metadata ?? {}
  });
  if (!parsed.success) {
    return json({
      code: "policy_invalid",
      message: "Policy failed validation",
      issues: parsed.error.issues
    }, { status: 422 });
  }

  return json(parsed.data, { status: 200 });
});
