"use client";

// ============================================================================
// ESTIMATE REQUESTS CLIENT API
// ============================================================================
// Purpose: Client-side functions for estimate request operations
// Uses: Supabase client with RLS (user context)
// ============================================================================

import type {
  EstimateRequest,
  CreateEstimateRequestInput,
  SendEstimateRequestResponse,
  EstimateRequestStatus,
} from "@hps-internal/contracts";
import { CreateEstimateRequestInputSchema } from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

// ============================================================================
// ROW MAPPING
// ============================================================================

function mapEstimateRequestRow(row: Record<string, unknown>): EstimateRequest {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    deal_id: row.deal_id as string,
    gc_name: row.gc_name as string,
    gc_email: row.gc_email as string,
    gc_phone: (row.gc_phone as string) ?? null,
    gc_company: (row.gc_company as string) ?? null,
    status: row.status as EstimateRequestStatus,
    submission_token: row.submission_token as string,
    token_expires_at: row.token_expires_at as string,
    sent_at: (row.sent_at as string) ?? null,
    viewed_at: (row.viewed_at as string) ?? null,
    submitted_at: (row.submitted_at as string) ?? null,
    estimate_file_path: (row.estimate_file_path as string) ?? null,
    estimate_file_name: (row.estimate_file_name as string) ?? null,
    estimate_file_size_bytes: (row.estimate_file_size_bytes as number) ?? null,
    estimate_file_type: (row.estimate_file_type as string) ?? null,
    request_notes: (row.request_notes as string) ?? null,
    gc_notes: (row.gc_notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: (row.created_by as string) ?? null,
  };
}

// ============================================================================
// SEND ESTIMATE REQUEST (via Edge Function)
// ============================================================================

export async function sendEstimateRequest(
  input: CreateEstimateRequestInput
): Promise<SendEstimateRequestResponse> {
  try {
    // Validate input before sending
    const validated = CreateEstimateRequestInputSchema.parse(input);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke(
      "v1-estimate-request",
      {
        body: validated,
      }
    );

    if (error) {
      console.error("[sendEstimateRequest] Function error:", error);
      return { ok: false, error: error.message };
    }

    return data as SendEstimateRequestResponse;
  } catch (err) {
    console.error("[sendEstimateRequest] Error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================================================
// LIST ESTIMATE REQUESTS FOR A DEAL
// ============================================================================

export async function listEstimateRequests(
  dealId: string
): Promise<EstimateRequest[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("estimate_requests")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listEstimateRequests] Error:", error);
    throw new Error(error.message);
  }

  return (data ?? []).map(mapEstimateRequestRow);
}

// ============================================================================
// GET SINGLE ESTIMATE REQUEST
// ============================================================================

export async function getEstimateRequest(
  requestId: string
): Promise<EstimateRequest | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("estimate_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("[getEstimateRequest] Error:", error);
    throw new Error(error.message);
  }

  return mapEstimateRequestRow(data);
}

// ============================================================================
// CANCEL ESTIMATE REQUEST
// ============================================================================

export async function cancelEstimateRequest(requestId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("estimate_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .in("status", ["pending", "sent", "viewed"]); // Can only cancel active requests

  if (error) {
    console.error("[cancelEstimateRequest] Error:", error);
    throw new Error(error.message);
  }
}

// ============================================================================
// GET SIGNED URL FOR ESTIMATE FILE
// ============================================================================

export async function getEstimateFileUrl(
  filePath: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from("repair-estimates")
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("[getEstimateFileUrl] Error:", error);
    throw new Error(error.message);
  }

  return data.signedUrl;
}

// ============================================================================
// MARK EXPIRED REQUESTS
// ============================================================================

export async function markExpiredRequests(dealId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("estimate_requests")
    .update({
      status: "expired",
      updated_at: now,
    })
    .eq("deal_id", dealId)
    .in("status", ["pending", "sent", "viewed"])
    .lt("token_expires_at", now)
    .select("id");

  if (error) {
    console.error("[markExpiredRequests] Error:", error);
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

// ============================================================================
// RESEND ESTIMATE REQUEST (creates new request, cancels old)
// ============================================================================

export async function resendEstimateRequest(
  originalRequestId: string,
  input: CreateEstimateRequestInput
): Promise<SendEstimateRequestResponse> {
  try {
    // Cancel the original request
    await cancelEstimateRequest(originalRequestId);

    // Send a new request
    return await sendEstimateRequest(input);
  } catch (err) {
    console.error("[resendEstimateRequest] Error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
