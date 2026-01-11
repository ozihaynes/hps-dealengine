// ============================================================================
// EDGE FUNCTION: v1-estimate-request
// ============================================================================
// Purpose: Send estimate request email to GC with magic link
// Auth: Requires authenticated user
// Side effects: Creates estimate_request row, sends email via Resend
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") || "https://app.hpsdealengine.com";

interface RequestBody {
  deal_id: string;
  gc_name: string;
  gc_email: string;
  gc_phone?: string | null;
  gc_company?: string | null;
  request_notes?: string | null;
}

function isValidEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

/**
 * POST /functions/v1/v1-estimate-request
 *
 * Creates estimate request and sends email to GC with magic link.
 * Requires authenticated user who is a member of the deal's organization.
 */
serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid JSON body" },
        400
      );
    }

    // Validate required fields
    if (!body.deal_id) {
      return jsonResponse(
        req,
        { ok: false, error: "deal_id is required", field: "deal_id" },
        400
      );
    }
    if (!body.gc_name || body.gc_name.trim().length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "gc_name is required", field: "gc_name" },
        400
      );
    }
    if (!body.gc_email) {
      return jsonResponse(
        req,
        { ok: false, error: "gc_email is required", field: "gc_email" },
        400
      );
    }
    if (!isValidEmail(body.gc_email)) {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid email format", field: "gc_email" },
        400
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }

    // Get user's organization membership
    const { data: membership } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return jsonResponse(
        req,
        { ok: false, error: "User is not a member of any organization" },
        403
      );
    }

    // Verify deal belongs to user's org
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, address, org_id")
      .eq("id", body.deal_id)
      .single();

    if (dealError || !deal) {
      return jsonResponse(
        req,
        { ok: false, error: "Deal not found" },
        404
      );
    }

    if (deal.org_id !== membership.org_id) {
      return jsonResponse(
        req,
        { ok: false, error: "Deal does not belong to your organization" },
        403
      );
    }

    const normalizedEmail = body.gc_email.toLowerCase().trim();
    const normalizedName = body.gc_name.trim();

    // Create estimate request
    const { data: estimateRequest, error: insertError } = await supabase
      .from("estimate_requests")
      .insert({
        org_id: membership.org_id,
        deal_id: body.deal_id,
        gc_name: normalizedName,
        gc_email: normalizedEmail,
        gc_phone: body.gc_phone || null,
        gc_company: body.gc_company || null,
        request_notes: body.request_notes || null,
        created_by: user.id,
        status: "pending",
      })
      .select("id, submission_token, token_expires_at")
      .single();

    if (insertError) {
      console.error("[v1-estimate-request] Insert error:", insertError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to create request" },
        500
      );
    }

    // Generate magic link
    const submissionUrl = `${APP_URL}/submit-estimate?token=${estimateRequest.submission_token}`;

    // Format expiry date for email
    const expiresDate = new Date(estimateRequest.token_expires_at).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    // Generate email content
    const propertyAddress = deal.address || "Property";
    const notesSection = body.request_notes
      ? `
        <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 3px solid #22c55e;">
          <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
            Notes from requestor
          </p>
          <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0; line-height: 1.6;">
            ${escapeHtml(body.request_notes)}
          </p>
        </div>`
      : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Repair Estimate Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">

          <!-- Header -->
          <tr>
            <td style="padding: 48px 40px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
                HPS DealEngine
              </h1>
              <p style="color: rgba(255, 255, 255, 0.5); font-size: 14px; margin: 8px 0 0; font-weight: 400;">
                Repair Estimate Request
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px; font-weight: 600;">
                Hi ${escapeHtml(normalizedName)},
              </h2>

              <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                You've been invited to provide a repair estimate for the following property:
              </p>

              <!-- Property Card -->
              <div style="background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="color: #22c55e; font-size: 11px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                  Property Address
                </p>
                <p style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 600;">
                  ${escapeHtml(propertyAddress)}
                </p>
              </div>

              ${notesSection}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${escapeHtml(submissionUrl)}"
                       style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Submit Your Estimate
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; text-align: center;">
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0;">
                  This link expires on <strong style="color: rgba(255, 255, 255, 0.8);">${escapeHtml(expiresDate)}</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 13px; margin: 0; text-align: center; line-height: 1.6;">
                If you didn't expect this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>

        <p style="color: rgba(255, 255, 255, 0.3); font-size: 12px; margin: 24px 0 0; text-align: center;">
          &copy; ${new Date().getFullYear()} HPS DealEngine
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
Hi ${normalizedName},

You've been invited to provide a repair estimate for the following property:

Property Address: ${propertyAddress}

${body.request_notes ? `Notes from requestor:\n${body.request_notes}\n\n` : ""}Submit your estimate: ${submissionUrl}

This link expires on ${expiresDate}.

If you didn't expect this request, you can safely ignore this email.
    `.trim();

    // Send email
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `Repair Estimate Request - ${propertyAddress}`,
      html,
      text,
    });

    // Update status based on email result
    if (emailResult.success) {
      await supabase
        .from("estimate_requests")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", estimateRequest.id);
    } else {
      console.error(
        `[v1-estimate-request] Email failed for ${estimateRequest.id}:`,
        emailResult.error
      );
    }

    console.log(
      `[v1-estimate-request] Created request ${estimateRequest.id} for ${normalizedEmail}`
    );

    return jsonResponse(req, {
      ok: true,
      request_id: estimateRequest.id,
      email_sent: emailResult.success,
      message: emailResult.success
        ? `Estimate request sent to ${normalizedEmail}`
        : "Request created but email failed. You can resend later.",
    });
  } catch (err) {
    console.error("[v1-estimate-request] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});

/**
 * Escape HTML entities to prevent XSS in email templates
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
