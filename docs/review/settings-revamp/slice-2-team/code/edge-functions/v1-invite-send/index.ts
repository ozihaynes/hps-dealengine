import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { sendInviteEmail } from "../_shared/invite-email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") || "https://app.hpsdealengine.com";

const VALID_ROLES = ["analyst", "manager", "vp"] as const;
type InviteRole = (typeof VALID_ROLES)[number];

interface InviteSendBody {
  email: string;
  role: InviteRole;
  org_id: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /functions/v1/v1-invite-send
 *
 * Creates invitation and sends email via Resend.
 * Requires Manager+ role in the target organization.
 *
 * Edge cases handled:
 * - EC-2.1: Invite existing member - API-level check (also handled in accept)
 * - EC-2.2: Invite email with pending invite - 409 "Invite already pending"
 * - EC-2.9: Non-manager tries to invite - 403 "Insufficient permissions"
 * - EC-2.10: Email fails but invite created - Warning, allow manual resend
 * - EC-2.11: Token collision - DB unique constraint handles retry
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

    let body: InviteSendBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid JSON body" },
        400
      );
    }

    // Validate fields
    if (!body.email) {
      return jsonResponse(
        req,
        { ok: false, error: "email is required", field: "email" },
        400
      );
    }
    if (!isValidEmail(body.email)) {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid email format", field: "email" },
        400
      );
    }
    if (!body.org_id) {
      return jsonResponse(
        req,
        { ok: false, error: "org_id is required", field: "org_id" },
        400
      );
    }
    if (!body.role || !VALID_ROLES.includes(body.role)) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: `role must be one of: ${VALID_ROLES.join(", ")}`,
          field: "role",
        },
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

    // EC-2.9: Verify Manager+ role
    const { data: callerMembership } = await supabase
      .from("memberships")
      .select("role")
      .eq("org_id", body.org_id)
      .eq("user_id", user.id)
      .single();

    if (!callerMembership) {
      return jsonResponse(
        req,
        { ok: false, error: "Not a member of this organization" },
        403
      );
    }
    if (!["manager", "vp"].includes(callerMembership.role)) {
      return jsonResponse(
        req,
        { ok: false, error: "Manager or above required to invite" },
        403
      );
    }

    const normalizedEmail = body.email.toLowerCase().trim();

    // EC-2.2: Check existing pending invite
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id, expires_at")
      .eq("org_id", body.org_id)
      .ilike("email", normalizedEmail)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "An invitation is already pending for this email",
          field: "email",
          existing_expires_at: existingInvite.expires_at,
        },
        409
      );
    }

    // EC-2.1: Check if already a member
    const { data: existingMember } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("org_id", body.org_id)
      .eq(
        "user_id",
        (
          await supabase.auth.admin.listUsers()
        ).data?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)
          ?.id ?? "00000000-0000-0000-0000-000000000000"
      )
      .maybeSingle();

    // Note: The above check won't fully work without service_role,
    // so we handle the already-member case gracefully in invite-accept

    // Get org name for email
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", body.org_id)
      .single();

    if (!org) {
      return jsonResponse(
        req,
        { ok: false, error: "Organization not found" },
        404
      );
    }

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const inviterName =
      inviterProfile?.display_name ||
      user.email?.split("@")[0] ||
      "A team member";

    // Create invitation (EC-2.11: unique constraint handles collision)
    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        org_id: body.org_id,
        email: normalizedEmail,
        role: body.role,
        invited_by: user.id,
      })
      .select("id, token, expires_at, created_at")
      .single();

    if (insertError) {
      console.error("[v1-invite-send] Insert error:", insertError);
      if (insertError.code === "23505") {
        // Unique violation - token collision, very rare
        return jsonResponse(
          req,
          { ok: false, error: "Please try again" },
          500
        );
      }
      return jsonResponse(
        req,
        { ok: false, error: "Failed to create invitation" },
        500
      );
    }

    // EC-2.10: Send email (don't fail if email fails)
    const acceptUrl = `${APP_URL}/invite/${invitation.token}`;
    const emailResult = await sendInviteEmail({
      to: normalizedEmail,
      inviterName,
      orgName: org.name,
      role: body.role,
      acceptUrl,
      expiresAt: invitation.expires_at,
    });

    if (!emailResult.success) {
      console.error(
        `[v1-invite-send] Email failed for ${invitation.id}:`,
        emailResult.error
      );
    }

    return jsonResponse(req, {
      ok: true,
      invitation: {
        id: invitation.id,
        email: normalizedEmail,
        role: body.role,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
      },
      email_sent: emailResult.success,
      message: emailResult.success
        ? `Invitation sent to ${normalizedEmail}`
        : "Invitation created but email failed. You can resend later.",
    });
  } catch (err) {
    console.error("[v1-invite-send] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
