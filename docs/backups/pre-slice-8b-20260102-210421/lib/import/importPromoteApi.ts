"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";

// =============================================================================
// TYPES
// =============================================================================

export interface PromoteResult {
  item_id: string;
  deal_id: string | null;
  success: boolean;
  error?: string;
}

export interface JobCounts {
  rows_total: number;
  rows_valid: number;
  rows_needs_fix: number;
  rows_skipped_duplicate: number;
  rows_promoted: number;
  rows_skipped_other: number;
}

export interface PromoteResponse {
  ok: boolean;
  promoted_count: number;
  failed_count: number;
  remaining_count: number;
  results: PromoteResult[];
  job_counts?: JobCounts;
  job_complete: boolean;
}

export interface PromoteItemsParams {
  job_id: string;
  item_ids?: string[];
}

export interface PromoteProgress {
  promoted: number;
  failed: number;
  remaining: number;
  total: number;
  isComplete: boolean;
}

// =============================================================================
// API: Promote Items
// =============================================================================

const MAX_BATCH_SIZE = 50;

/**
 * Promote specific import items to deals
 *
 * @param params - job_id and optional item_ids
 * @returns Promotion results
 */
export async function promoteItems(
  params: PromoteItemsParams
): Promise<PromoteResponse> {
  const supabase = getSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-import-promote`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to promote items");
  }

  return data as PromoteResponse;
}

/**
 * Promote all valid items in a job with progress callback
 *
 * This function handles batching automatically, calling the promote endpoint
 * repeatedly until all valid items are promoted.
 *
 * @param jobId - The import job ID
 * @param onProgress - Optional callback for progress updates
 * @param onBatchComplete - Optional callback after each batch completes
 * @returns Final promotion summary
 */
export async function promoteAllItems(
  jobId: string,
  onProgress?: (progress: PromoteProgress) => void,
  onBatchComplete?: (batchResults: PromoteResult[]) => void
): Promise<{
  totalPromoted: number;
  totalFailed: number;
  allResults: PromoteResult[];
  jobCounts: JobCounts | null;
}> {
  let totalPromoted = 0;
  let totalFailed = 0;
  const allResults: PromoteResult[] = [];
  let jobCounts: JobCounts | null = null;
  let remaining = Infinity;

  // Keep promoting batches until no more items
  while (remaining > 0) {
    const response = await promoteItems({ job_id: jobId });

    totalPromoted += response.promoted_count;
    totalFailed += response.failed_count;
    allResults.push(...response.results);
    remaining = response.remaining_count;

    if (response.job_counts) {
      jobCounts = response.job_counts;
    }

    // Report progress
    if (onProgress) {
      const total = totalPromoted + totalFailed + remaining;
      onProgress({
        promoted: totalPromoted,
        failed: totalFailed,
        remaining,
        total,
        isComplete: response.job_complete,
      });
    }

    // Report batch completion
    if (onBatchComplete && response.results.length > 0) {
      onBatchComplete(response.results);
    }

    // Exit if job is complete or no items were processed
    if (response.job_complete || response.results.length === 0) {
      break;
    }
  }

  return {
    totalPromoted,
    totalFailed,
    allResults,
    jobCounts,
  };
}

/**
 * Get promotion status for a job
 *
 * Returns counts of items in each status
 */
export async function getPromotionStatus(jobId: string): Promise<{
  validCount: number;
  promotedCount: number;
  needsFixCount: number;
  duplicateCount: number;
  failedCount: number;
  canPromote: boolean;
}> {
  const supabase = getSupabaseClient();

  // Fetch job with item counts
  const { data: job, error: jobError } = await supabase
    .from("deal_import_jobs")
    .select("status, rows_valid, rows_promoted, rows_needs_fix, rows_skipped_duplicate, rows_skipped_other")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    throw new Error("Job not found");
  }

  const canPromote =
    (job.status === "ready" || job.status === "promoting") &&
    job.rows_valid > 0;

  return {
    validCount: job.rows_valid || 0,
    promotedCount: job.rows_promoted || 0,
    needsFixCount: job.rows_needs_fix || 0,
    duplicateCount: job.rows_skipped_duplicate || 0,
    failedCount: job.rows_skipped_other || 0,
    canPromote,
  };
}
