import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "image/webp", "image/gif"];
const SIGNED_URL_EXPIRY = 60; // 60 seconds

interface UploadUrlRequest {
  org_id: string;
  content_type: string;
  file_size: number;
}

/**
 * POST /functions/v1/v1-org-logo-upload-url
 *
 * Generates a signed upload URL for org logo.
 * Requires VP role in the target organization.
 *
 * Edge cases handled:
 * - EC-3.1: Non-VP tries to update -> 403
 * - EC-3.3: File too large -> 413
 * - EC-3.4: Invalid MIME type -> 415
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

    let body: UploadUrlRequest;
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
    if (!body.content_type) {
      return jsonResponse(
        req,
        { ok: false, error: "content_type is required", field: "content_type" },
        400
      );
    }
    if (!body.file_size) {
      return jsonResponse(
        req,
        { ok: false, error: "file_size is required", field: "file_size" },
        400
      );
    }

    // EC-3.3: Validate file size
    if (body.file_size > MAX_FILE_SIZE) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          field: "file_size",
        },
        413
      );
    }

    // EC-3.4: Validate content type
    if (!ALLOWED_TYPES.includes(body.content_type)) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
          field: "content_type",
        },
        415
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
        { ok: false, error: "Only VP can upload organization logo" },
        403
      );
    }

    // Verify org exists
    const { data: org } = await supabaseUser
      .from("organizations")
      .select("id")
      .eq("id", body.org_id)
      .single();

    if (!org) {
      return jsonResponse(
        req,
        { ok: false, error: "Organization not found" },
        404
      );
    }

    // Generate file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/svg+xml": "svg",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[body.content_type] || "png";
    const filePath = `${body.org_id}/logo.${ext}`;

    // Use service role to create signed URL
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Create signed upload URL
    const { data: signedUrl, error: signedUrlError } = await supabaseAdmin
      .storage
      .from("org-assets")
      .createSignedUploadUrl(filePath, {
        upsert: true,
      });

    if (signedUrlError) {
      console.error("[v1-org-logo-upload-url] Signed URL error:", signedUrlError);
      return jsonResponse(
        req,
        { ok: false, error: "Failed to generate upload URL" },
        500
      );
    }

    // Generate the public URL for the logo
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from("org-assets")
      .getPublicUrl(filePath);

    return jsonResponse(req, {
      ok: true,
      upload_url: signedUrl.signedUrl,
      token: signedUrl.token,
      path: filePath,
      public_url: publicUrlData.publicUrl,
      expires_in: SIGNED_URL_EXPIRY,
    });
  } catch (err) {
    console.error("[v1-org-logo-upload-url] Unexpected error:", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
