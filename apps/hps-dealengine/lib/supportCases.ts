"use client";

import { getRequestIdFromCookie } from "@/lib/o11y/requestId";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type SupportCaseSeverity = "low" | "medium" | "high" | "critical";
export type SupportCaseStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "closed";

export type SupportCaseSummary = {
  id: string;
  org_id: string;
  title: string;
  severity: SupportCaseSeverity;
  status: SupportCaseStatus;
  created_at: string | null;
  deal_id: string | null;
  run_id: string | null;
  subject_user_id: string | null;
  request_id: string | null;
  trace_id: string | null;
  policy_version_id: string | null;
  policy_hash: string | null;
};

export type SupportCaseDetail = SupportCaseSummary & {
  created_by: string;
  updated_at: string | null;
  closed_at: string | null;
  policy_version_id: string | null;
  policy_hash: string | null;
  release_sha: string | null;
  environment: string | null;
};

export type SupportCaseEvent = {
  id: string;
  created_at: string | null;
  created_by: string | null;
  event_type: "created" | "note" | "status_changed" | "updated";
  note: string | null;
  status_from: string | null;
  status_to: string | null;
};

export type SupportCaseRun = {
  id: string;
  created_at: string | null;
  deal_id: string | null;
  policy_version_id: string | null;
  policy_hash: string | null;
};

export type SupportCaseDetailResponse = {
  case: SupportCaseDetail;
  events: SupportCaseEvent[];
  run: SupportCaseRun | null;
};

type SupportCaseListResponse = {
  items: SupportCaseSummary[];
};

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Not signed in.");
  }
  return token;
}

async function fetchWithAuth<T>(input: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("x-request-id")) {
    const requestId = getRequestIdFromCookie() ?? crypto.randomUUID();
    headers.set("x-request-id", requestId);
  }

  const res = await fetch(input, { ...init, headers });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Support request failed.";
    throw new Error(message);
  }
  return payload as T;
}

export async function listSupportCases(params: {
  orgId: string;
  queryType?: "deal_id" | "run_id" | "user_id" | "request_id" | "trace_id";
  query?: string;
}): Promise<SupportCaseListResponse> {
  const query = new URLSearchParams({ orgId: params.orgId });
  if (params.queryType && params.query) {
    query.set("queryType", params.queryType);
    query.set("query", params.query);
  }
  return fetchWithAuth<SupportCaseListResponse>(
    `/api/admin/support/cases?${query.toString()}`,
  );
}

export async function createSupportCase(payload: {
  orgId: string;
  title: string;
  severity: SupportCaseSeverity;
  status?: SupportCaseStatus;
  dealId?: string | null;
  runId?: string | null;
  subjectUserId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  policyVersionId?: string | null;
  policyHash?: string | null;
  releaseSha?: string | null;
  environment?: string | null;
  note?: string | null;
}): Promise<{ case: SupportCaseSummary }> {
  return fetchWithAuth<{ case: SupportCaseSummary }>("/api/admin/support/cases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSupportCaseDetail(
  caseId: string,
): Promise<SupportCaseDetailResponse> {
  return fetchWithAuth<SupportCaseDetailResponse>(
    `/api/admin/support/cases/${caseId}`,
  );
}

export async function addSupportCaseEvent(params: {
  caseId: string;
  type: "note" | "status_changed";
  note: string;
  statusTo?: SupportCaseStatus;
}): Promise<void> {
  await fetchWithAuth(`/api/admin/support/cases/${params.caseId}/events`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}
