"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Normalized row payload matching server schema
 */
export interface ImportItemPayload {
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

/**
 * Validation result format expected by the API
 */
export interface RowValidation {
  valid: boolean;
  errors: string[];
}

export interface ImportItemInput {
  row_number: number;
  dedupe_key: string;
  payload_json: ImportItemPayload;
  validation: RowValidation;
}

export type ItemStatus =
  | "pending"
  | "valid"
  | "needs_fix"
  | "promoted"
  | "skipped_duplicate"
  | "skipped_other"
  | "failed";

export type SkipReason =
  | "duplicate_within_file"
  | "duplicate_queued_item"
  | "duplicate_existing_deal"
  | "validation_failed"
  | "promotion_failed"
  | "user_skipped"
  | null;

export interface UpsertResult {
  row_number: number;
  status: ItemStatus;
  skip_reason: SkipReason;
  errors: string[] | null;
}

export interface UpsertBatchResponse {
  success: boolean;
  batch_size: number;
  valid_count: number;
  needs_fix_count: number;
  duplicate_count: number;
  results: UpsertResult[];
}

export interface ImportItem {
  id: string;
  job_id: string;
  row_number: number;
  dedupe_key: string;
  payload_json: ImportItemPayload;
  status: ItemStatus;
  skip_reason: SkipReason;
  validation_errors: string[] | null;
  promoted_deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListItemsResponse {
  success: boolean;
  items: ImportItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type JobStatus =
  | "pending"
  | "validating"
  | "ready"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";

export interface UpdateJobParams {
  job_id: string;
  status?: JobStatus;
  total_rows?: number;
  valid_rows?: number;
  error_rows?: number;
  imported_rows?: number;
  error_message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  rule_id: string;
}

export interface UpdateItemParams {
  item_id: string;
  normalized_payload?: Record<string, string>;
  dedupe_key?: string;
  validation_errors?: ValidationError[];
  status?: ItemStatus;
  skip_reason?: string | null;
}

export interface UpdateItemResult {
  ok: boolean;
  item: ImportItem;
  job_counts: {
    rows_total: number;
    rows_valid: number;
    rows_needs_fix: number;
    rows_skipped_duplicate: number;
    rows_promoted: number;
    rows_skipped_other: number;
  };
}

// =============================================================================
// API: Upsert Items (Batch)
// =============================================================================

const BATCH_SIZE = 200;

/**
 * Upsert import items in batches of 200
 *
 * This function handles batching automatically if more than 200 items are provided.
 * For each batch, it calls the v1-import-items-upsert Edge Function.
 *
 * @param jobId - The import job ID
 * @param items - Array of items to upsert (can be any size)
 * @param onProgress - Optional callback for progress updates
 * @returns Combined results from all batches
 */
export async function upsertImportItems(
  jobId: string,
  items: ImportItemInput[],
  onProgress?: (processed: number, total: number) => void
): Promise<UpsertBatchResponse[]> {
  const supabase = getSupabaseClient();
  const results: UpsertBatchResponse[] = [];

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase.functions.invoke(
      "v1-import-items-upsert",
      {
        body: {
          job_id: jobId,
          items: batch,
        },
      }
    );

    if (error) {
      const message = (error as Error)?.message ?? "Failed to upsert items";
      throw new Error(message);
    }

    if (!data?.success) {
      const message = data?.error ?? "Failed to upsert items";
      throw new Error(message);
    }

    results.push(data as UpsertBatchResponse);

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, items.length), items.length);
    }
  }

  return results;
}

/**
 * Aggregate results from multiple batch responses
 */
export function aggregateUpsertResults(responses: UpsertBatchResponse[]): {
  totalProcessed: number;
  validCount: number;
  needsFixCount: number;
  duplicateCount: number;
  allResults: UpsertResult[];
} {
  let validCount = 0;
  let needsFixCount = 0;
  let duplicateCount = 0;
  const allResults: UpsertResult[] = [];

  for (const response of responses) {
    validCount += response.valid_count;
    needsFixCount += response.needs_fix_count;
    duplicateCount += response.duplicate_count;
    allResults.push(...response.results);
  }

  return {
    totalProcessed: allResults.length,
    validCount,
    needsFixCount,
    duplicateCount,
    allResults,
  };
}

// =============================================================================
// API: List Items
// =============================================================================

/**
 * Fetch import items for a job with optional filtering and pagination
 */
export async function listImportItems(
  jobId: string,
  options?: {
    status?: ItemStatus;
    page?: number;
    pageSize?: number;
  }
): Promise<ListItemsResponse> {
  const supabase = getSupabaseClient();

  const params = new URLSearchParams();
  params.set("job_id", jobId);
  if (options?.status) params.set("status", options.status);
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));

  const { data, error } = await supabase.functions.invoke(
    "v1-import-items-list",
    {
      method: "GET",
      body: undefined,
      headers: {
        "x-query-params": params.toString(),
      },
    }
  );

  // Edge functions with GET need query params in URL, use alternative approach
  // Actually, supabase functions.invoke doesn't support query params well for GET
  // We need to use a workaround - encode in the function name or use POST

  // Re-fetch using fetch directly with auth header
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/v1-import-items-list?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error ?? `Failed to list items: ${res.status}`);
  }

  const responseData = await res.json();

  if (!responseData.success) {
    throw new Error(responseData.error ?? "Failed to list items");
  }

  return responseData as ListItemsResponse;
}

/**
 * Fetch all import items for a job (paginated fetch)
 * Used for export functionality
 */
export async function fetchAllImportItems(
  jobId: string,
  status?: ItemStatus
): Promise<ImportItem[]> {
  const allItems: ImportItem[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await listImportItems(jobId, {
      status,
      page,
      pageSize,
    });

    allItems.push(...response.items);

    if (response.items.length < pageSize || page >= response.total_pages) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allItems;
}

// =============================================================================
// API: Update Job
// =============================================================================

/**
 * Update import job status and counts
 */
export async function updateImportJob(
  params: UpdateJobParams
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke(
    "v1-import-job-update",
    {
      method: "PATCH",
      body: params,
    }
  );

  if (error) {
    const message = (error as Error)?.message ?? "Failed to update job";
    throw new Error(message);
  }

  if (!data?.success) {
    const message = data?.error ?? "Failed to update job";
    throw new Error(message);
  }

  return data.job;
}

/**
 * Transition job to validating status
 */
export async function startJobValidation(jobId: string): Promise<void> {
  await updateImportJob({
    job_id: jobId,
    status: "validating",
  });
}

/**
 * Mark job as ready with final counts
 */
export async function markJobReady(
  jobId: string,
  counts: {
    total_rows: number;
    valid_rows: number;
    error_rows: number;
  }
): Promise<void> {
  await updateImportJob({
    job_id: jobId,
    status: "ready",
    ...counts,
  });
}

/**
 * Mark job as failed with error message
 */
export async function markJobFailed(
  jobId: string,
  errorMessage: string
): Promise<void> {
  await updateImportJob({
    job_id: jobId,
    status: "failed",
    error_message: errorMessage,
  });
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<void> {
  await updateImportJob({
    job_id: jobId,
    status: "cancelled",
  });
}

// =============================================================================
// API: Update Single Item
// =============================================================================

/**
 * Update a single import item with new payload, validation, or status
 */
export async function updateImportItem(
  params: UpdateItemParams
): Promise<UpdateItemResult> {
  const supabase = getSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-import-item-update`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to update item");
  }

  return data as UpdateItemResult;
}
