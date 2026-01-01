import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import { SendIntakeLinkRequestSchema } from "@hps-internal/contracts";
import { sendEmail } from "../_shared/email.ts";
import { intakeLinkEmail } from "../_shared/emailTemplates.ts";

const MAX_SENDS_PER_DEAL_PER_DAY = 10;
const DEFAULT_EXPIRY_DAYS = 14;
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

  const parsed = SendIntakeLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: parsed.error.message },
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
  const payload = parsed.data;

  try {
    // Get user's org memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("[v1-intake-send-link] memberships lookup failed", membershipError);
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

    // Lookup deal and verify org membership
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, org_id, address, city, state, zip")
      .eq("id", payload.deal_id)
      .maybeSingle();

    if (dealError) {
      console.error("[v1-intake-send-link] deal lookup failed", dealError);
      return jsonResponse(
        req,
        { ok: false, error: "deal_lookup_failed", message: "Failed to load deal" },
        500,
      );
    }

    if (!deal) {
      return jsonResponse(
        req,
        { ok: false, error: "deal_not_found", message: "Deal not found" },
        404,
      );
    }

    if (!memberOrgIds.includes(deal.org_id)) {
      return jsonResponse(
        req,
        { ok: false, error: "forbidden", message: "Deal does not belong to your org" },
        403,
      );
    }

    const orgId = deal.org_id;

    // Rate limit check: max 10 sends per deal per day
    const { count: sendCountToday, error: countError } = await supabase
      .from("intake_links")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", payload.deal_id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (countError) {
      console.error("[v1-intake-send-link] rate limit check failed", countError);
      return jsonResponse(
        req,
        { ok: false, error: "rate_limit_check_failed", message: "Failed to check rate limit" },
        500,
      );
    }

    if ((sendCountToday ?? 0) >= MAX_SENDS_PER_DEAL_PER_DAY) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "rate_limit_exceeded",
          message: `Maximum ${MAX_SENDS_PER_DEAL_PER_DAY} intake links per deal per day`,
        },
        429,
      );
    }

    // Get active schema version (or specified version)
    let schemaVersionId = payload.schema_version_id ?? null;

    if (!schemaVersionId) {
      const { data: activeSchema, error: schemaError } = await supabase
        .from("intake_schema_versions")
        .select("id")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .maybeSingle();

      if (schemaError) {
        console.error("[v1-intake-send-link] active schema lookup failed", schemaError);
        return jsonResponse(
          req,
          { ok: false, error: "schema_lookup_failed", message: "Failed to find active schema" },
          500,
        );
      }

      if (!activeSchema) {
        return jsonResponse(
          req,
          {
            ok: false,
            error: "no_active_schema",
            message: "No active intake schema configured for this organization",
          },
          400,
        );
      }

      schemaVersionId = activeSchema.id;
    } else {
      // Verify the specified schema exists and belongs to the org
      const { data: specifiedSchema, error: specSchemaError } = await supabase
        .from("intake_schema_versions")
        .select("id")
        .eq("id", schemaVersionId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (specSchemaError || !specifiedSchema) {
        return jsonResponse(
          req,
          { ok: false, error: "schema_not_found", message: "Specified schema version not found" },
          404,
        );
      }
    }

    // Generate secure token and hash
    const plainToken = generateSecureToken();
    const tokenHash = await hashToken(plainToken);

    // Calculate expiry
    const expiryDays = payload.expires_in_days ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Insert intake_link
    const { data: linkRow, error: insertError } = await supabase
      .from("intake_links")
      .insert({
        org_id: orgId,
        deal_id: payload.deal_id,
        intake_schema_version_id: schemaVersionId,
        recipient_email: payload.recipient_email,
        recipient_name: payload.recipient_name ?? null,
        token_hash: tokenHash,
        status: "SENT",
        expires_at: expiresAt.toISOString(),
        send_count: 1,
        last_sent_at: new Date().toISOString(),
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[v1-intake-send-link] insert failed", insertError);
      return jsonResponse(
        req,
        { ok: false, error: "link_insert_failed", message: insertError.message },
        500,
      );
    }

    if (!linkRow?.id) {
      return jsonResponse(
        req,
        { ok: false, error: "link_missing", message: "Link was not created" },
        500,
      );
    }

    // Build intake URL and deal address
    const intakeUrl = `${PUBLIC_APP_URL}/intake/${plainToken}`;
    const dealAddress = [deal.address, deal.city, deal.state, deal.zip]
      .filter(Boolean)
      .join(", ") || "Property";

    // Send email via Resend
    const emailContent = intakeLinkEmail(
      payload.recipient_name ?? null,
      intakeUrl,
      expiresAt.toISOString(),
      dealAddress,
    );

    const emailResult = await sendEmail({
      to: payload.recipient_email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    const emailSendId = emailResult.messageId ?? `error-${Date.now()}`;

    // Update with email send ID
    await supabase
      .from("intake_links")
      .update({ email_send_id: emailSendId })
      .eq("id", linkRow.id);

    return jsonResponse(req, {
      link_id: linkRow.id,
      token: plainToken,
      intake_url: intakeUrl,
      expires_at: expiresAt.toISOString(),
      email_sent: emailResult.success,
      email_send_id: emailSendId,
      email_error: emailResult.error,
    }, 200);
  } catch (err: unknown) {
    console.error("[v1-intake-send-link] error", err);
    const message = err instanceof Error ? err.message : "Failed to send intake link";
    return jsonResponse(
      req,
      {
        ok: false,
        error: "intake_send_link_failed",
        message,
      },
      500,
    );
  }
});
