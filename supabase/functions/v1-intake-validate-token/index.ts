import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * v1-intake-validate-token
 *
 * Public endpoint (no JWT required) for validating an intake token.
 * Token is passed via x-intake-token header.
 *
 * Returns:
 * - valid: true/false
 * - link, schema, existing_submission, deal_context (if valid)
 * - error code (if invalid)
 */

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

  if (req.method !== "GET") {
    return jsonResponse(
      req,
      { valid: false, error: "METHOD_NOT_ALLOWED", message: "Use GET" },
      405,
    );
  }

  // Get token from header
  const token = req.headers.get("x-intake-token");
  if (!token || token.length !== 64) {
    return jsonResponse(
      req,
      { valid: false, error: "TOKEN_INVALID", message: "Invalid or missing token" },
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse(
      req,
      { valid: false, error: "CONFIG_ERROR", message: "Missing Supabase config" },
      500,
    );
  }

  // Use service role for this public endpoint (RLS bypass for token lookup)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Hash the token for comparison
    const tokenHash = await hashToken(token);

    // Find the intake link by token hash
    const { data: link, error: linkError } = await supabase
      .from("intake_links")
      .select(`
        id,
        org_id,
        deal_id,
        intake_schema_version_id,
        recipient_email,
        recipient_name,
        status,
        expires_at,
        consumed_at,
        created_at
      `)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (linkError) {
      console.error("[v1-intake-validate-token] link lookup failed", linkError);
      return jsonResponse(
        req,
        { valid: false, error: "LOOKUP_FAILED", message: "Failed to validate token" },
        500,
      );
    }

    if (!link) {
      return jsonResponse(
        req,
        { valid: false, error: "TOKEN_INVALID", message: "Token not found" },
        401,
      );
    }

    // Check status
    if (link.status === "REVOKED") {
      return jsonResponse(
        req,
        { valid: false, error: "TOKEN_REVOKED", message: "This link has been revoked" },
        403,
      );
    }

    if (link.status === "SUBMITTED" || link.consumed_at) {
      return jsonResponse(
        req,
        { valid: false, error: "TOKEN_CONSUMED", message: "This form has already been submitted" },
        403,
      );
    }

    // Check expiry
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) {
      // Update status to EXPIRED if not already
      if (link.status !== "EXPIRED") {
        await supabase
          .from("intake_links")
          .update({ status: "EXPIRED" })
          .eq("id", link.id);
      }
      return jsonResponse(
        req,
        { valid: false, error: "TOKEN_EXPIRED", message: "This link has expired" },
        403,
      );
    }

    // Get schema version
    const { data: schemaVersion, error: schemaError } = await supabase
      .from("intake_schema_versions")
      .select("id, semantic_version, display_name, description, schema_public_json")
      .eq("id", link.intake_schema_version_id)
      .maybeSingle();

    if (schemaError || !schemaVersion) {
      console.error("[v1-intake-validate-token] schema lookup failed", schemaError);
      return jsonResponse(
        req,
        { valid: false, error: "SCHEMA_NOT_FOUND", message: "Schema version not found" },
        500,
      );
    }

    // Get existing submission (if any)
    const { data: existingSubmission, error: submissionError } = await supabase
      .from("intake_submissions")
      .select("id, status, payload_json, updated_at")
      .eq("intake_link_id", link.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error("[v1-intake-validate-token] submission lookup failed", submissionError);
      // Non-fatal - continue without existing submission
    }

    // Get deal context (address info)
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("payload")
      .eq("id", link.deal_id)
      .maybeSingle();

    let dealContext = null;
    if (!dealError && deal?.payload) {
      const payload = deal.payload as Record<string, unknown>;
      dealContext = {
        address: payload.address ?? payload.propertyAddress ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        zip: payload.zip ?? payload.zipCode ?? null,
      };
    }

    // Update link status to IN_PROGRESS if currently SENT
    if (link.status === "SENT") {
      await supabase
        .from("intake_links")
        .update({ status: "IN_PROGRESS" })
        .eq("id", link.id);
    }

    return jsonResponse(req, {
      valid: true,
      link: {
        id: link.id,
        org_id: link.org_id,
        deal_id: link.deal_id,
        intake_schema_version_id: link.intake_schema_version_id,
        recipient_name: link.recipient_name,
        status: link.status === "SENT" ? "IN_PROGRESS" : link.status,
        expires_at: link.expires_at,
        created_at: link.created_at,
      },
      schema: {
        version: schemaVersion.semantic_version,
        title: schemaVersion.display_name,
        description: schemaVersion.description,
        ...schemaVersion.schema_public_json,
      },
      existing_submission: existingSubmission
        ? {
            id: existingSubmission.id,
            status: existingSubmission.status,
            payload_json: existingSubmission.payload_json,
            updated_at: existingSubmission.updated_at,
          }
        : null,
      deal_context: dealContext,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-validate-token] error", err);
    const message = err instanceof Error ? err.message : "Failed to validate token";
    return jsonResponse(
      req,
      { valid: false, error: "VALIDATION_ERROR", message },
      500,
    );
  }
});
