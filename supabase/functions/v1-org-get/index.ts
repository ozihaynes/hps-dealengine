import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/**
 * GET /functions/v1/v1-org-get?org_id=xxx
 *
 * Retrieves organization details.
 * Requires membership in the organization.
 *
 * Edge cases handled:
 * - EC-3.5: Non-member tries to view -> 403
 * - EC-3.7: Org not found -> 404
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

    // Get org_id from query params
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");

    if (!orgId) {
      return jsonResponse(
        req,
        { ok: false, error: "org_id query parameter is required", field: "org_id" },
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

    // EC-3.5: Check membership (any role)
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return jsonResponse(
        req,
        { ok: false, error: "Not a member of this organization" },
        403
      );
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, logo_url, created_at, updated_at")
      .eq("id", orgId)
      .single();

    // EC-3.7: Org not found
    if (orgError || !org) {
      console.error("[v1-org-get] Org query error:", orgError);
      return jsonResponse(
        req,
        { ok: false, error: "Organization not found" },
        404
      );
    }

    return jsonResponse(req, {
      ok: true,
      organization: {
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
        created_at: org.created_at,
        updated_at: org.updated_at,
      },
      caller_role: membership.role,
    });
  } catch (err) {
    console.error("[v1-org-get] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
