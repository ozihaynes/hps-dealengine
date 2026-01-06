import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

// =============================================================================
// INLINE SCHEMAS (Deno constraint)
// =============================================================================

interface NormalizedRow {
  street: string;
  city: string;
  state: string;
  zip: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  seller_name?: string | null;
  seller_phone?: string | null;
  seller_email?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  external_id?: string | null;
}

interface RowValidation {
  valid: boolean;
  errors: string[];
}

interface ImportItemInput {
  row_number: number;
  dedupe_key: string;
  payload_json: NormalizedRow;
  validation: RowValidation;
}

interface UpsertRequest {
  job_id: string;
  items: ImportItemInput[];
}

type ItemStatus = "pending" | "valid" | "needs_fix" | "skipped_duplicate";
type SkipReason = "duplicate_within_file" | "duplicate_queued_item" | "duplicate_existing_deal" | "validation_failed" | null;

interface UpsertResult {
  row_number: number;
  status: ItemStatus;
  skip_reason: SkipReason;
  errors: string[] | null;
}

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
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

    // Parse body
    const body: UpsertRequest = await req.json();
    const { job_id, items } = body;

    if (!job_id || !items || !Array.isArray(items)) {
      return jsonResponse(req, { error: "Missing job_id or items array" }, 400);
    }

    if (items.length > 200) {
      return jsonResponse(req, { error: "Maximum 200 items per batch" }, 400);
    }

    // Verify job ownership via RLS
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("id, org_id, status")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return jsonResponse(req, { error: "Job not found or access denied" }, 404);
    }

    if (job.status !== "pending" && job.status !== "validating") {
      return jsonResponse(req, { error: `Job status '${job.status}' does not allow item updates` }, 400);
    }

    // Collect dedupe keys from this batch
    const batchDedupeKeys = items.map((i) => i.dedupe_key);

    // Check for duplicates within the batch itself
    const seenInBatch = new Map<string, number>();
    const batchDuplicates = new Set<number>();
    for (const item of items) {
      if (seenInBatch.has(item.dedupe_key)) {
        batchDuplicates.add(item.row_number);
      } else {
        seenInBatch.set(item.dedupe_key, item.row_number);
      }
    }

    // Check existing items in this job for duplicates
    const { data: existingItems } = await supabase
      .from("import_items")
      .select("dedupe_key, row_number")
      .eq("job_id", job_id)
      .in("dedupe_key", batchDedupeKeys);

    const existingDedupeKeys = new Map<string, number>();
    for (const ei of existingItems || []) {
      existingDedupeKeys.set(ei.dedupe_key, ei.row_number);
    }

    // Check existing deals in org for duplicates
    const { data: existingDeals } = await supabase
      .from("deals")
      .select("dedupe_key")
      .eq("org_id", job.org_id)
      .in("dedupe_key", batchDedupeKeys);

    const existingDealKeys = new Set((existingDeals || []).map((d) => d.dedupe_key));

    // Process each item
    const results: UpsertResult[] = [];
    const toUpsert: Array<{
      job_id: string;
      row_number: number;
      dedupe_key: string;
      payload_json: NormalizedRow;
      status: ItemStatus;
      skip_reason: SkipReason;
      validation_errors: string[] | null;
    }> = [];

    for (const item of items) {
      let status: ItemStatus;
      let skipReason: SkipReason = null;
      let errors: string[] | null = null;

      // Priority: batch duplicate > queued duplicate > deal duplicate > validation
      if (batchDuplicates.has(item.row_number)) {
        status = "skipped_duplicate";
        skipReason = "duplicate_within_file";
      } else if (existingDedupeKeys.has(item.dedupe_key) && existingDedupeKeys.get(item.dedupe_key) !== item.row_number) {
        status = "skipped_duplicate";
        skipReason = "duplicate_queued_item";
      } else if (existingDealKeys.has(item.dedupe_key)) {
        status = "skipped_duplicate";
        skipReason = "duplicate_existing_deal";
      } else if (!item.validation.valid) {
        status = "needs_fix";
        skipReason = "validation_failed";
        errors = item.validation.errors;
      } else {
        status = "valid";
      }

      results.push({
        row_number: item.row_number,
        status,
        skip_reason: skipReason,
        errors,
      });

      toUpsert.push({
        job_id,
        row_number: item.row_number,
        dedupe_key: item.dedupe_key,
        payload_json: item.payload_json,
        status,
        skip_reason: skipReason,
        validation_errors: errors,
      });
    }

    // Upsert all items
    const { error: upsertError } = await supabase
      .from("import_items")
      .upsert(toUpsert, { onConflict: "job_id,row_number" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return jsonResponse(req, { error: "Failed to upsert items", details: upsertError.message }, 500);
    }

    // Compute summary counts
    const validCount = results.filter((r) => r.status === "valid").length;
    const needsFixCount = results.filter((r) => r.status === "needs_fix").length;
    const duplicateCount = results.filter((r) => r.status === "skipped_duplicate").length;

    return jsonResponse(req, {
      success: true,
      batch_size: items.length,
      valid_count: validCount,
      needs_fix_count: needsFixCount,
      duplicate_count: duplicateCount,
      results,
    });
  } catch (err) {
    console.error("Error in v1-import-items-upsert:", err);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
