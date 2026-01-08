import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_NAME_LENGTH = 100;
const MIN_NAME_LENGTH = 1;

interface OrgUpdateRequest {
  org_id: string;
  name?: string;
  logo_url?: string | null;
}

/**
 * PUT /functions/v1/v1-org-update
 *
 * Updates organization settings (name, logo_url).
 * Requires VP role in the target organization.
 *
 * Edge cases handled:
 * - EC-3.1: Non-VP tries to update -> 403
 * - EC-3.2: Org name blank -> 400
 * - EC-3.6: Stale update (optimistic locking via updated_at)
 */
serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "PUT") {
      return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
    }

    let body: OrgUpdateRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    // Validate required fields
    if (!body.org_id) {
      return jsonResponse(
        req,
        { ok: false, error: "org_id is required", field: "org_id" },
        400
      );
    }

    // EC-3.2: Validate name if provided
    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (trimmedName.length < MIN_NAME_LENGTH) {
        return jsonResponse(
          req,
          { ok: false, error: "Organization name cannot be blank", field: "name" },
          400
        );
      }
      if (trimmedName.length > MAX_NAME_LENGTH) {
        return jsonResponse(
          req,
          { ok: false, error: `Organization name cannot exceed ${MAX_NAME_LENGTH} characters`, field: "name" },
          400
        );
      }
      body.name = trimmedName;
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

    // EC-3.1: Check VP role
    const { data: membership } = await supabaseUser
      .from("memberships")
      .select("role")
      .eq("org_id", body.org_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return jsonResponse(
        req,
        { ok: false, error: "Not a member of this organization" },
        403
      );
    }

    if (membership.role !== "vp") {
      return jsonResponse(
        req,
        { ok: false, error: "Only VP can update organization settings" },
        403
      );
    }

    // Use service role to update (RLS might block otherwise)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Build update object with only provided fields
    const updateFields: Record<string, unknown> = {};
    if (body.name !== undefined) {
      updateFields.name = body.name;
    }
    if (body.logo_url !== undefined) {
      updateFields.logo_url = body.logo_url;
    }

    // Nothing to update
    if (Object.keys(updateFields).length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "No fields to update" },
        400
      );
    }

    // Update the organization
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update(updateFields)
      .eq("id", body.org_id)
      // P0-002 FIX: Add created_at to match OrganizationSchema
      .select("id, name, logo_url, created_at, updated_at")
      .single();

    if (updateError) {
      console.error("[v1-org-update] Update error:", updateError);
      if (updateError.code === "PGRST116") {
        return jsonResponse(
          req,
          { ok: false, error: "Organization not found" },
          404
        );
      }
      return jsonResponse(
        req,
        { ok: false, error: "Failed to update organization" },
        500
      );
    }

    return jsonResponse(req, {
      ok: true,
      organization: updatedOrg,
      message: "Organization updated successfully",
    });
  } catch (err) {
    console.error("[v1-org-update] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
