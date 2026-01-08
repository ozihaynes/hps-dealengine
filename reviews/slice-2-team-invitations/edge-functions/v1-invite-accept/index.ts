import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * POST /functions/v1/v1-invite-accept
 *
 * Accepts invitation and creates membership.
 *
 * SECURITY NOTE: Uses service_role because:
 * 1. Accepting user cannot update invitations (not manager yet)
 * 2. Accepting user cannot insert membership (not in org yet)
 * 3. Token validation happens BEFORE any service_role operations
 *
 * Edge cases handled:
 * - EC-2.3: Accept expired token - 410 "Invitation expired"
 * - EC-2.4: Accept with wrong email - 403 "Email mismatch"
 * - EC-2.5: Accept already-used token - 400 "Invalid invitation"
 * - EC-2.1: Already a member - handled gracefully
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
      return jsonResponse(
        req,
        { ok: false, error: "Please sign in first" },
        401
      );
    }

    let body: { token: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.token || body.token.length < 32) {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid invitation token" },
        400
      );
    }

    // Get user from JWT FIRST (before service_role)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse(
        req,
        { ok: false, error: "Please sign in first" },
        401
      );
    }

    if (!user.email) {
      return jsonResponse(
        req,
        { ok: false, error: "Account has no email" },
        400
      );
    }

    // SECURITY: Only after auth verified, use service_role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Find invitation by token
    const { data: invitation, error: findError } = await supabaseAdmin
      .from("invitations")
      .select("id, org_id, email, role, expires_at, accepted_at, revoked_at")
      .eq("token", body.token)
      .single();

    if (findError || !invitation) {
      return jsonResponse(
        req,
        { ok: false, error: "Invalid or expired invitation link" },
        404
      );
    }

    // EC-2.5: Already accepted
    if (invitation.accepted_at) {
      return jsonResponse(
        req,
        { ok: false, error: "Invitation already accepted" },
        400
      );
    }

    // Already revoked
    if (invitation.revoked_at) {
      return jsonResponse(
        req,
        { ok: false, error: "Invitation has been revoked" },
        400
      );
    }

    // EC-2.3: Expired
    if (new Date(invitation.expires_at) < new Date()) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "Invitation expired. Please ask for a new one.",
        },
        410
      );
    }

    // EC-2.4: Email mismatch
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "Email mismatch",
          message: `This invitation was sent to ${invitation.email}. Please sign in with that email.`,
          expected_email: invitation.email,
        },
        403
      );
    }

    // Check if already member (EC-2.1 handled here)
    const { data: existingMembership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("org_id", invitation.org_id)
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      // Already member - mark invitation accepted and return
      await supabaseAdmin
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("name")
        .eq("id", invitation.org_id)
        .single();

      return jsonResponse(req, {
        ok: true,
        message: `You're already a member of ${org?.name || "this organization"}`,
        org_id: invitation.org_id,
        org_name: org?.name,
        role: existingMembership.role,
        already_member: true,
      });
    }

    // Create membership
    const { error: membershipError } = await supabaseAdmin
      .from("memberships")
      .insert({
        org_id: invitation.org_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (membershipError) {
      console.error("[v1-invite-accept] Membership error:", membershipError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to join. Please try again." },
        500
      );
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", invitation.org_id)
      .single();

    return jsonResponse(req, {
      ok: true,
      message: `Welcome to ${org?.name || "the organization"}!`,
      org_id: invitation.org_id,
      org_name: org?.name,
      role: invitation.role,
      already_member: false,
    });
  } catch (err) {
    console.error("[v1-invite-accept] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
