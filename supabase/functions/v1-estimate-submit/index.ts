// ============================================================================
// EDGE FUNCTION: v1-estimate-submit
// ============================================================================
// Purpose: Handle GC estimate file submission via magic link
// Auth: Anonymous (validated via submission_token)
// Side effects: Uploads file, updates estimate_request status
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /functions/v1/v1-estimate-submit
 *
 * Accepts multipart form data:
 * - token: submission_token (required)
 * - file: estimate file (required)
 * - gc_notes: optional notes from GC
 */
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    // ========================================================================
    // METHOD CHECK
    // ========================================================================
    if (req.method !== "POST") {
      return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
    }

    // ========================================================================
    // ENVIRONMENT CHECK
    // ========================================================================
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[v1-estimate-submit] Missing environment variables");
      return jsonResponse(
        req,
        { ok: false, error: "Server configuration error" },
        500
      );
    }

    // ========================================================================
    // PARSE FORM DATA
    // ========================================================================
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid form data" }, 400);
    }

    const token = formData.get("token") as string | null;
    const file = formData.get("file") as File | null;
    const gcNotes = formData.get("gc_notes") as string | null;

    // ========================================================================
    // VALIDATE INPUTS
    // ========================================================================
    if (!token) {
      return jsonResponse(
        req,
        { ok: false, error: "Missing submission token" },
        400
      );
    }

    if (!file) {
      return jsonResponse(req, { ok: false, error: "Missing file" }, 400);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid file type. Allowed: PDF, JPG, PNG, WebP" },
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        req,
        { ok: false, error: "File too large (max 10MB)" },
        400
      );
    }

    // Validate file size > 0
    if (file.size === 0) {
      return jsonResponse(req, { ok: false, error: "File is empty" }, 400);
    }

    // Validate token format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid submission link" },
        400
      );
    }

    // ========================================================================
    // CREATE SUPABASE CLIENT (service role for storage access)
    // ========================================================================
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ========================================================================
    // VALIDATE TOKEN
    // ========================================================================
    const { data: request, error: tokenError } = await supabase
      .from("estimate_requests")
      .select("id, org_id, deal_id, gc_name, status, token_expires_at")
      .eq("submission_token", token)
      .single();

    if (tokenError || !request) {
      console.log(
        "[v1-estimate-submit] Invalid token:",
        token.slice(0, 8) + "..."
      );
      return jsonResponse(
        req,
        { ok: false, error: "Invalid submission link" },
        400
      );
    }

    // Check status
    if (request.status === "submitted") {
      return jsonResponse(
        req,
        { ok: false, error: "Estimate already submitted" },
        400
      );
    }

    if (request.status === "cancelled") {
      return jsonResponse(
        req,
        { ok: false, error: "This request has been cancelled" },
        400
      );
    }

    if (request.status === "expired") {
      return jsonResponse(
        req,
        { ok: false, error: "This link has expired" },
        400
      );
    }

    // Check expiry
    if (new Date() > new Date(request.token_expires_at)) {
      // Update status to expired
      await supabase
        .from("estimate_requests")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      return jsonResponse(
        req,
        { ok: false, error: "This link has expired" },
        400
      );
    }

    // ========================================================================
    // UPLOAD FILE TO STORAGE
    // ========================================================================
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const sanitizedExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(fileExt)
      ? fileExt
      : "pdf";

    // Path: {org_id}/{deal_id}/{request_id}/estimate_{timestamp}.{ext}
    const filePath = `${request.org_id}/${request.deal_id}/${request.id}/estimate_${Date.now()}.${sanitizedExt}`;

    const { error: uploadError } = await supabase.storage
      .from("repair-estimates")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite
      });

    if (uploadError) {
      console.error("[v1-estimate-submit] Upload error:", uploadError);
      return jsonResponse(
        req,
        { ok: false, error: "File upload failed. Please try again." },
        500
      );
    }

    // ========================================================================
    // UPDATE ESTIMATE REQUEST
    // ========================================================================
    const { error: updateError } = await supabase
      .from("estimate_requests")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        estimate_file_path: filePath,
        estimate_file_name: file.name,
        estimate_file_size_bytes: file.size,
        estimate_file_type: file.type,
        gc_notes: gcNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("[v1-estimate-submit] Update error:", updateError);
      // Try to clean up uploaded file
      await supabase.storage.from("repair-estimates").remove([filePath]);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to save submission" },
        500
      );
    }

    // ========================================================================
    // NOTIFY DEAL OWNER (Slice F)
    // ========================================================================
    try {
      // Get deal info for property address
      const { data: deal } = await supabase
        .from("deals")
        .select("address, created_by")
        .eq("id", request.deal_id)
        .single();

      // Get owner's email from profiles
      if (deal?.created_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", deal.created_by)
          .single();

        if (profile?.email) {
          const appUrl = Deno.env.get("APP_URL") || "https://app.hpsdealengine.com";
          const viewUrl = `${appUrl}/deals/${request.deal_id}?tab=repairs`;
          const propertyAddress = deal.address || "your property";
          const ownerName = profile.full_name || "there";

          await sendEmail({
            to: profile.email,
            subject: `📋 Estimate Received: ${propertyAddress}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background-color: #1e293b; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
              <h1 style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">
                HPS DealEngine
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #f1f5f9; font-size: 18px; font-weight: 600;">
                Hi ${ownerName},
              </p>
              <p style="margin: 0 0 24px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                Great news! <strong style="color: #f1f5f9;">${request.gc_name}</strong> has submitted their repair estimate for:
              </p>
              <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 600;">
                  📍 ${propertyAddress}
                </p>
              </div>
              <p style="margin: 0 0 24px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                View the submitted estimate in your DealEngine dashboard.
              </p>
              <a href="${viewUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                View Estimate →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                HPS DealEngine • Automated notification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
          });
          console.log(`[v1-estimate-submit] Notification sent to: ${profile.email}`);
        }
      }
    } catch (notifyError) {
      // Don't fail the submission if notification fails
      console.warn("[v1-estimate-submit] Notification failed:", notifyError);
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log(
      `[v1-estimate-submit] Submitted: ${request.id} by ${request.gc_name}`
    );

    return jsonResponse(req, {
      ok: true,
      message: "Estimate submitted successfully!",
    });
  } catch (err) {
    console.error("[v1-estimate-submit] Unexpected error:", err);
    return jsonResponse(
      req,
      { ok: false, error: "An unexpected error occurred" },
      500
    );
  }
});
