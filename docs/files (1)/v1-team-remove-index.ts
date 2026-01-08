import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MANAGER_ROLES = ["manager", "vp"];

/**
 * DELETE /functions/v1/v1-team-remove
 *
 * Removes a member from an organization.
 * Requires Manager+ role.
 *
 * Edge cases handled:
 * - EC-2.7: Remove self from org - 400 "Cannot remove yourself"
 * - EC-2.8: Remove VP - 403 "Cannot remove VP" (unless caller is VP)
 * - EC-2.13: Last manager - 400 "Cannot remove last manager"
 *
 * Note: Uses service_role because RLS doesn't allow deleting other users' memberships
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

    let body: { user_id: string; org_id: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.user_id) {
      return jsonResponse(
        req,
        { ok: false, error: "user_id is required" },
        400
      );
    }
    if (!body.org_id) {
      return jsonResponse(
        req,
        { ok: false, error: "org_id is required" },
        400
      );
    }

    // Create user client for auth check
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }

    // EC-2.7: Cannot remove self
    if (body.user_id === user.id) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "Cannot remove yourself from the organization",
        },
        400
      );
    }

    // Check caller's role
    const { data: callerMembership } = await supabaseUser
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

    if (!MANAGER_ROLES.includes(callerMembership.role)) {
      return jsonResponse(
        req,
        { ok: false, error: "Manager or above required to remove members" },
        403
      );
    }

    // Use service_role for deletion
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Check target's membership
    const { data: targetMembership, error: targetError } = await supabaseAdmin
      .from("memberships")
      .select("role, user_id")
      .eq("org_id", body.org_id)
      .eq("user_id", body.user_id)
      .single();

    if (targetError || !targetMembership) {
      return jsonResponse(
        req,
        { ok: false, error: "Member not found in this organization" },
        404
      );
    }

    // EC-2.8: Cannot remove VP (unless caller is also VP)
    if (targetMembership.role === "vp" && callerMembership.role !== "vp") {
      return jsonResponse(
        req,
        { ok: false, error: "Cannot remove a VP from the organization" },
        403
      );
    }

    // EC-2.13: Check if this would leave the org with no managers
    const { count: managerCount } = await supabaseAdmin
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("org_id", body.org_id)
      .in("role", ["manager", "vp"]);

    if (
      MANAGER_ROLES.includes(targetMembership.role) &&
      (managerCount ?? 0) <= 1
    ) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "Cannot remove the last manager from the organization",
        },
        400
      );
    }

    // Delete the membership
    const { error: deleteError } = await supabaseAdmin
      .from("memberships")
      .delete()
      .eq("org_id", body.org_id)
      .eq("user_id", body.user_id);

    if (deleteError) {
      console.error("[v1-team-remove] Delete error:", deleteError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to remove member" },
        500
      );
    }

    return jsonResponse(req, {
      ok: true,
      message: "Member removed from organization",
      removed_user_id: body.user_id,
    });
  } catch (err) {
    console.error("[v1-team-remove] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
