/**
 * Staff intake API helpers.
 *
 * These functions are used by staff pages for managing intake submissions.
 * All require authentication (JWT).
 */

import { getSupabaseClient } from "@/lib/supabaseClient";

// ============================================================================
// Types
// ============================================================================

export type IntakeSubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_REVIEW"
  | "REVISION_REQUESTED"
  | "COMPLETED"
  | "REJECTED"
  | "ARCHIVED";

export type IntakeLinkStatus =
  | "SENT"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "REVOKED"
  | "REJECTED";

export type IntakeInboxItem = {
  submission: {
    id: string;
    org_id: string;
    deal_id: string;
    intake_link_id: string | null;
    intake_schema_version_id: string;
    source: string;
    payload_json: Record<string, unknown>;
    status: IntakeSubmissionStatus;
    submitted_at: string | null;
    revision_cycle: number;
    created_at: string;
    updated_at: string;
  };
  deal: {
    id: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  link: {
    id: string;
    recipient_email: string;
    recipient_name: string | null;
    status: IntakeLinkStatus;
    expires_at: string;
  } | null;
  files_count: number;
  files_pending_scan: number;
  files_infected: number;
};

export type IntakeInboxResponse = {
  items: IntakeInboxItem[];
  total_count: number;
  page: number;
  page_size: number;
};

export type IntakeSubmissionDetail = {
  submission: Record<string, unknown>;
  link: Record<string, unknown> | null;
  schema_version: {
    id: string;
    display_name: string;
    semantic_version: string;
    description: string | null;
    schema_public_json: Record<string, unknown>;
  } | null;
  files: Array<{
    id: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    storage_state: string;
    scan_status: string;
    scanned_at: string | null;
    created_at: string;
  }>;
  revision_requests: Array<{
    id: string;
    request_notes: string;
    created_at: string;
    requested_by: string;
    responded_at: string | null;
    new_link_id: string | null;
  }>;
  rejection: {
    id: string;
    rejection_reason: string;
    rejected_by: string;
    created_at: string;
  } | null;
  population_events: Array<{
    id: string;
    summary_json: Record<string, unknown>;
    field_results_json: unknown[];
    overwrite_mode: string;
    created_by: string;
    created_at: string;
  }>;
  deal: {
    id: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    payload: Record<string, unknown> | null;
  } | null;
};

export type IntakeInboxFilters = {
  status?: IntakeSubmissionStatus;
  deal_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
};

export type PopulationSummary = {
  created_count: number;
  skipped_count: number;
  overwritten_count: number;
  error_count: number;
  evidence_converted_count: number;
};

export type PopulationFieldResult = {
  field_key: string;
  target_path: string;
  value_before: unknown;
  value_after: unknown;
  action: "CREATE" | "SKIP" | "OVERWRITE" | "ERROR";
  reason: string | null;
};

export type PopulateSubmissionResponse = {
  population_event_id: string;
  summary: PopulationSummary;
  field_results: PopulationFieldResult[];
  idempotent_hit: boolean;
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch intake inbox with filters and pagination.
 */
export async function fetchIntakeInbox(
  filters: IntakeInboxFilters = {},
): Promise<IntakeInboxResponse> {
  const supabase = getSupabaseClient();

  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.deal_id) params.set("deal_id", filters.deal_id);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));

  const { data, error } = await supabase.functions.invoke("v1-intake-inbox", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: undefined,
  });

  // Note: Supabase functions.invoke doesn't support query params directly,
  // so we need to use fetch for GET requests with query params
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/v1-intake-inbox?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok || result.ok === false) {
    throw new Error(result.message ?? result.error ?? "Failed to fetch inbox");
  }

  return result as IntakeInboxResponse;
}

/**
 * Fetch full submission detail.
 */
export async function fetchIntakeSubmissionDetail(
  submissionId: string,
): Promise<IntakeSubmissionDetail> {
  const supabase = getSupabaseClient();
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/v1-intake-submission-detail?submission_id=${submissionId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok || result.ok === false) {
    throw new Error(result.message ?? result.error ?? "Failed to fetch submission detail");
  }

  return result as IntakeSubmissionDetail;
}

/**
 * Request revision for a submission.
 */
export async function requestIntakeRevision(
  submissionId: string,
  requestNotes: string,
): Promise<{
  revision_request_id: string;
  new_link_id: string;
  new_token: string;
  email_sent: boolean;
  expires_at: string;
}> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke(
    "v1-intake-request-revision",
    {
      body: {
        submission_id: submissionId,
        request_notes: requestNotes,
      },
    },
  );

  if (error) {
    const message =
      (data as Record<string, unknown>)?.message ??
      (data as Record<string, unknown>)?.error ??
      error.message;
    throw new Error(String(message) ?? "Failed to request revision");
  }

  if (data?.ok === false) {
    throw new Error(data.message ?? data.error ?? "Failed to request revision");
  }

  return data;
}

/**
 * Reject a submission.
 */
export async function rejectIntakeSubmission(
  submissionId: string,
  rejectionReason: string,
): Promise<{
  rejection_id: string;
  submission_status: string;
}> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke("v1-intake-reject", {
    body: {
      submission_id: submissionId,
      rejection_reason: rejectionReason,
    },
  });

  if (error) {
    const message =
      (data as Record<string, unknown>)?.message ??
      (data as Record<string, unknown>)?.error ??
      error.message;
    throw new Error(String(message) ?? "Failed to reject submission");
  }

  if (data?.ok === false) {
    throw new Error(data.message ?? data.error ?? "Failed to reject submission");
  }

  return data;
}

/**
 * Fetch count of PENDING_REVIEW submissions for badge.
 */
export async function fetchPendingReviewCount(): Promise<number> {
  const supabase = getSupabaseClient();

  // First get user's org memberships
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return 0;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", userData.user.id);

  if (!memberships?.length) return 0;

  const orgIds = memberships
    .map((m: { org_id: string | null }) => m.org_id)
    .filter((id: string | null): id is string => !!id);

  if (!orgIds.length) return 0;

  // Count submissions with PENDING_REVIEW or SUBMITTED status
  const { count, error } = await supabase
    .from("intake_submissions")
    .select("id", { count: "exact", head: true })
    .in("org_id", orgIds)
    .in("status", ["SUBMITTED", "PENDING_REVIEW"]);

  if (error) {
    console.error("Failed to fetch pending review count", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Populate deal from intake submission.
 * Deterministic and idempotent - same inputs produce same outputs.
 */
export async function populateSubmission(
  submissionId: string,
  overwriteMode: "skip" | "overwrite" = "skip",
  overwriteReasons?: Record<string, string>,
): Promise<PopulateSubmissionResponse> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke("v1-intake-populate", {
    body: {
      submission_id: submissionId,
      overwrite_mode: overwriteMode,
      overwrite_reasons: overwriteReasons,
    },
  });

  if (error) {
    const message =
      (data as Record<string, unknown>)?.message ??
      (data as Record<string, unknown>)?.error ??
      error.message;
    throw new Error(String(message) ?? "Failed to populate deal");
  }

  if (data?.ok === false) {
    // Check for files_not_clean error
    if (data.error === "files_not_clean") {
      const pending = (data.pending_files as string[]) ?? [];
      const infected = (data.infected_files as string[]) ?? [];
      throw new Error(
        `Files must pass virus scan. Pending: ${pending.length}, Infected: ${infected.length}`
      );
    }
    throw new Error(data.message ?? data.error ?? "Failed to populate deal");
  }

  return data as PopulateSubmissionResponse;
}
