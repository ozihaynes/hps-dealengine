/**
 * Snapshot API Client
 *
 * Type-safe API client for dashboard snapshot edge functions.
 * Handles authentication, request formatting, and response parsing.
 *
 * @module snapshot-api
 * @version 1.0.0
 */

import { getSupabaseClient } from "./supabaseClient";
import type {
  DashboardSnapshot,
  DashboardSnapshotSummary,
  Verdict,
  UrgencyBand,
  SnapshotGenerateResponse,
  SnapshotGetResponse,
  SnapshotListResponse,
  SnapshotErrorResponse,
} from "@hps-internal/contracts";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateSnapshotParams {
  dealId: string;
  runId?: string;
  forceRegenerate?: boolean;
}

export interface GetSnapshotParams {
  dealId: string;
  includeTrace?: boolean;
}

export interface ListSnapshotsParams {
  verdict?: Verdict;
  urgencyBand?: UrgencyBand;
  limit?: number;
  offset?: number;
  sortBy?: "urgency_score" | "closeability_index" | "risk_adjusted_spread" | "as_of";
  sortOrder?: "asc" | "desc";
}

export interface SnapshotApiResult<T> {
  data: T | null;
  error: SnapshotApiError | null;
}

export interface SnapshotApiError {
  code: string;
  message: string;
  status: number;
}

// ============================================================================
// API CLIENT
// ============================================================================

async function getAuthToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not configured");
  return url;
}

async function invokeFunction<T>(
  functionName: string,
  method: "GET" | "POST",
  params?: Record<string, unknown>
): Promise<SnapshotApiResult<T>> {
  try {
    const token = await getAuthToken();
    const baseUrl = getSupabaseUrl();

    let url = `${baseUrl}/functions/v1/${functionName}`;
    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (method === "GET" && params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    if (method === "POST" && params) {
      options.body = JSON.stringify(params);
    }

    const response = await fetch(url, options);
    const json = await response.json();

    if (!response.ok || json.ok === false) {
      const errorResponse = json as SnapshotErrorResponse;
      return {
        data: null,
        error: {
          code: errorResponse.error?.code ?? "UNKNOWN_ERROR",
          message: errorResponse.error?.message ?? "An unknown error occurred",
          status: response.status,
        },
      };
    }

    return { data: json as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message,
        status: 0,
      },
    };
  }
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Generate a new dashboard snapshot for a deal
 */
export async function generateSnapshot(
  params: GenerateSnapshotParams
): Promise<SnapshotApiResult<SnapshotGenerateResponse>> {
  return invokeFunction<SnapshotGenerateResponse>(
    "v1-snapshot-generate",
    "POST",
    {
      deal_id: params.dealId,
      run_id: params.runId,
      force_regenerate: params.forceRegenerate,
    }
  );
}

/**
 * Get the latest snapshot for a deal
 */
export async function getSnapshot(
  params: GetSnapshotParams
): Promise<SnapshotApiResult<SnapshotGetResponse>> {
  return invokeFunction<SnapshotGetResponse>(
    "v1-snapshot-get",
    "GET",
    {
      deal_id: params.dealId,
      include_trace: params.includeTrace,
    }
  );
}

/**
 * List snapshots for the portfolio
 */
export async function listSnapshots(
  params: ListSnapshotsParams = {}
): Promise<SnapshotApiResult<SnapshotListResponse>> {
  return invokeFunction<SnapshotListResponse>(
    "v1-snapshot-list",
    "GET",
    {
      verdict: params.verdict,
      urgency_band: params.urgencyBand,
      limit: params.limit,
      offset: params.offset,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
    }
  );
}
