import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const BodySchema = z.object({
  evidenceId: z.string().uuid(),
  expiresIn: z.number().int().positive().max(3600).default(300),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[v1-evidence-url] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.",
  );
}

function mapRow(row: any) {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    dealId: row.deal_id as string,
    runId: (row.run_id as string | null) ?? null,
    kind: row.kind as string,
    storageKey: row.storage_key as string,
    filename: row.filename as string,
    mimeType: row.mime_type as string,
    bytes: Number(row.bytes),
    sha256: row.sha256 as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse(
      req,
      { ok: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  let parsed;
  try {
    const raw =
      req.method === "GET"
        ? Object.fromEntries(new URL(req.url).searchParams)
        : await req.json();
    parsed = BodySchema.parse(raw);
  } catch (err) {
    return jsonResponse(req, { ok: false, error: "Invalid body", details: err }, 400);
  }

  const { data: userData, error: userError } = await supa.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
  }

  const { data: evidenceRow, error: evidenceError } = await supa
    .from("evidence")
    .select(
      "id, org_id, deal_id, run_id, storage_key, filename, mime_type, kind, bytes, sha256, created_at, updated_at, created_by",
    )
    .eq("id", parsed.evidenceId)
    .maybeSingle();

  if (evidenceError || !evidenceRow) {
    return jsonResponse(req, { ok: false, error: "Evidence not found" }, 404);
  }

  const signed = await supa.storage
    .from("evidence")
    .createSignedUrl(evidenceRow.storage_key, parsed.expiresIn);

  if (signed.error || !signed.data?.signedUrl) {
    return jsonResponse(
      req,
      { ok: false, error: signed.error?.message ?? "Failed to sign URL" },
      500,
    );
  }

  return jsonResponse(req, {
    ok: true,
    url: signed.data.signedUrl,
    storageKey: evidenceRow.storage_key,
    evidence: mapRow(evidenceRow),
  });
});
