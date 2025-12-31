import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseWithJwt,
  jsonError,
  mapSupabaseError,
  parseAuthHeader,
} from "../../_shared";

export const runtime = "nodejs";

function normalizeCaseId(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export async function GET(
  req: NextRequest,
  context: { params: { caseId?: string | string[] } },
) {
  const token = parseAuthHeader(req);
  if (!token) {
    return jsonError("auth_missing", 401);
  }

  const caseId = normalizeCaseId(context.params.caseId);
  if (!caseId) {
    return jsonError("case_id_missing", 400);
  }

  let supabase;
  try {
    supabase = createSupabaseWithJwt(token);
  } catch (error) {
    return jsonError("supabase_config_error", 500, {
      message: (error as Error).message,
    });
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("support_cases")
    .select(
      "id, org_id, created_by, title, severity, status, deal_id, run_id, subject_user_id, request_id, trace_id, policy_version_id, policy_hash, release_sha, environment, created_at, updated_at, closed_at",
    )
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) {
    return mapSupabaseError(caseError, "support_case_fetch_failed");
  }
  if (!caseRow) {
    return jsonError("not_found", 404);
  }

  const { data: events, error: eventsError } = await supabase
    .from("support_case_events")
    .select(
      "id, created_at, created_by, event_type, note, status_from, status_to",
    )
    .eq("support_case_id", caseId)
    .order("created_at", { ascending: true });

  if (eventsError) {
    return mapSupabaseError(eventsError, "support_case_events_fetch_failed");
  }

  let run: {
    id: string;
    created_at: string | null;
    deal_id: string | null;
    policy_version_id: string | null;
    policy_hash: string | null;
  } | null = null;

  if (caseRow.run_id) {
    const { data: runRow, error: runError } = await supabase
      .from("runs")
      .select("id, created_at, deal_id, policy_version_id, policy_hash")
      .eq("id", caseRow.run_id)
      .maybeSingle();
    if (runError) {
      return mapSupabaseError(runError, "support_case_run_fetch_failed");
    }
    run = runRow ?? null;
  }

  return NextResponse.json({ ok: true, case: caseRow, events, run });
}
