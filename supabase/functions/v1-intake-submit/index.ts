import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { submissionConfirmationEmail } from "../_shared/emailTemplates.ts";

/**
 * v1-intake-submit
 *
 * Public endpoint (no JWT required) for final intake submission.
 * Token is passed via x-intake-token header.
 *
 * Validates required fields, freezes payload, marks token as consumed.
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

/**
 * Compute SHA-256 hash of payload for immutability verification
 */
async function hashPayload(payload: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type IntakeField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  pattern?: string;
};

type IntakeSection = {
  id: string;
  title: string;
  description?: string;
  fields: IntakeField[];
};

type IntakeSchemaPublic = {
  version: string;
  title: string;
  description?: string;
  sections: IntakeSection[];
  evidence_uploads?: unknown[];
};

/**
 * Validate required fields against schema
 */
function validateRequiredFields(
  schema: IntakeSchemaPublic,
  payload: Record<string, unknown>,
): string[] {
  const missingFields: string[] = [];

  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.required) {
        const value = payload[field.key];
        if (value === undefined || value === null || value === "") {
          missingFields.push(field.key);
        }
      }
    }
  }

  return missingFields;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "METHOD_NOT_ALLOWED", message: "Use POST" },
      405,
    );
  }

  // Get token from header
  const token = req.headers.get("x-intake-token");
  if (!token || token.length !== 64) {
    return jsonResponse(
      req,
      { ok: false, error: "TOKEN_INVALID", message: "Invalid or missing token" },
      401,
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "INVALID_JSON", message: "Body must be valid JSON" },
      400,
    );
  }

  const payload = body as { intake_link_id?: string; payload_json?: Record<string, unknown> };

  if (!payload.intake_link_id || !payload.payload_json) {
    return jsonResponse(
      req,
      { ok: false, error: "INVALID_REQUEST", message: "intake_link_id and payload_json are required" },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      req,
      { ok: false, error: "CONFIG_ERROR", message: "Missing Supabase config" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Hash the token for comparison
    const tokenHash = await hashToken(token);

    // Verify token matches the link
    const { data: link, error: linkError } = await supabase
      .from("intake_links")
      .select("id, org_id, deal_id, intake_schema_version_id, status, expires_at, consumed_at, recipient_email, recipient_name")
      .eq("id", payload.intake_link_id)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (linkError) {
      console.error("[v1-intake-submit] link lookup failed", linkError);
      return jsonResponse(
        req,
        { ok: false, error: "LOOKUP_FAILED", message: "Failed to validate token" },
        500,
      );
    }

    if (!link) {
      return jsonResponse(
        req,
        { ok: false, error: "TOKEN_INVALID", message: "Token does not match link" },
        401,
      );
    }

    // Check link is still valid
    if (link.status === "REVOKED") {
      return jsonResponse(
        req,
        { ok: false, error: "LINK_REVOKED", message: "This link has been revoked" },
        403,
      );
    }

    if (link.status === "SUBMITTED" || link.consumed_at) {
      return jsonResponse(
        req,
        { ok: false, error: "LINK_CONSUMED", message: "This form has already been submitted" },
        403,
      );
    }

    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) {
      return jsonResponse(
        req,
        { ok: false, error: "LINK_EXPIRED", message: "This link has expired" },
        403,
      );
    }

    // Get schema to validate required fields
    const { data: schemaVersion, error: schemaError } = await supabase
      .from("intake_schema_versions")
      .select("schema_public_json")
      .eq("id", link.intake_schema_version_id)
      .maybeSingle();

    if (schemaError || !schemaVersion) {
      console.error("[v1-intake-submit] schema lookup failed", schemaError);
      return jsonResponse(
        req,
        { ok: false, error: "SCHEMA_NOT_FOUND", message: "Schema version not found" },
        500,
      );
    }

    const schema = schemaVersion.schema_public_json as IntakeSchemaPublic;

    // Validate required fields
    const missingFields = validateRequiredFields(schema, payload.payload_json);
    if (missingFields.length > 0) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "VALIDATION_FAILED",
          message: "Required fields are missing",
          missing_fields: missingFields,
        },
        400,
      );
    }

    const now = new Date().toISOString();
    const payloadHash = await hashPayload(payload.payload_json);

    // Check for existing draft to update, or create new submission
    const { data: existingSubmission, error: existingError } = await supabase
      .from("intake_submissions")
      .select("id")
      .eq("intake_link_id", link.id)
      .eq("status", "DRAFT")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("[v1-intake-submit] existing submission lookup failed", existingError);
    }

    let submissionId: string;

    if (existingSubmission) {
      // Update existing draft to submitted
      const { data: updated, error: updateError } = await supabase
        .from("intake_submissions")
        .update({
          payload_json: payload.payload_json,
          payload_hash: payloadHash,
          status: "SUBMITTED",
          submitted_at: now,
          updated_at: now,
        })
        .eq("id", existingSubmission.id)
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        console.error("[v1-intake-submit] update failed", updateError);
        return jsonResponse(
          req,
          { ok: false, error: "UPDATE_FAILED", message: "Failed to submit intake" },
          500,
        );
      }

      submissionId = updated.id;
    } else {
      // Create new submission directly as submitted
      const { data: created, error: createError } = await supabase
        .from("intake_submissions")
        .insert({
          org_id: link.org_id,
          deal_id: link.deal_id,
          intake_link_id: link.id,
          intake_schema_version_id: link.intake_schema_version_id,
          source: "public_token",
          payload_json: payload.payload_json,
          payload_hash: payloadHash,
          status: "SUBMITTED",
          submitted_at: now,
          revision_cycle: 1,
        })
        .select("id")
        .maybeSingle();

      if (createError || !created) {
        console.error("[v1-intake-submit] create failed", createError);
        return jsonResponse(
          req,
          { ok: false, error: "CREATE_FAILED", message: "Failed to submit intake" },
          500,
        );
      }

      submissionId = created.id;
    }

    // Mark link as consumed
    const { error: linkUpdateError } = await supabase
      .from("intake_links")
      .update({
        status: "SUBMITTED",
        consumed_at: now,
      })
      .eq("id", link.id);

    if (linkUpdateError) {
      console.error("[v1-intake-submit] link update failed", linkUpdateError);
      // Non-fatal - submission was saved
    }

    // Send confirmation email if recipient email exists
    let emailSent = false;
    let emailError: string | undefined;

    if (link.recipient_email) {
      // Get deal address for email
      const { data: deal } = await supabase
        .from("deals")
        .select("address, city, state, zip")
        .eq("id", link.deal_id)
        .maybeSingle();

      const dealAddress = deal
        ? [deal.address, deal.city, deal.state, deal.zip].filter(Boolean).join(", ")
        : "Property";

      const emailContent = submissionConfirmationEmail(
        link.recipient_name,
        dealAddress,
      );

      const emailResult = await sendEmail({
        to: link.recipient_email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      emailSent = emailResult.success;
      emailError = emailResult.error;
    }

    return jsonResponse(req, {
      submission_id: submissionId,
      status: "SUBMITTED",
      submitted_at: now,
      message: "Thank you! Your information has been submitted.",
      confirmation_email_sent: emailSent,
      confirmation_email_error: emailError,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-submit] error", err);
    const message = err instanceof Error ? err.message : "Failed to submit intake";
    return jsonResponse(
      req,
      { ok: false, error: "SUBMIT_ERROR", message },
      500,
    );
  }
});
