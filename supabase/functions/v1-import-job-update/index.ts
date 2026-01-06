import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

// =============================================================================
// TYPES
// =============================================================================

type JobStatus = "pending" | "validating" | "ready" | "importing" | "completed" | "failed" | "cancelled";

interface UpdateRequest {
  job_id: string;
  status?: JobStatus;
  total_rows?: number;
  valid_rows?: number;
  error_rows?: number;
  imported_rows?: number;
  error_message?: string;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ["validating", "cancelled"],
  validating: ["ready", "failed", "cancelled"],
  ready: ["importing", "cancelled"],
  importing: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "PATCH") {
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
    const body: UpdateRequest = await req.json();
    const { job_id, status, total_rows, valid_rows, error_rows, imported_rows, error_message } = body;

    if (!job_id) {
      return jsonResponse(req, { error: "Missing job_id" }, 400);
    }

    // Verify job access via RLS
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("id, status")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return jsonResponse(req, { error: "Job not found or access denied" }, 404);
    }

    // Validate status transition
    if (status && status !== job.status) {
      const allowedTransitions = VALID_TRANSITIONS[job.status as JobStatus] || [];
      if (!allowedTransitions.includes(status)) {
        return jsonResponse(req, {
          error: `Invalid status transition from '${job.status}' to '${status}'`,
          allowed_transitions: allowedTransitions,
        }, 400);
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (total_rows !== undefined) updates.total_rows = total_rows;
    if (valid_rows !== undefined) updates.valid_rows = valid_rows;
    if (error_rows !== undefined) updates.error_rows = error_rows;
    if (imported_rows !== undefined) updates.imported_rows = imported_rows;
    if (error_message !== undefined) updates.error_message = error_message;

    if (Object.keys(updates).length === 0) {
      return jsonResponse(req, { error: "No updates provided" }, 400);
    }

    // Update job
    const { data: updatedJob, error: updateError } = await supabase
      .from("import_jobs")
      .update(updates)
      .eq("id", job_id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse(req, { error: "Failed to update job", details: updateError.message }, 500);
    }

    return jsonResponse(req, {
      success: true,
      job: updatedJob,
    });
  } catch (err) {
    console.error("Error in v1-import-job-update:", err);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
