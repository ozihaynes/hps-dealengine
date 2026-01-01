import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * v1-intake-upload-complete
 *
 * Public endpoint (no JWT required) for completing file uploads.
 * Token is passed via x-intake-token header.
 *
 * Verifies file exists in storage and triggers stub virus scan.
 * In production, this would integrate with a real virus scanner.
 */

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
 * Stub virus scanner - always marks files as CLEAN after a delay
 * In production, replace with actual virus scanning integration
 */
async function stubVirusScan(_objectKey: string): Promise<{
  status: "CLEAN" | "INFECTED" | "SCAN_FAILED";
  details: Record<string, unknown>;
}> {
  // Simulate scan delay (1 second)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Stub: always return CLEAN
  return {
    status: "CLEAN",
    details: {
      scanner: "stub",
      scan_time_ms: 1000,
      threats_found: 0,
    },
  };
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
    file_id?: string;
  };

  // Validate required fields
  if (!payload.intake_link_id || !payload.file_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "intake_link_id and file_id are required" },
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
      .select("id, org_id, status, expires_at, consumed_at")
      .eq("id", payload.intake_link_id)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (linkError) {
      console.error("[v1-intake-upload-complete] link lookup failed", linkError);
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

    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) {
      return jsonResponse(
        req,
        { ok: false, error: "link_expired", message: "This link has expired" },
        403,
      );
    }

    // Get file record
    const { data: fileRecord, error: fileError } = await supabase
      .from("intake_submission_files")
      .select("id, bucket_id, object_key, storage_state, scan_status, intake_link_id")
      .eq("id", payload.file_id)
      .eq("intake_link_id", link.id)
      .maybeSingle();

    if (fileError) {
      console.error("[v1-intake-upload-complete] file lookup failed", fileError);
      return jsonResponse(
        req,
        { ok: false, error: "lookup_failed", message: "Failed to find file record" },
        500,
      );
    }

    if (!fileRecord) {
      return jsonResponse(
        req,
        { ok: false, error: "file_not_found", message: "File record not found" },
        404,
      );
    }

    // Check if already scanned
    if (fileRecord.scan_status !== "PENDING") {
      return jsonResponse(req, {
        file_id: fileRecord.id,
        scan_status: fileRecord.scan_status,
        storage_state: fileRecord.storage_state,
        already_scanned: true,
      });
    }

    // Verify file exists in storage
    const { data: fileExists, error: storageError } = await supabase.storage
      .from(fileRecord.bucket_id)
      .list(fileRecord.object_key.replace(/\/[^/]+$/, ""), {
        limit: 1,
        search: fileRecord.object_key.split("/").pop(),
      });

    if (storageError) {
      console.error("[v1-intake-upload-complete] storage check failed", storageError);
    }

    const fileFound = fileExists && fileExists.length > 0;

    if (!fileFound) {
      // File not uploaded yet or upload failed
      return jsonResponse(
        req,
        {
          ok: false,
          error: "file_not_uploaded",
          message: "File has not been uploaded to storage yet",
        },
        400,
      );
    }

    // Run virus scan (stub)
    const scanResult = await stubVirusScan(fileRecord.object_key);
    const now = new Date().toISOString();

    // Determine storage state based on scan result
    let storageState: "CLEAN" | "INFECTED" | "QUARANTINE" = "QUARANTINE";
    if (scanResult.status === "CLEAN") {
      storageState = "CLEAN";
    } else if (scanResult.status === "INFECTED") {
      storageState = "INFECTED";
    }

    // Update file record with scan results
    const { data: updatedFile, error: updateError } = await supabase
      .from("intake_submission_files")
      .update({
        scan_status: scanResult.status,
        storage_state: storageState,
        scanned_at: now,
        scan_details_json: scanResult.details,
        updated_at: now,
      })
      .eq("id", payload.file_id)
      .select("id, scan_status, storage_state, scanned_at")
      .maybeSingle();

    if (updateError || !updatedFile) {
      console.error("[v1-intake-upload-complete] update failed", updateError);
      return jsonResponse(
        req,
        { ok: false, error: "update_failed", message: "Failed to update file record" },
        500,
      );
    }

    console.log("[v1-intake-upload-complete] scan complete", {
      file_id: payload.file_id,
      scan_status: scanResult.status,
    });

    return jsonResponse(req, {
      file_id: updatedFile.id,
      scan_status: updatedFile.scan_status,
      storage_state: updatedFile.storage_state,
      scanned_at: updatedFile.scanned_at,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-upload-complete] error", err);
    const message = err instanceof Error ? err.message : "Failed to complete upload";
    return jsonResponse(
      req,
      { ok: false, error: "upload_complete_error", message },
      500,
    );
  }
});
