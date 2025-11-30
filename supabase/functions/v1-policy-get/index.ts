import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Simple JSON responder
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in env for v1-policy-get");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse(
      { ok: false, error: "method_not_allowed", detail: "Use POST" },
      405,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (_err) {
    return jsonResponse(
      { ok: false, error: "invalid_json", detail: "Body must be valid JSON" },
      400,
    );
  }

  const posture =
    typeof body?.posture === "string" && body.posture.trim().length > 0
      ? body.posture.trim()
      : "default";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse(
      {
        ok: false,
        error: "server_misconfigured",
        detail: "Missing Supabase env vars",
      },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      {
        ok: false,
        error: "missing_auth",
        detail: "Authorization header (Bearer <jwt>) is required",
      },
      401,
    );
  }

  // Caller-scoped client: uses anon key but forwards the caller JWT for RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data, error } = await supabase
    .from("policies")
    .select("id, org_id, posture, policy_json, is_active")
    .eq("posture", posture)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("v1-policy-get: Supabase query error", error);
    return jsonResponse(
      {
        ok: false,
        error: "db_error",
        detail: error.message ?? "Unexpected database error",
      },
      500,
    );
  }

  if (!data) {
    return jsonResponse(
      {
        ok: false,
        error: "policy_not_found",
        detail: `No active policy found for posture='${posture}' in caller's org`,
      },
      404,
    );
  }

  return jsonResponse(
    {
      ok: true,
      posture: data.posture,
      org_id: data.org_id,
      policy: data.policy_json,
      policy_id: data.id,
    },
    200,
  );
});
