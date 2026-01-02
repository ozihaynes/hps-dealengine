import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";

/**
 * v1-intake-submission-detail
 *
 * Staff endpoint (JWT required) for viewing full submission details.
 * Returns submission, link, schema, files, audit trail.
 */

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use GET" },
      405,
    );
  }

  // Get submission_id from query params
  const url = new URL(req.url);
  const submissionId = url.searchParams.get("submission_id");

  if (!submissionId) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "submission_id is required" },
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
      console.error("[v1-intake-submission-detail] memberships lookup failed", membershipError);
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
      .select("*")
      .eq("id", submissionId)
      .in("org_id", memberOrgIds)
      .maybeSingle();

    if (submissionError) {
      console.error("[v1-intake-submission-detail] submission query failed", submissionError);
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

    // Fetch related data in parallel
    const [
      linkResult,
      schemaResult,
      filesResult,
      revisionRequestsResult,
      rejectionResult,
      populationEventsResult,
      dealResult,
    ] = await Promise.all([
      // Link
      submission.intake_link_id
        ? supabase
            .from("intake_links")
            .select("*")
            .eq("id", submission.intake_link_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      // Schema version
      supabase
        .from("intake_schema_versions")
        .select("id, display_name, semantic_version, description, schema_public_json")
        .eq("id", submission.intake_schema_version_id)
        .maybeSingle(),

      // Files (include upload_key for evidence type labeling)
      supabase
        .from("intake_submission_files")
        .select("id, original_filename, mime_type, size_bytes, storage_state, scan_status, scanned_at, created_at, upload_key")
        .eq("intake_submission_id", submission.id)
        .order("created_at", { ascending: false }),

      // Revision requests
      supabase
        .from("intake_revision_requests")
        .select("id, request_notes, created_at, requested_by, responded_at, new_link_id")
        .eq("intake_submission_id", submission.id)
        .order("created_at", { ascending: false }),

      // Rejection (single)
      supabase
        .from("intake_rejections")
        .select("id, rejection_reason, rejected_by, created_at")
        .eq("intake_submission_id", submission.id)
        .maybeSingle(),

      // Population events
      supabase
        .from("intake_population_events")
        .select("id, summary_json, field_results_json, overwrite_mode, created_by, created_at")
        .eq("intake_submission_id", submission.id)
        .order("created_at", { ascending: false }),

      // Deal
      supabase
        .from("deals")
        .select("id, address, city, state, zip, payload")
        .eq("id", submission.deal_id)
        .maybeSingle(),
    ]);

    return jsonResponse(req, {
      submission,
      link: linkResult.data ?? null,
      schema_version: schemaResult.data ?? null,
      files: filesResult.data ?? [],
      revision_requests: revisionRequestsResult.data ?? [],
      rejection: rejectionResult.data ?? null,
      population_events: populationEventsResult.data ?? [],
      deal: dealResult.data ?? null,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-submission-detail] error", err);
    const message = err instanceof Error ? err.message : "Failed to fetch submission detail";
    return jsonResponse(
      req,
      { ok: false, error: "detail_error", message },
      500,
    );
  }
});
