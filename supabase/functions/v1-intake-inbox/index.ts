import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";

/**
 * v1-intake-inbox
 *
 * Staff endpoint (JWT required) for listing intake submissions.
 * Returns paginated list with filters for status, date range, search.
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
      console.error("[v1-intake-inbox] memberships lookup failed", membershipError);
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

    // Parse query params
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const dealId = url.searchParams.get("deal_id");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const search = url.searchParams.get("search");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") ?? "20", 10)));

    // Build query for submissions
    let query = supabase
      .from("intake_submissions")
      .select(`
        id,
        org_id,
        deal_id,
        intake_link_id,
        intake_schema_version_id,
        source,
        payload_json,
        status,
        submitted_at,
        revision_cycle,
        created_at,
        updated_at
      `, { count: "exact" })
      .in("org_id", memberOrgIds)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (dealId) {
      query = query.eq("deal_id", dealId);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: submissions, count: totalCount, error: submissionsError } = await query;

    if (submissionsError) {
      console.error("[v1-intake-inbox] submissions query failed", submissionsError);
      return jsonResponse(
        req,
        { ok: false, error: "query_failed", message: "Failed to fetch submissions" },
        500,
      );
    }

    // Fetch related data for each submission
    const items = await Promise.all(
      (submissions ?? []).map(async (submission) => {
        // Fetch deal info
        const { data: deal } = await supabase
          .from("deals")
          .select("id, address, city, state, zip")
          .eq("id", submission.deal_id)
          .maybeSingle();

        // Fetch link info if exists
        let link = null;
        if (submission.intake_link_id) {
          const { data: linkData } = await supabase
            .from("intake_links")
            .select("id, recipient_email, recipient_name, status, expires_at")
            .eq("id", submission.intake_link_id)
            .maybeSingle();
          link = linkData;
        }

        // Fetch file counts
        const { count: filesCount } = await supabase
          .from("intake_submission_files")
          .select("id", { count: "exact", head: true })
          .eq("intake_submission_id", submission.id);

        const { count: filesPendingScan } = await supabase
          .from("intake_submission_files")
          .select("id", { count: "exact", head: true })
          .eq("intake_submission_id", submission.id)
          .eq("scan_status", "PENDING");

        const { count: filesInfected } = await supabase
          .from("intake_submission_files")
          .select("id", { count: "exact", head: true })
          .eq("intake_submission_id", submission.id)
          .eq("scan_status", "INFECTED");

        // Apply search filter on client side (for client name/email)
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesDeal = deal && (
            (deal.address?.toLowerCase().includes(searchLower)) ||
            (deal.city?.toLowerCase().includes(searchLower))
          );
          const matchesLink = link && (
            (link.recipient_email?.toLowerCase().includes(searchLower)) ||
            (link.recipient_name?.toLowerCase().includes(searchLower))
          );
          if (!matchesDeal && !matchesLink) {
            return null;
          }
        }

        return {
          submission,
          deal,
          link,
          files_count: filesCount ?? 0,
          files_pending_scan: filesPendingScan ?? 0,
          files_infected: filesInfected ?? 0,
        };
      }),
    );

    // Filter out null items (from search)
    const filteredItems = items.filter((item) => item !== null);

    return jsonResponse(req, {
      items: filteredItems,
      total_count: totalCount ?? 0,
      page,
      page_size: pageSize,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-inbox] error", err);
    const message = err instanceof Error ? err.message : "Failed to fetch inbox";
    return jsonResponse(
      req,
      { ok: false, error: "inbox_error", message },
      500,
    );
  }
});
