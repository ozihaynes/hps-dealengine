import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import { sendEmail } from "../_shared/email.ts";
import { revisionRequestEmail } from "../_shared/emailTemplates.ts";

/**
 * v1-intake-request-revision
 *
 * Staff endpoint (JWT required) for requesting client revisions.
 * Creates new token and intake_link for client to resubmit.
 */

const MAX_REVISION_CYCLES = 3;
const DEFAULT_EXPIRY_DAYS = 7;
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://hps-dealengine.vercel.app";

/**
 * Generate a cryptographically secure random token (32 bytes = 64 hex chars)
 */
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use POST" },
      405,
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

  const payload = body as { submission_id?: string; request_notes?: string };

  if (!payload.submission_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "submission_id is required" },
      400,
    );
  }

  if (!payload.request_notes || payload.request_notes.length < 10) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "request_notes must be at least 10 characters" },
      400,
    );
  }

  let supabase;
  try {
    supabase = createSupabaseClient(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Supabase config missing";
    return jsonResponse(
      req,
      { ok: false, error: "config_error", message },
      500,
    );
  }

  // Verify JWT and get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(
      req,
      { ok: false, error: "unauthorized", message: "Valid JWT required" },
      401,
    );
  }

  const userId = userData.user.id;

  try {
    // Get user's org memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("[v1-intake-request-revision] memberships lookup failed", membershipError);
      return jsonResponse(
        req,
        { ok: false, error: "membership_lookup_failed", message: "Failed to resolve memberships" },
        500,
      );
    }

    const memberOrgIds = (memberships ?? [])
      .map((row: { org_id: string | null }) => row.org_id)
      .filter((id): id is string => !!id);

    if (memberOrgIds.length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "no_memberships", message: "No memberships found for user" },
        403,
      );
    }

    // Fetch submission
    const { data: submission, error: submissionError } = await supabase
      .from("intake_submissions")
      .select("*")
      .eq("id", payload.submission_id)
      .in("org_id", memberOrgIds)
      .maybeSingle();

    if (submissionError) {
      console.error("[v1-intake-request-revision] submission query failed", submissionError);
      return jsonResponse(
        req,
        { ok: false, error: "query_failed", message: "Failed to fetch submission" },
        500,
      );
    }

    if (!submission) {
      return jsonResponse(
        req,
        { ok: false, error: "not_found", message: "Submission not found or access denied" },
        404,
      );
    }

    // Check revision cycle limit
    if (submission.revision_cycle >= MAX_REVISION_CYCLES) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "max_revisions_exceeded",
          message: `Maximum revision cycles (${MAX_REVISION_CYCLES}) reached`,
        },
        400,
      );
    }

    // Get original link for recipient info
    const { data: originalLink } = await supabase
      .from("intake_links")
      .select("recipient_email, recipient_name, intake_schema_version_id")
      .eq("id", submission.intake_link_id)
      .maybeSingle();

    const recipientEmail = originalLink?.recipient_email ?? "unknown@example.com";
    const recipientName = originalLink?.recipient_name ?? null;
    const schemaVersionId = submission.intake_schema_version_id;

    // Generate new token
    const plainToken = generateSecureToken();
    const tokenHash = await hashToken(plainToken);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date().toISOString();

    // Create new intake_link
    const { data: newLink, error: linkError } = await supabase
      .from("intake_links")
      .insert({
        org_id: submission.org_id,
        deal_id: submission.deal_id,
        intake_schema_version_id: schemaVersionId,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        token_hash: tokenHash,
        status: "SENT",
        expires_at: expiresAt.toISOString(),
        send_count: 1,
        last_sent_at: now,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (linkError || !newLink) {
      console.error("[v1-intake-request-revision] link insert failed", linkError);
      return jsonResponse(
        req,
        { ok: false, error: "link_create_failed", message: "Failed to create new link" },
        500,
      );
    }

    // Create revision request record
    const { data: revisionRequest, error: revisionError } = await supabase
      .from("intake_revision_requests")
      .insert({
        org_id: submission.org_id,
        intake_submission_id: submission.id,
        requested_by: userId,
        request_notes: payload.request_notes,
        new_link_id: newLink.id,
      })
      .select("id")
      .maybeSingle();

    if (revisionError || !revisionRequest) {
      console.error("[v1-intake-request-revision] revision request insert failed", revisionError);
      return jsonResponse(
        req,
        { ok: false, error: "revision_create_failed", message: "Failed to create revision request" },
        500,
      );
    }

    // Update submission status to REVISION_REQUESTED and increment cycle
    const { error: updateError } = await supabase
      .from("intake_submissions")
      .update({
        status: "REVISION_REQUESTED",
        revision_cycle: submission.revision_cycle + 1,
        updated_at: now,
      })
      .eq("id", submission.id);

    if (updateError) {
      console.error("[v1-intake-request-revision] submission update failed", updateError);
    }

    // Revoke old link if exists
    if (submission.intake_link_id) {
      await supabase
        .from("intake_links")
        .update({ status: "REVOKED" })
        .eq("id", submission.intake_link_id);
    }

    // Get deal address for email
    const { data: deal } = await supabase
      .from("deals")
      .select("address, city, state, zip")
      .eq("id", submission.deal_id)
      .maybeSingle();

    const dealAddress = deal
      ? [deal.address, deal.city, deal.state, deal.zip].filter(Boolean).join(", ")
      : "Property";

    // Build intake URL
    const intakeUrl = `${PUBLIC_APP_URL}/intake/${plainToken}`;

    // Send revision request email
    const emailContent = revisionRequestEmail(
      recipientName,
      intakeUrl,
      expiresAt.toISOString(),
      dealAddress,
      payload.request_notes,
    );

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return jsonResponse(req, {
      revision_request_id: revisionRequest.id,
      new_link_id: newLink.id,
      new_token: plainToken,
      email_sent: emailResult.success,
      email_send_id: emailResult.messageId,
      email_error: emailResult.error,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err: unknown) {
    console.error("[v1-intake-request-revision] error", err);
    const message = err instanceof Error ? err.message : "Failed to request revision";
    return jsonResponse(
      req,
      { ok: false, error: "revision_error", message },
      500,
    );
  }
});
