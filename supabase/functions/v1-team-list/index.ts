import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const MANAGER_ROLES = ["manager", "vp"];

/**
 * GET /functions/v1/v1-team-list?org_id=<uuid>
 *
 * Lists all team members for an organization.
 * Any org member can view the team list.
 * Returns can_manage flag based on caller's role.
 */
serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "GET") {
      return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");

    if (!orgId) {
      return jsonResponse(
        req,
        { ok: false, error: "org_id query parameter is required" },
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

    // Get caller's membership to check permissions
    const { data: callerMembership } = await supabase
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!callerMembership) {
      return jsonResponse(
        req,
        { ok: false, error: "Not a member of this organization" },
        403
      );
    }

    const canManage = MANAGER_ROLES.includes(callerMembership.role);

    // Fetch all members with their profiles
    const { data: memberships, error: listError } = await supabase
      .from("memberships")
      .select(`
        user_id,
        role,
        created_at,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (listError) {
      console.error("[v1-team-list] Query error:", listError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to load team" },
        500
      );
    }

    // We need to get user emails - this requires a different approach
    // Since we can't access auth.users directly, we'll include what we can
    const members = (memberships || []).map((m) => {
      const profile = m.profiles as { display_name?: string; avatar_url?: string } | null;
      return {
        user_id: m.user_id,
        role: m.role,
        display_name: profile?.display_name || "Team Member",
        avatar_url: profile?.avatar_url || null,
        joined_at: m.created_at,
        is_self: m.user_id === user.id,
      };
    });

    return jsonResponse(req, {
      ok: true,
      members,
      count: members.length,
      can_manage: canManage,
      caller_role: callerMembership.role,
    });
  } catch (err) {
    console.error("[v1-team-list] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
