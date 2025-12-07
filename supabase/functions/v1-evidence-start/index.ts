import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const BodySchema = z.object({
  dealId: z.string().uuid(),
  runId: z.string().uuid().optional().nullable(),
  kind: z.string().min(1),
  filename: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "sha256 must be 64 hex characters"),
  mimeType: z.string().min(1),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[v1-evidence-start] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.",
  );
}

type DealRow = { org_id: string };

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

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        req,
        { ok: false, error: "Method not allowed" },
        405,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        req,
        { ok: false, error: "Missing Authorization header" },
        401,
      );
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);

    if (!parsed.success) {
      console.error("[v1-evidence-start] invalid body", parsed.error.format());
      return jsonResponse(
        req,
        { ok: false, error: "Invalid request body" },
        400,
      );
    }

    const body = parsed.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Validate caller JWT
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return jsonResponse(
        req,
        { ok: false, error: "Unauthorized" },
        401,
      );
    }
    const userId = userData.user.id as string;

    // Resolve org via the deal row (RLS enforces membership)
    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("org_id")
      .eq("id", body.dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[v1-evidence-start] deal lookup failed", dealError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to resolve deal" },
        500,
      );
    }

    if (!dealRow?.org_id) {
      return jsonResponse(
        req,
        { ok: false, error: "Deal not found or not accessible" },
        404,
      );
    }

    const orgId = (dealRow as DealRow).org_id;
    const runId = body.runId ?? null;

    if (runId) {
      const { data: runRow, error: runError } = await supabase
        .from("runs")
        .select("id, org_id, deal_id, input")
        .eq("id", runId)
        .maybeSingle();

      if (runError || !runRow) {
        return jsonResponse(
          req,
          { ok: false, error: "Run not found or not accessible" },
          404,
        );
      }

      const runOrgId = (runRow as any).org_id;
      const runDealId =
        (runRow as any).deal_id ??
        ((runRow as any).input as any)?.dealId ??
        null;

      if (runOrgId !== orgId || (runDealId && runDealId !== body.dealId)) {
        return jsonResponse(
          req,
          { ok: false, error: "Run does not belong to this deal/org" },
          400,
        );
      }
    }

    const storageKey = [
      "org",
      orgId,
      "deals",
      body.dealId,
      runId ?? "no-run",
      `${Date.now()}-${body.filename}`,
    ].join("/");

    const { data: signed, error: signError } = await supabase.storage
      .from("evidence")
      .createSignedUploadUrl(storageKey);

    if (signError || !signed?.token) {
      console.error("[v1-evidence-start] createSignedUploadUrl error", signError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to create signed upload URL" },
        500,
      );
    }

    const insertPayload = {
      org_id: orgId,
      deal_id: body.dealId,
      run_id: runId,
      kind: body.kind,
      storage_key: storageKey,
      filename: body.filename,
      sha256: body.sha256,
      bytes: body.bytes,
      mime_type: body.mimeType,
      created_by: userId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("evidence")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("[v1-evidence-start] insert error", insertError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to insert evidence row" },
        500,
      );
    }

    return jsonResponse(
      req,
      {
        ok: true,
        evidence: mapRow(inserted),
        uploadUrl: signed.signedUrl ?? null,
        storageKey,
        token: signed.token,
      },
      200,
    );
  } catch (err) {
    console.error("[v1-evidence-start] unexpected error", err);
    return jsonResponse(
      req,
      { ok: false, error: "Internal error" },
      500,
    );
  }
});
