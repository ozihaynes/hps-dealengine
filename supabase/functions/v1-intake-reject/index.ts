import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";

/**
 * v1-intake-reject
 *
 * Staff endpoint (JWT required) for rejecting an intake submission.
 * Updates submission status and creates rejection record.
 */

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use POST" },
      405,
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_json", message: "Body must be valid JSON" },
      400,
    );
  }

  const payload = body as { submission_id?: string; rejection_reason?: string };

  if (!payload.submission_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "submission_id is required" },
      400,
    );
  }

  if (!payload.rejection_reason || payload.rejection_reason.length < 10) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "rejection_reason must be at least 10 characters" },
      400,
    );
  }

  let supabase;
  try {
    supabase = createSupabaseClient(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Supabase config missing";
    return jsonResponse(
      req,
      { ok: false, error: "config_error", message },
      500,
    );
  }

  // Verify JWT and get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(
      req,
      { ok: false, error: "unauthorized", message: "Valid JWT required" },
      401,
    );
  }

  const userId = userData.user.id;

  try {
    // Get user's org memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("[v1-intake-reject] memberships lookup failed", membershipError);
      return jsonResponse(
        req,
        { ok: false, error: "membership_lookup_failed", message: "Failed to resolve memberships" },
        500,
      );
    }

    const memberOrgIds = (memberships ?? [])
      .map((row: { org_id: string | null }) => row.org_id)
      .filter((id): id is string => !!id);

    if (memberOrgIds.length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "no_memberships", message: "No memberships found for user" },
        403,
      );
    }

    // Fetch submission
    const { data: submission, error: submissionError } = await supabase
      .from("intake_submissions")
      .select("id, org_id, intake_link_id, status")
      .eq("id", payload.submission_id)
      .in("org_id", memberOrgIds)
      .maybeSingle();

    if (submissionError) {
      console.error("[v1-intake-reject] submission query failed", submissionError);
      return jsonResponse(
        req,
        { ok: false, error: "query_failed", message: "Failed to fetch submission" },
        500,
      );
    }

    if (!submission) {
      return jsonResponse(
        req,
        { ok: false, error: "not_found", message: "Submission not found or access denied" },
        404,
      );
    }

    // Check if already rejected
    if (submission.status === "REJECTED") {
      return jsonResponse(
        req,
        { ok: false, error: "already_rejected", message: "Submission is already rejected" },
        400,
      );
    }

    const now = new Date().toISOString();

    // Create rejection record
    const { data: rejection, error: rejectionError } = await supabase
      .from("intake_rejections")
      .insert({
        org_id: submission.org_id,
        intake_submission_id: submission.id,
        rejected_by: userId,
        rejection_reason: payload.rejection_reason,
      })
      .select("id")
      .maybeSingle();

    if (rejectionError || !rejection) {
      console.error("[v1-intake-reject] rejection insert failed", rejectionError);
      return jsonResponse(
        req,
        { ok: false, error: "rejection_create_failed", message: "Failed to create rejection" },
        500,
      );
    }

    // Update submission status
    const { error: updateError } = await supabase
      .from("intake_submissions")
      .update({
        status: "REJECTED",
        updated_at: now,
      })
      .eq("id", submission.id);

    if (updateError) {
      console.error("[v1-intake-reject] submission update failed", updateError);
    }

    // Update link status if exists
    if (submission.intake_link_id) {
      await supabase
        .from("intake_links")
        .update({ status: "REJECTED" })
        .eq("id", submission.intake_link_id);
    }

    // Email stub - log notification
    console.log("[v1-intake-reject] EMAIL STUB - rejection notification", {
      submission_id: submission.id,
      rejection_reason: payload.rejection_reason,
    });

    return jsonResponse(req, {
      rejection_id: rejection.id,
      submission_status: "REJECTED",
    });
  } catch (err: unknown) {
    console.error("[v1-intake-reject] error", err);
    const message = err instanceof Error ? err.message : "Failed to reject submission";
    return jsonResponse(
      req,
      { ok: false, error: "reject_error", message },
      500,
    );
  }
});
