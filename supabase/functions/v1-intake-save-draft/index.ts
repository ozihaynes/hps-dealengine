import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * v1-intake-save-draft
 *
 * Public endpoint (no JWT required) for saving draft intake submissions.
 * Token is passed via x-intake-token header.
 *
 * Upserts a draft submission with the provided payload.
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

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "PUT") {
    return jsonResponse(
      req,
      { ok: false, error: "METHOD_NOT_ALLOWED", message: "Use PUT" },
      405,
    );
  }

  // Get token from header
  const token = req.headers.get("x-intake-token");
  if (!token || token.length !== 64) {
    return jsonResponse(
      req,
      { ok: false, error: "TOKEN_INVALID", message: "Invalid or missing token" },
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
      { ok: false, error: "INVALID_JSON", message: "Body must be valid JSON" },
      400,
    );
  }

  const payload = body as {
    intake_link_id?: string;
    payload_json?: Record<string, unknown>;
    last_section_index?: number;
  };

  if (!payload.intake_link_id || !payload.payload_json) {
    return jsonResponse(
      req,
      { ok: false, error: "INVALID_REQUEST", message: "intake_link_id and payload_json are required" },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      req,
      { ok: false, error: "CONFIG_ERROR", message: "Missing Supabase config" },
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
      console.error("[v1-intake-save-draft] link lookup failed", linkError);
      return jsonResponse(
        req,
        { ok: false, error: "LOOKUP_FAILED", message: "Failed to validate token" },
        500,
      );
    }

    if (!link) {
      return jsonResponse(
        req,
        { ok: false, error: "TOKEN_INVALID", message: "Token does not match link" },
        401,
      );
    }

    // Check link is still valid
    if (link.status === "REVOKED") {
      return jsonResponse(
        req,
        { ok: false, error: "LINK_REVOKED", message: "This link has been revoked" },
        403,
      );
    }

    // Note: We allow saving for SUBMITTED links to enable edit-in-place functionality
    // The submission will be reverted to DRAFT status when edited

    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) {
      return jsonResponse(
        req,
        { ok: false, error: "LINK_EXPIRED", message: "This link has expired" },
        403,
      );
    }

    // Check for existing editable submission (DRAFT, SUBMITTED, or REVISION_REQUESTED)
    // These statuses allow the client to continue editing
    const { data: existingSubmission, error: existingError } = await supabase
      .from("intake_submissions")
      .select("id, status")
      .eq("intake_link_id", link.id)
      .in("status", ["DRAFT", "SUBMITTED", "REVISION_REQUESTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("[v1-intake-save-draft] existing submission lookup failed", existingError);
    }

    // Check if there's a submission in a non-editable state
    if (!existingSubmission) {
      const { data: lockedSubmission } = await supabase
        .from("intake_submissions")
        .select("id, status")
        .eq("intake_link_id", link.id)
        .in("status", ["PENDING_REVIEW", "COMPLETED", "REJECTED"])
        .limit(1)
        .maybeSingle();

      if (lockedSubmission) {
        return jsonResponse(
          req,
          {
            ok: false,
            error: "SUBMISSION_LOCKED",
            message: `This submission is ${lockedSubmission.status.toLowerCase().replace("_", " ")} and cannot be edited`,
          },
          403,
        );
      }
    }

    let submissionId: string;
    let updatedAt: string;

    if (existingSubmission) {
      // Update existing submission
      // Reset status to DRAFT if it was SUBMITTED or REVISION_REQUESTED (edit-in-place)
      const updateData: Record<string, unknown> = {
        payload_json: payload.payload_json,
        updated_at: new Date().toISOString(),
        status: "DRAFT", // Always revert to DRAFT when saving
      };

      // Include last_section_index if provided
      if (typeof payload.last_section_index === "number") {
        updateData.last_section_index = payload.last_section_index;
      }

      const { data: updated, error: updateError } = await supabase
        .from("intake_submissions")
        .update(updateData)
        .eq("id", existingSubmission.id)
        .select("id, updated_at")
        .maybeSingle();

      if (updateError || !updated) {
        console.error("[v1-intake-save-draft] update failed", updateError);
        return jsonResponse(
          req,
          { ok: false, error: "UPDATE_FAILED", message: "Failed to save draft" },
          500,
        );
      }

      submissionId = updated.id;
      updatedAt = updated.updated_at;

      // Update link status back to IN_PROGRESS if submission was being edited
      if (existingSubmission.status !== "DRAFT") {
        await supabase
          .from("intake_links")
          .update({ status: "IN_PROGRESS" })
          .eq("id", link.id);
      }
    } else {
      // Create new draft
      const insertData: Record<string, unknown> = {
        org_id: link.org_id,
        deal_id: link.deal_id,
        intake_link_id: link.id,
        intake_schema_version_id: link.intake_schema_version_id,
        source: "public_token",
        payload_json: payload.payload_json,
        status: "DRAFT",
        revision_cycle: 1,
      };

      // Include last_section_index if provided
      if (typeof payload.last_section_index === "number") {
        insertData.last_section_index = payload.last_section_index;
      }

      const { data: created, error: createError } = await supabase
        .from("intake_submissions")
        .insert(insertData)
        .select("id, updated_at")
        .maybeSingle();

      if (createError || !created) {
        console.error("[v1-intake-save-draft] create failed", createError);
        return jsonResponse(
          req,
          { ok: false, error: "CREATE_FAILED", message: "Failed to save draft" },
          500,
        );
      }

      submissionId = created.id;
      updatedAt = created.updated_at;
    }

    // Update link status to IN_PROGRESS if currently SENT
    if (link.status === "SENT") {
      await supabase
        .from("intake_links")
        .update({ status: "IN_PROGRESS" })
        .eq("id", link.id);
    }

    return jsonResponse(req, {
      submission_id: submissionId,
      status: "DRAFT",
      updated_at: updatedAt,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-save-draft] error", err);
    const message = err instanceof Error ? err.message : "Failed to save draft";
    return jsonResponse(
      req,
      { ok: false, error: "SAVE_DRAFT_ERROR", message },
      500,
    );
  }
});
