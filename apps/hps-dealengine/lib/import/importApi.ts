"use client";

import type {
  ColumnMapping,
  ImportJob,
  ImportJobCreateInput,
  ImportJobCreateResult,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

// =============================================================================
// TYPES
// =============================================================================

export type { ImportJob, ImportJobCreateInput, ImportJobCreateResult };

export type ImportJobCreateParams = Omit<ImportJobCreateInput, "file_sha256" | "file_size_bytes"> & {
  file: File;
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Compute SHA-256 hex hash of a file
 */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Map API response job to typed ImportJob
 */
function mapJobRow(row: Record<string, unknown>): ImportJob {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    created_by: row.created_by as string,
    source_route: row.source_route as "startup" | "deals" | "import",
    import_kind: row.import_kind as "deals" | "contacts",
    file_type: row.file_type as "csv" | "xlsx" | "json",
    file_name: row.file_name as string,
    file_size_bytes: Number(row.file_size_bytes),
    file_sha256: row.file_sha256 as string,
    storage_bucket: row.storage_bucket as string,
    storage_path: row.storage_path as string,
    column_mapping: row.column_mapping as ColumnMapping | null,
    status: row.status as ImportJob["status"],
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
// API: Create Import Job
// =============================================================================

/**
 * Create a new import job and upload the file
 *
 * 1. Compute file hash
 * 2. Call v1-import-job-create to get job + signed upload URL
 * 3. Upload file to signed URL
 * 4. Return the created job
 */
export async function createImportJob(
  params: ImportJobCreateParams
): Promise<ImportJob> {
  const supabase = getSupabaseClient();
  const { file, source_route, import_kind, file_type, file_name } = params;

  // Compute SHA-256 hash of file
  const file_sha256 = await sha256Hex(file);
  const file_size_bytes = file.size;

  // Call Edge Function to create job and get signed upload URL
  const payload: ImportJobCreateInput = {
    source_route,
    import_kind: import_kind ?? "deals",
    file_type,
    file_name: file_name ?? file.name,
    file_size_bytes,
    file_sha256,
  };

  const { data, error } = await supabase.functions.invoke("v1-import-job-create", {
    body: payload,
  });

  if (error) {
    const message = (error as Error)?.message ?? "Failed to create import job";
    throw new Error(message);
  }

  if (!data?.ok) {
    const message = data?.error ?? "Failed to create import job";
    throw new Error(message);
  }

  const { job, upload_url, upload_path } = data as {
    job: Record<string, unknown>;
    upload_url: string;
    upload_path: string;
  };

  // Extract token from signed URL for uploadToSignedUrl
  // The signed URL format includes a token parameter
  const url = new URL(upload_url);
  const token = url.searchParams.get("token");

  if (!token) {
    throw new Error("Missing upload token in signed URL");
  }

  // Upload file to storage using signed URL
  const uploadRes = await supabase.storage
    .from("imports")
    .uploadToSignedUrl(upload_path, token, file);

  if (uploadRes.error) {
    throw new Error(`File upload failed: ${uploadRes.error.message}`);
  }

  return mapJobRow(job);
}

/**
 * Create import job without uploading (for cases where upload is handled separately)
 * Returns the job and upload details
 */
export async function createImportJobDryRun(
  params: ImportJobCreateParams
): Promise<ImportJobCreateResult> {
  const supabase = getSupabaseClient();
  const { file, source_route, import_kind, file_type, file_name } = params;

  // Compute SHA-256 hash of file
  const file_sha256 = await sha256Hex(file);
  const file_size_bytes = file.size;

  const payload: ImportJobCreateInput = {
    source_route,
    import_kind: import_kind ?? "deals",
    file_type,
    file_name: file_name ?? file.name,
    file_size_bytes,
    file_sha256,
  };

  const { data, error } = await supabase.functions.invoke("v1-import-job-create", {
    body: payload,
  });

  if (error) {
    const message = (error as Error)?.message ?? "Failed to create import job";
    throw new Error(message);
  }

  if (!data?.ok) {
    const message = data?.error ?? "Failed to create import job";
    throw new Error(message);
  }

  return {
    job: mapJobRow(data.job),
    upload_url: data.upload_url,
    upload_path: data.upload_path,
  };
}

/**
 * Upload file to an existing import job using the upload details
 */
export async function uploadImportFile(
  upload_path: string,
  upload_url: string,
  file: File
): Promise<void> {
  const supabase = getSupabaseClient();

  // Extract token from signed URL
  const url = new URL(upload_url);
  const token = url.searchParams.get("token");

  if (!token) {
    throw new Error("Missing upload token in signed URL");
  }

  const uploadRes = await supabase.storage
    .from("imports")
    .uploadToSignedUrl(upload_path, token, file);

  if (uploadRes.error) {
    throw new Error(`File upload failed: ${uploadRes.error.message}`);
  }
}
