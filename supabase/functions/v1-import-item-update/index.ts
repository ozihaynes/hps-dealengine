import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

// =============================================================================
// INLINE TYPES (Deno constraint)
// =============================================================================

type ItemStatus = "pending" | "valid" | "needs_fix" | "promoted" | "skipped_duplicate" | "failed";

interface ValidationError {
  field: string;
  message: string;
  rule_id: string;
}

interface UpdateRequest {
  item_id: string;
  normalized_payload?: Record<string, string>;
  dedupe_key?: string;
  validation_errors?: ValidationError[];
  status?: ItemStatus;
  skip_reason?: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

async function computeDedupeKey(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<string> {
  const normalizedStreet = (street || "").trim().toUpperCase();
  const normalizedCity = (city || "").trim().toUpperCase();
  const normalizedState = (state || "").trim().toUpperCase();
  const normalizedZip = (zip || "").replace(/[^\d]/g, "").slice(0, 5);

  const canonical = `${normalizedStreet}|${normalizedCity}|${normalizedState}|${normalizedZip}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "PUT" && req.method !== "PATCH") {
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
    let body: UpdateRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
    }

    const { item_id, normalized_payload, validation_errors, status, skip_reason } = body;

    if (!item_id) {
      return jsonResponse(req, { ok: false, error: "Missing item_id" }, 400);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(item_id)) {
      return jsonResponse(req, { ok: false, error: "Invalid item_id format" }, 400);
    }

    // ==========================================================================
    // 3. VERIFY ITEM EXISTS AND USER HAS ACCESS (via RLS)
    // ==========================================================================
    const { data: existingItem, error: itemError } = await supabase
      .from("deal_import_items")
      .select("*, deal_import_jobs!inner(id, org_id, status)")
      .eq("id", item_id)
      .single();

    if (itemError || !existingItem) {
      return jsonResponse(req, { ok: false, error: "Item not found or access denied" }, 404);
    }

    // Verify job is in a state that allows item edits
    const job = existingItem.deal_import_jobs;
    const allowedJobStatuses = ["draft", "mapped", "validating", "ready"];
    if (!allowedJobStatuses.includes(job.status)) {
      return jsonResponse(req, {
        ok: false,
        error: `Cannot edit items in job with "${job.status}" status`
      }, 400);
    }

    // Verify item is in an editable state
    const allowedItemStatuses = ["pending", "valid", "needs_fix"];
    if (!allowedItemStatuses.includes(existingItem.status)) {
      return jsonResponse(req, {
        ok: false,
        error: `Cannot edit item with "${existingItem.status}" status`
      }, 400);
    }

    // ==========================================================================
    // 4. BUILD UPDATE PAYLOAD
    // ==========================================================================
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    let newDedupeKey: string | null = null;

    // If normalized_payload is provided, update it and recalculate dedupe key
    if (normalized_payload) {
      updatePayload.payload_json = normalized_payload;

      // Recalculate dedupe key from new address fields
      newDedupeKey = await computeDedupeKey(
        normalized_payload.street || "",
        normalized_payload.city || "",
        normalized_payload.state || "",
        normalized_payload.zip || ""
      );
      updatePayload.dedupe_key = newDedupeKey;
    }

    if (validation_errors !== undefined) {
      updatePayload.validation_errors = validation_errors.map(e => e.message);
    }

    if (status !== undefined) {
      updatePayload.status = status;
    }

    if (skip_reason !== undefined) {
      updatePayload.skip_reason = skip_reason;
    }

    // ==========================================================================
    // 5. CHECK FOR DUPLICATE DEALS (if address changed)
    // ==========================================================================
    if (newDedupeKey && newDedupeKey !== existingItem.dedupe_key) {
      // Check for duplicates in the same job queue (excluding this item)
      const { data: existingItems } = await supabase
        .from("deal_import_items")
        .select("id, row_number")
        .eq("job_id", existingItem.job_id)
        .eq("dedupe_key", newDedupeKey)
        .neq("id", item_id);

      if (existingItems && existingItems.length > 0) {
        updatePayload.status = "skipped_duplicate";
        updatePayload.skip_reason = "duplicate_queued_item";
      } else {
        // Check for existing deals with same address
        const { data: existingDeals } = await supabase
          .from("deals")
          .select("id, dedupe_key")
          .eq("org_id", job.org_id)
          .eq("dedupe_key", newDedupeKey);

        if (existingDeals && existingDeals.length > 0) {
          updatePayload.status = "skipped_duplicate";
          updatePayload.skip_reason = "duplicate_existing_deal";
        }
      }
    }

    // ==========================================================================
    // 6. PERFORM UPDATE
    // ==========================================================================
    const { data: updatedItem, error: updateError } = await supabase
      .from("deal_import_items")
      .update(updatePayload)
      .eq("id", item_id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse(req, {
        ok: false,
        error: "Failed to update item",
        details: updateError.message
      }, 500);
    }

    // ==========================================================================
    // 7. UPDATE JOB COUNTS
    // ==========================================================================
    const { data: itemCounts } = await supabase
      .from("deal_import_items")
      .select("status")
      .eq("job_id", existingItem.job_id);

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
          counts.rows_skipped_other++;
          break;
      }
    }

    await supabase
      .from("deal_import_jobs")
      .update({
        rows_total: counts.rows_total,
        rows_valid: counts.rows_valid,
        rows_needs_fix: counts.rows_needs_fix,
        rows_skipped_duplicate: counts.rows_skipped_duplicate,
        rows_promoted: counts.rows_promoted,
        rows_skipped_other: counts.rows_skipped_other,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingItem.job_id);

    // ==========================================================================
    // 8. BUILD RESPONSE
    // ==========================================================================
    return jsonResponse(req, {
      ok: true,
      item: updatedItem,
      job_counts: counts
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
