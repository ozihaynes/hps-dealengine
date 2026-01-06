import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse(req, { error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    // Parse query params
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");
    const statusFilter = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(url.searchParams.get("page_size") || "50", 10), 100);

    if (!jobId) {
      return jsonResponse(req, { error: "Missing job_id parameter" }, 400);
    }

    // Verify job access via RLS
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return jsonResponse(req, { error: "Job not found or access denied" }, 404);
    }

    // Build query
    let query = supabase
      .from("import_items")
      .select("*", { count: "exact" })
      .eq("job_id", jobId)
      .order("row_number", { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data: items, count, error: listError } = await query;

    if (listError) {
      console.error("List error:", listError);
      return jsonResponse(req, { error: "Failed to fetch items", details: listError.message }, 500);
    }

    return jsonResponse(req, {
      success: true,
      items: items || [],
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err) {
    console.error("Error in v1-import-items-list:", err);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
