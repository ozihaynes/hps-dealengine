import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * v1-intake-upload-start
 *
 * Public endpoint (no JWT required) for initiating file uploads.
 * Token is passed via x-intake-token header.
 *
 * Creates intake_submission_files row and returns signed upload URL.
 */

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES_PER_SUBMISSION = 10;

/**
 * Compute SHA-256 hash of a token string
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get file extension from MIME type
 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mimeType] ?? "bin";
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use POST" },
      405,
    );
  }

  // Get token from header
  const token = req.headers.get("x-intake-token");
  if (!token || token.length !== 64) {
    return jsonResponse(
      req,
      { ok: false, error: "token_invalid", message: "Invalid or missing token" },
      401,
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_json", message: "Body must be valid JSON" },
      400,
    );
  }

  const payload = body as {
    intake_link_id?: string;
    filename?: string;
    mime_type?: string;
    size_bytes?: number;
    upload_key?: string;  // Optional: maps to evidence_uploads key in schema
  };

  // Validate required fields
  if (!payload.intake_link_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "intake_link_id is required" },
      400,
    );
  }

  if (!payload.filename || !payload.mime_type || !payload.size_bytes) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "filename, mime_type, and size_bytes are required" },
      400,
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(payload.mime_type)) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "invalid_mime_type",
        message: `File type not allowed. Allowed types: PDF, JPEG, PNG, DOCX, XLSX`,
        allowed_types: ALLOWED_MIME_TYPES,
      },
      400,
    );
  }

  // Validate file size
  if (payload.size_bytes > MAX_FILE_SIZE) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "file_too_large",
        message: `File exceeds maximum size of 25MB`,
        max_size_bytes: MAX_FILE_SIZE,
      },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      req,
      { ok: false, error: "config_error", message: "Missing Supabase config" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Hash the token for comparison
    const tokenHash = await hashToken(token);

    // Verify token matches the link
    const { data: link, error: linkError } = await supabase
      .from("intake_links")
      .select("id, org_id, deal_id, intake_schema_version_id, status, expires_at, consumed_at")
      .eq("id", payload.intake_link_id)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (linkError) {
      console.error("[v1-intake-upload-start] link lookup failed", linkError);
      return jsonResponse(
        req,
        { ok: false, error: "lookup_failed", message: "Failed to validate token" },
        500,
      );
    }

    if (!link) {
      return jsonResponse(
        req,
        { ok: false, error: "token_invalid", message: "Token does not match link" },
        401,
      );
    }

    // Check link is still valid
    if (link.status === "REVOKED") {
      return jsonResponse(
        req,
        { ok: false, error: "link_revoked", message: "This link has been revoked" },
        403,
      );
    }

    if (link.status === "SUBMITTED" || link.consumed_at) {
      return jsonResponse(
        req,
        { ok: false, error: "link_consumed", message: "This form has already been submitted" },
        403,
      );
    }

    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) {
      return jsonResponse(
        req,
        { ok: false, error: "link_expired", message: "This link has expired" },
        403,
      );
    }

    // Get or create submission
    let submissionId: string;
    const { data: existingSubmission, error: existingError } = await supabase
      .from("intake_submissions")
      .select("id")
      .eq("intake_link_id", link.id)
      .in("status", ["DRAFT", "SUBMITTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("[v1-intake-upload-start] submission lookup failed", existingError);
      return jsonResponse(
        req,
        { ok: false, error: "lookup_failed", message: "Failed to find submission" },
        500,
      );
    }

    if (existingSubmission) {
      submissionId = existingSubmission.id;
    } else {
      // Create new draft submission
      const { data: created, error: createError } = await supabase
        .from("intake_submissions")
        .insert({
          org_id: link.org_id,
          deal_id: link.deal_id,
          intake_link_id: link.id,
          intake_schema_version_id: link.intake_schema_version_id,
          source: "public_token",
          payload_json: {},
          status: "DRAFT",
          revision_cycle: 1,
        })
        .select("id")
        .maybeSingle();

      if (createError || !created) {
        console.error("[v1-intake-upload-start] submission create failed", createError);
        return jsonResponse(
          req,
          { ok: false, error: "create_failed", message: "Failed to create submission" },
          500,
        );
      }

      submissionId = created.id;

      // Update link status to IN_PROGRESS
      await supabase
        .from("intake_links")
        .update({ status: "IN_PROGRESS" })
        .eq("id", link.id);
    }

    // Check file count limit
    const { count: fileCount, error: countError } = await supabase
      .from("intake_submission_files")
      .select("id", { count: "exact", head: true })
      .eq("intake_submission_id", submissionId);

    if (countError) {
      console.error("[v1-intake-upload-start] file count failed", countError);
    }

    if ((fileCount ?? 0) >= MAX_FILES_PER_SUBMISSION) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "too_many_files",
          message: `Maximum ${MAX_FILES_PER_SUBMISSION} files allowed per submission`,
          max_files: MAX_FILES_PER_SUBMISSION,
        },
        400,
      );
    }

    // Generate file ID and object key
    const fileId = crypto.randomUUID();
    const ext = getExtension(payload.mime_type);
    const objectKey = `quarantine/${submissionId}/${fileId}.${ext}`;

    // Create file record
    const { data: fileRecord, error: fileError } = await supabase
      .from("intake_submission_files")
      .insert({
        id: fileId,
        org_id: link.org_id,
        deal_id: link.deal_id,
        intake_submission_id: submissionId,
        intake_link_id: link.id,
        bucket_id: "intake",
        object_key: objectKey,
        original_filename: payload.filename,
        mime_type: payload.mime_type,
        size_bytes: payload.size_bytes,
        storage_state: "QUARANTINE",
        scan_status: "PENDING",
      })
      .select("id, object_key, created_at")
      .maybeSingle();

    if (fileError || !fileRecord) {
      console.error("[v1-intake-upload-start] file record create failed", fileError);
      return jsonResponse(
        req,
        { ok: false, error: "create_failed", message: "Failed to create file record" },
        500,
      );
    }

    // Create signed upload URL (5 minute expiry)
    const { data: signedUrl, error: signedError } = await supabase.storage
      .from("intake")
      .createSignedUploadUrl(objectKey);

    if (signedError || !signedUrl) {
      console.error("[v1-intake-upload-start] signed URL failed", signedError);
      // Clean up file record
      await supabase
        .from("intake_submission_files")
        .delete()
        .eq("id", fileId);
      return jsonResponse(
        req,
        { ok: false, error: "signed_url_failed", message: "Failed to create upload URL" },
        500,
      );
    }

    console.log("[v1-intake-upload-start] upload initiated", {
      file_id: fileId,
      submission_id: submissionId,
      filename: payload.filename,
    });

    return jsonResponse(req, {
      file_id: fileId,
      submission_id: submissionId,
      object_key: objectKey,
      upload_url: signedUrl.signedUrl,
      upload_token: signedUrl.token,
      expires_in_seconds: 300,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-upload-start] error", err);
    const message = err instanceof Error ? err.message : "Failed to initiate upload";
    return jsonResponse(
      req,
      { ok: false, error: "upload_start_error", message },
      500,
    );
  }
});
