import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/**
 * GET /functions/v1/v1-invite-list?org_id=<uuid>
 *
 * Lists pending invitations for an organization.
 * Requires Manager+ role (enforced by RLS).
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

    // Fetch pending invitations (RLS enforces Manager+ access)
    const { data: invitations, error: listError } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        role,
        expires_at,
        created_at,
        invited_by,
        profiles:invited_by (display_name)
      `)
      .eq("org_id", orgId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (listError) {
      console.error("[v1-invite-list] Query error:", listError);
      // RLS might return empty if no access
      return jsonResponse(req, {
        ok: true,
        invitations: [],
        count: 0,
      });
    }

    // Transform to include inviter name
    const formattedInvitations = (invitations || []).map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      inviter_name:
        (inv.profiles as { display_name?: string } | null)?.display_name ||
        "Unknown",
    }));

    return jsonResponse(req, {
      ok: true,
      invitations: formattedInvitations,
      count: formattedInvitations.length,
    });
  } catch (err) {
    console.error("[v1-invite-list] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
