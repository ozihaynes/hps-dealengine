"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  ImportJob,
  JobStatus,
} from "@hps-internal/contracts";

// =============================================================================
// TYPES
// =============================================================================

export interface ListJobsOptions {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

export interface ListJobsResponse {
  jobs: ImportJob[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map API response row to typed ImportJob
 */
function mapJobRow(row: Record<string, unknown>): ImportJob {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    created_by: row.created_by as string,
    source_route: row.source_route as ImportJob["source_route"],
    import_kind: row.import_kind as ImportJob["import_kind"],
    file_type: row.file_type as ImportJob["file_type"],
    file_name: row.file_name as string,
    file_size_bytes: Number(row.file_size_bytes),
    file_sha256: row.file_sha256 as string,
    storage_bucket: row.storage_bucket as string,
    storage_path: row.storage_path as string,
    column_mapping: row.column_mapping as ImportJob["column_mapping"],
    status: row.status as JobStatus,
    status_message: row.status_message as string | null,
    rows_total: Number(row.rows_total ?? 0),
    rows_valid: Number(row.rows_valid ?? 0),
    rows_needs_fix: Number(row.rows_needs_fix ?? 0),
    rows_promoted: Number(row.rows_promoted ?? 0),
    rows_skipped_duplicate: Number(row.rows_skipped_duplicate ?? 0),
    rows_skipped_other: Number(row.rows_skipped_other ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// =============================================================================
// API: List Jobs
// =============================================================================

/**
 * Fetch import jobs with optional filtering and pagination
 * Uses direct Supabase query (RLS handles org scoping)
 */
export async function listImportJobs(
  options?: ListJobsOptions
): Promise<ListJobsResponse> {
  const supabase = getSupabaseClient();
  const { status, limit = 20, offset = 0 } = options ?? {};

  let query = supabase
    .from("deal_import_jobs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list jobs: ${error.message}`);
  }

  const jobs = (data ?? []).map(mapJobRow);
  const total = count ?? 0;
  const hasMore = offset + jobs.length < total;

  return { jobs, total, hasMore };
}

// =============================================================================
// API: Get Single Job
// =============================================================================

/**
 * Fetch a single import job by ID
 */
export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("deal_import_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to get job: ${error.message}`);
  }

  return mapJobRow(data);
}

// =============================================================================
// API: Archive Job
// =============================================================================

/**
 * Archive an import job (soft delete)
 */
export async function archiveImportJob(jobId: string): Promise<ImportJob> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("deal_import_jobs")
    .update({ status: "archived" })
    .eq("id", jobId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive job: ${error.message}`);
  }

  return mapJobRow(data);
}

// =============================================================================
// REALTIME: Subscribe to Job Updates
// =============================================================================

/**
 * Subscribe to real-time updates for a specific job
 * Returns an unsubscribe function
 */
export function subscribeToJob(
  jobId: string,
  onUpdate: (job: ImportJob) => void
): () => void {
  const supabase = getSupabaseClient();

  const channel = supabase
    .channel(`job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "deal_import_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.new) {
          onUpdate(mapJobRow(payload.new as Record<string, unknown>));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time updates for all jobs (for list refreshes)
 * Returns an unsubscribe function
 */
export function subscribeToJobsList(
  onUpdate: (job: ImportJob, eventType: "INSERT" | "UPDATE" | "DELETE") => void
): () => void {
  const supabase = getSupabaseClient();

  const channel = supabase
    .channel("jobs-list")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "deal_import_jobs",
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        const row = payload.new || payload.old;
        if (row) {
          onUpdate(mapJobRow(row as Record<string, unknown>), eventType);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
