import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

// =============================================================================
// INLINE SCHEMAS (Deno Edge Functions cannot import from npm packages)
// =============================================================================

const ImportKindSchema = z.enum(["deals", "contacts"]);
const FileTypeSchema = z.enum(["csv", "xlsx", "json"]);
const SourceRouteSchema = z.enum(["startup", "deals", "import"]);
const JobStatusSchema = z.enum([
  "draft",
  "mapped",
  "validating",
  "ready",
  "promoting",
  "complete",
  "failed",
  "archived",
]);

const BodySchema = z.object({
  source_route: SourceRouteSchema,
  import_kind: ImportKindSchema.default("deals"),
  file_type: FileTypeSchema,
  file_name: z.string().min(1).max(255),
  file_size_bytes: z.number().int().positive().max(52428800), // 50MB max
  file_sha256: z.string().regex(/^[0-9a-f]{64}$/i, "sha256 must be 64 hex characters"),
});

// =============================================================================
// ENVIRONMENT
// =============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[v1-import-job-create] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
}

// =============================================================================
// HELPERS
// =============================================================================

function mapJobRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    created_by: row.created_by as string,
    source_route: row.source_route as string,
    import_kind: row.import_kind as string,
    file_type: row.file_type as string,
    file_name: row.file_name as string,
    file_size_bytes: Number(row.file_size_bytes),
    file_sha256: row.file_sha256 as string,
    storage_bucket: row.storage_bucket as string,
    storage_path: row.storage_path as string,
    column_mapping: row.column_mapping,
    status: row.status as string,
    status_message: row.status_message as string | null,
    rows_total: Number(row.rows_total ?? 0),
    rows_valid: Number(row.rows_valid ?? 0),
    rows_needs_fix: Number(row.rows_needs_fix ?? 0),
    rows_promoted: Number(row.rows_promoted ?? 0),
    rows_skipped_duplicate: Number(row.rows_skipped_duplicate ?? 0),
    rows_skipped_other: Number(row.rows_skipped_other ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// =============================================================================
// HANDLER
// =============================================================================

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
    }

    // Require Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { ok: false, error: "Missing Authorization header" }, 401);
    }

    // Parse and validate request body
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      console.error("[v1-import-job-create] invalid body", parsed.error.format());
      return jsonResponse(
        req,
        { ok: false, error: "Invalid request body", details: parsed.error.format() },
        400
      );
    }
    const body = parsed.data;

    // Create Supabase client with caller's JWT for RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Validate caller JWT and get userId
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      console.error("[v1-import-job-create] auth error", userError);
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Resolve org_id from memberships (user may have multiple, use first active)
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1);

    if (membershipError) {
      console.error("[v1-import-job-create] membership lookup failed", membershipError);
      return jsonResponse(req, { ok: false, error: "Failed to resolve organization" }, 500);
    }

    if (!memberships || memberships.length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "No organization membership found" },
        403
      );
    }

    const orgId = memberships[0].org_id as string;

    // Build storage path: org/{org_id}/imports/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFilename = body.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `org/${orgId}/imports/${timestamp}-${sanitizedFilename}`;
    const storageBucket = "imports";

    // Create signed upload URL
    const { data: signed, error: signError } = await supabase.storage
      .from(storageBucket)
      .createSignedUploadUrl(storagePath);

    if (signError || !signed?.signedUrl) {
      console.error("[v1-import-job-create] createSignedUploadUrl error", signError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to create signed upload URL" },
        500
      );
    }

    // Insert job row into deal_import_jobs
    const insertPayload = {
      org_id: orgId,
      created_by: userId,
      source_route: body.source_route,
      import_kind: body.import_kind,
      file_type: body.file_type,
      file_name: body.file_name,
      file_size_bytes: body.file_size_bytes,
      file_sha256: body.file_sha256.toLowerCase(),
      storage_bucket: storageBucket,
      storage_path: storagePath,
      status: "draft" as const,
    };

    const { data: insertedJob, error: insertError } = await supabase
      .from("deal_import_jobs")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      // Check for unique constraint violation (duplicate file)
      if (insertError.code === "23505") {
        console.warn("[v1-import-job-create] duplicate file detected", insertError);
        return jsonResponse(
          req,
          {
            ok: false,
            error: "A job with this file already exists for your organization",
            code: "DUPLICATE_FILE",
          },
          409
        );
      }
      console.error("[v1-import-job-create] insert error", insertError);
      return jsonResponse(req, { ok: false, error: "Failed to create import job" }, 500);
    }

    if (!insertedJob) {
      return jsonResponse(req, { ok: false, error: "Failed to create import job" }, 500);
    }

    // Return success response
    return jsonResponse(
      req,
      {
        ok: true,
        job: mapJobRow(insertedJob),
        upload_url: signed.signedUrl,
        upload_path: storagePath,
      },
      201
    );
  } catch (err) {
    console.error("[v1-import-job-create] unexpected error", err);
    return jsonResponse(req, { ok: false, error: "Internal error" }, 500);
  }
});
