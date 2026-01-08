import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/**
 * DELETE /functions/v1/v1-invite-revoke
 *
 * Revokes a pending invitation.
 * Requires Manager+ role (enforced by RLS).
 *
 * Edge cases handled:
 * - EC-2.6: Revoke already-accepted - 400 "Already accepted"
 */
serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "DELETE") {
      return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }

    let body: { invitation_id: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.invitation_id) {
      return jsonResponse(
        req,
        { ok: false, error: "invitation_id is required" },
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

    // First, check the invitation state (RLS enforces access)
    const { data: invitation, error: fetchError } = await supabase
      .from("invitations")
      .select("id, email, accepted_at, revoked_at")
      .eq("id", body.invitation_id)
      .single();

    if (fetchError || !invitation) {
      return jsonResponse(
        req,
        { ok: false, error: "Invitation not found" },
        404
      );
    }

    // EC-2.6: Already accepted
    if (invitation.accepted_at) {
      return jsonResponse(
        req,
        { ok: false, error: "Cannot revoke - invitation already accepted" },
        400
      );
    }

    // Already revoked
    if (invitation.revoked_at) {
      return jsonResponse(
        req,
        { ok: false, error: "Invitation already revoked" },
        400
      );
    }

    // Revoke the invitation
    const { error: updateError } = await supabase
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", body.invitation_id);

    if (updateError) {
      console.error("[v1-invite-revoke] Update error:", updateError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to revoke invitation" },
        500
      );
    }

    return jsonResponse(req, {
      ok: true,
      message: `Invitation to ${invitation.email} has been revoked`,
      invitation_id: body.invitation_id,
    });
  } catch (err) {
    console.error("[v1-invite-revoke] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
