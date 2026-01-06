import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

// =============================================================================
// INLINE TYPES (Deno constraint)
// =============================================================================

type JobStatus = "draft" | "mapped" | "validating" | "ready" | "promoting" | "complete" | "failed" | "archived";
type ItemStatus = "pending" | "valid" | "needs_fix" | "promoted" | "skipped_duplicate" | "skipped_other" | "failed";

interface PromoteRequest {
  job_id: string;
  item_ids?: string[]; // Optional: specific items to promote, otherwise promote all valid
}

interface PromoteResult {
  item_id: string;
  deal_id: string | null;
  success: boolean;
  error?: string;
}

interface NormalizedPayload {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  seller_name?: string | null;
  seller_phone?: string | null;
  seller_email?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  external_id?: string | null;
}

const MAX_ITEMS_PER_BATCH = 50;

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // ==========================================================================
    // 1. AUTH: Verify JWT and get user
    // ==========================================================================
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse(req, { ok: false, error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse(req, { ok: false, error: "Invalid or expired token" }, 401);
    }

    // ==========================================================================
    // 2. PARSE AND VALIDATE INPUT
    // ==========================================================================
    let body: PromoteRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    const { job_id, item_ids } = body;

    if (!job_id) {
      return jsonResponse(req, { ok: false, error: "Missing job_id" }, 400);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(job_id)) {
      return jsonResponse(req, { ok: false, error: "Invalid job_id format" }, 400);
    }

    if (item_ids) {
      if (!Array.isArray(item_ids)) {
        return jsonResponse(req, { ok: false, error: "item_ids must be an array" }, 400);
      }
      if (item_ids.length > MAX_ITEMS_PER_BATCH) {
        return jsonResponse(req, {
          ok: false,
          error: `Maximum ${MAX_ITEMS_PER_BATCH} items per batch`
        }, 400);
      }
      for (const id of item_ids) {
        if (!uuidRegex.test(id)) {
          return jsonResponse(req, { ok: false, error: `Invalid item_id format: ${id}` }, 400);
        }
      }
    }

    // ==========================================================================
    // 3. VERIFY JOB EXISTS AND USER HAS ACCESS (via RLS)
    // ==========================================================================
    const { data: job, error: jobError } = await supabase
      .from("deal_import_jobs")
      .select("id, org_id, status, rows_valid, rows_promoted")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return jsonResponse(req, { ok: false, error: "Job not found or access denied" }, 404);
    }

    // Verify job is in a promotable state
    if (job.status !== "ready" && job.status !== "promoting") {
      return jsonResponse(req, {
        ok: false,
        error: `Cannot promote items from job with "${job.status}" status. Job must be in "ready" status.`
      }, 400);
    }

    // ==========================================================================
    // 4. UPDATE JOB STATUS TO PROMOTING
    // ==========================================================================
    if (job.status === "ready") {
      const { error: statusError } = await supabase
        .from("deal_import_jobs")
        .update({
          status: "promoting" as JobStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", job_id);

      if (statusError) {
        console.error("Failed to update job status:", statusError);
        return jsonResponse(req, { ok: false, error: "Failed to update job status" }, 500);
      }
    }

    // ==========================================================================
    // 5. FETCH ITEMS TO PROMOTE
    // ==========================================================================
    let query = supabase
      .from("deal_import_items")
      .select("id, row_number, dedupe_key, normalized_payload, status")
      .eq("job_id", job_id)
      .eq("status", "valid" as ItemStatus)
      .is("promoted_deal_id", null);

    if (item_ids && item_ids.length > 0) {
      query = query.in("id", item_ids);
    }

    query = query.order("row_number", { ascending: true }).limit(MAX_ITEMS_PER_BATCH);

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      console.error("Failed to fetch items:", itemsError);
      return jsonResponse(req, { ok: false, error: "Failed to fetch items" }, 500);
    }

    if (!items || items.length === 0) {
      // Check if we're done promoting all items
      const { data: remainingValid } = await supabase
        .from("deal_import_items")
        .select("id", { count: "exact", head: true })
        .eq("job_id", job_id)
        .eq("status", "valid")
        .is("promoted_deal_id", null);

      if (!remainingValid || (remainingValid as unknown as number) === 0) {
        // All items promoted, mark job complete
        await supabase
          .from("deal_import_jobs")
          .update({
            status: "complete" as JobStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", job_id);
      }

      return jsonResponse(req, {
        ok: true,
        promoted_count: 0,
        failed_count: 0,
        remaining_count: 0,
        results: [],
        job_complete: true
      });
    }

    // ==========================================================================
    // 6. CREATE DEALS FROM ITEMS
    // ==========================================================================
    const results: PromoteResult[] = [];
    const now = new Date().toISOString();
    let promotedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      const payload = item.normalized_payload as NormalizedPayload;

      // Build deal payload
      const dealPayload = {
        client_name: payload.client_name || null,
        client_phone: payload.client_phone || null,
        client_email: payload.client_email || null,
        seller_name: payload.seller_name || null,
        seller_phone: payload.seller_phone || null,
        seller_email: payload.seller_email || null,
        tags: payload.tags || [],
        notes: payload.notes || null,
        external_id: payload.external_id || null,
        import_source: {
          job_id: job_id,
          item_id: item.id,
          row_number: item.row_number,
          imported_at: now
        }
      };

      // Insert deal
      const { data: newDeal, error: dealError } = await supabase
        .from("deals")
        .insert({
          org_id: job.org_id,
          created_by: user.id,
          address: payload.street || null,
          city: payload.city || null,
          state: payload.state || null,
          zip: payload.zip || null,
          dedupe_key: item.dedupe_key,
          payload: dealPayload
        })
        .select("id")
        .single();

      if (dealError || !newDeal) {
        console.error(`Failed to create deal for item ${item.id}:`, dealError);

        // Mark item as failed
        await supabase
          .from("deal_import_items")
          .update({
            status: "failed" as ItemStatus,
            skip_reason: "promotion_failed",
            error_message: dealError?.message || "Failed to create deal",
            updated_at: now
          })
          .eq("id", item.id);

        results.push({
          item_id: item.id,
          deal_id: null,
          success: false,
          error: dealError?.message || "Failed to create deal"
        });
        failedCount++;
        continue;
      }

      // Update item with promotion info
      const { error: updateError } = await supabase
        .from("deal_import_items")
        .update({
          status: "promoted" as ItemStatus,
          promoted_deal_id: newDeal.id,
          promoted_at: now,
          promoted_by: user.id,
          skip_reason: null,
          error_message: null,
          updated_at: now
        })
        .eq("id", item.id);

      if (updateError) {
        console.error(`Failed to update item ${item.id}:`, updateError);
        // Deal was created but item update failed - still count as success
      }

      results.push({
        item_id: item.id,
        deal_id: newDeal.id,
        success: true
      });
      promotedCount++;
    }

    // ==========================================================================
    // 7. UPDATE JOB COUNTS
    // ==========================================================================
    const { data: itemCounts } = await supabase
      .from("deal_import_items")
      .select("status")
      .eq("job_id", job_id);

    const counts = {
      rows_total: itemCounts?.length || 0,
      rows_valid: 0,
      rows_needs_fix: 0,
      rows_skipped_duplicate: 0,
      rows_promoted: 0,
      rows_skipped_other: 0
    };

    for (const item of itemCounts || []) {
      switch (item.status) {
        case "valid":
          counts.rows_valid++;
          break;
        case "needs_fix":
          counts.rows_needs_fix++;
          break;
        case "skipped_duplicate":
          counts.rows_skipped_duplicate++;
          break;
        case "promoted":
          counts.rows_promoted++;
          break;
        case "failed":
        case "pending":
        case "skipped_other":
          counts.rows_skipped_other++;
          break;
      }
    }

    // Check if all promotable items are done
    const remainingValidCount = counts.rows_valid;
    const isComplete = remainingValidCount === 0;

    // Update job with counts and potentially complete status
    const jobUpdate: Record<string, unknown> = {
      rows_total: counts.rows_total,
      rows_valid: counts.rows_valid,
      rows_needs_fix: counts.rows_needs_fix,
      rows_skipped_duplicate: counts.rows_skipped_duplicate,
      rows_promoted: counts.rows_promoted,
      rows_skipped_other: counts.rows_skipped_other,
      updated_at: now
    };

    if (isComplete) {
      jobUpdate.status = "complete" as JobStatus;
    }

    await supabase
      .from("deal_import_jobs")
      .update(jobUpdate)
      .eq("id", job_id);

    // ==========================================================================
    // 8. BUILD RESPONSE
    // ==========================================================================
    return jsonResponse(req, {
      ok: true,
      promoted_count: promotedCount,
      failed_count: failedCount,
      remaining_count: remainingValidCount,
      results,
      job_counts: counts,
      job_complete: isComplete
    }, 200);

  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(req, {
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
