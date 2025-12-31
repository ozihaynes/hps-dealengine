import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseWithJwt,
  getRequestCorrelation,
  jsonError,
  mapSupabaseError,
  parseAuthHeader,
} from "../_shared";

export const runtime = "nodejs";

const SearchTypeSchema = z.enum([
  "deal_id",
  "run_id",
  "user_id",
  "request_id",
  "trace_id",
]);

const OrgIdSchema = z.string().uuid();

const CreateCaseSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().trim().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z
    .enum(["open", "in_progress", "blocked", "resolved", "closed"])
    .optional(),
  dealId: z.string().uuid().nullable().optional(),
  runId: z.string().uuid().nullable().optional(),
  subjectUserId: z.string().uuid().nullable().optional(),
  requestId: z.string().trim().nullable().optional(),
  traceId: z.string().trim().nullable().optional(),
  policyVersionId: z.string().uuid().nullable().optional(),
  policyHash: z.string().trim().nullable().optional(),
  releaseSha: z.string().trim().nullable().optional(),
  environment: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const correlation = getRequestCorrelation(req);
  const token = parseAuthHeader(req);
  if (!token) {
    return jsonError("auth_missing", 401, undefined, correlation);
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId")?.trim() ?? "";
  if (!orgId) {
    return jsonError("org_missing", 400, undefined, correlation);
  }
  const orgParse = OrgIdSchema.safeParse(orgId);
  if (!orgParse.success) {
    return jsonError("bad_request", 400, orgParse.error.flatten(), correlation);
  }

  const queryTypeRaw = url.searchParams.get("queryType");
  const queryValue = url.searchParams.get("query");
  const queryType = queryTypeRaw
    ? SearchTypeSchema.safeParse(queryTypeRaw)
    : null;

  if (queryTypeRaw && (!queryType?.success || !queryValue)) {
    return jsonError("invalid_search", 400, undefined, correlation);
  }

  let supabase;
  try {
    supabase = createSupabaseWithJwt(token);
  } catch (error) {
    return jsonError(
      "supabase_config_error",
      500,
      {
        message: (error as Error).message,
      },
      correlation,
    );
  }

  let query = supabase
    .from("support_cases")
    .select(
      "id, org_id, title, severity, status, created_at, deal_id, run_id, subject_user_id, request_id, trace_id, policy_version_id, policy_hash",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (queryType?.success && queryValue) {
    const field = queryType.data;
    const value = queryValue.trim();
    if (value.length === 0) {
      return jsonError("invalid_search", 400, undefined, correlation);
    }
    switch (field) {
      case "deal_id":
        query = query.eq("deal_id", value);
        break;
      case "run_id":
        query = query.eq("run_id", value);
        break;
      case "user_id":
        query = query.eq("subject_user_id", value);
        break;
      case "request_id":
        query = query.eq("request_id", value);
        break;
      case "trace_id":
        query = query.eq("trace_id", value);
        break;
      default:
        return jsonError("invalid_search", 400, undefined, correlation);
    }
  }

  const { data, error } = await query;
  if (error) {
    return mapSupabaseError(error, "support_cases_list_failed", correlation);
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const correlation = getRequestCorrelation(req);
  const token = parseAuthHeader(req);
  if (!token) {
    return jsonError("auth_missing", 401, undefined, correlation);
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("bad_request", 400, parsed.error.flatten(), correlation);
  }

  let supabase;
  try {
    supabase = createSupabaseWithJwt(token);
  } catch (error) {
    return jsonError(
      "supabase_config_error",
      500,
      {
        message: (error as Error).message,
      },
      correlation,
    );
  }

  const payload = parsed.data;
  const nextStatus = payload.status ?? "open";
  const closedAt =
    nextStatus === "resolved" || nextStatus === "closed"
      ? new Date().toISOString()
      : null;
  const requestId =
    typeof payload.requestId === "string" && payload.requestId.trim().length > 0
      ? payload.requestId.trim()
      : correlation.requestId;
  const traceId =
    typeof payload.traceId === "string" && payload.traceId.trim().length > 0
      ? payload.traceId.trim()
      : correlation.traceId;

  const { data: caseRow, error: caseError } = await supabase
    .from("support_cases")
    .insert({
      org_id: payload.orgId,
      title: payload.title,
      severity: payload.severity,
      status: nextStatus,
      closed_at: closedAt,
      deal_id: payload.dealId ?? null,
      run_id: payload.runId ?? null,
      subject_user_id: payload.subjectUserId ?? null,
      request_id: requestId ?? null,
      trace_id: traceId ?? null,
      policy_version_id: payload.policyVersionId ?? null,
      policy_hash: payload.policyHash ?? null,
      release_sha: payload.releaseSha ?? null,
      environment: payload.environment ?? null,
    })
    .select(
      "id, org_id, title, severity, status, created_at, deal_id, run_id, subject_user_id, request_id, trace_id, policy_version_id, policy_hash",
    )
    .single();

  if (caseError) {
    return mapSupabaseError(caseError, "support_case_create_failed", correlation);
  }

  const { error: eventError } = await supabase.from("support_case_events").insert({
    org_id: payload.orgId,
    support_case_id: caseRow.id,
    event_type: "created",
    note: payload.note ?? null,
  });

  if (eventError) {
    return mapSupabaseError(eventError, "support_case_event_failed", correlation);
  }

  return NextResponse.json({ ok: true, case: caseRow });
}
