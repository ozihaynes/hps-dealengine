import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseWithJwt,
  jsonError,
  mapSupabaseError,
  parseAuthHeader,
} from "../../../_shared";

export const runtime = "nodejs";

function normalizeCaseId(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const StatusSchema = z.enum([
  "open",
  "in_progress",
  "blocked",
  "resolved",
  "closed",
]);

const EventSchema = z
  .object({
    type: z.enum(["note", "status_changed"]),
    note: z.string().trim().min(1),
    statusTo: StatusSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "status_changed" && !val.statusTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "statusTo is required for status changes.",
        path: ["statusTo"],
      });
    }
  });

export async function POST(
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

  const body = await req.json().catch(() => null);
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("bad_request", 400, parsed.error.flatten());
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
    .select("id, org_id, status, closed_at")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) {
    return mapSupabaseError(caseError, "support_case_fetch_failed");
  }
  if (!caseRow) {
    return jsonError("not_found", 404);
  }

  const { type, note, statusTo } = parsed.data;

  if (type === "note") {
    const { error: insertError } = await supabase
      .from("support_case_events")
      .insert({
        org_id: caseRow.org_id,
        support_case_id: caseId,
        event_type: "note",
        note,
      });
    if (insertError) {
      return mapSupabaseError(insertError, "support_case_event_failed");
    }
    return NextResponse.json({ ok: true });
  }

  const statusFrom = caseRow.status as string;
  if (!statusTo) {
    return jsonError("status_missing", 400);
  }
  if (statusFrom === statusTo) {
    return jsonError("status_unchanged", 400);
  }

  const nextClosedAt =
    statusTo === "resolved" || statusTo === "closed"
      ? new Date().toISOString()
      : null;

  const { error: updateError } = await supabase
    .from("support_cases")
    .update({ status: statusTo, closed_at: nextClosedAt })
    .eq("id", caseId);

  if (updateError) {
    return mapSupabaseError(updateError, "support_case_update_failed");
  }

  const { error: eventError } = await supabase.from("support_case_events").insert({
    org_id: caseRow.org_id,
    support_case_id: caseId,
    event_type: "status_changed",
    note,
    status_from: statusFrom,
    status_to: statusTo,
  });

  if (eventError) {
    await supabase
      .from("support_cases")
      .update({ status: statusFrom, closed_at: caseRow.closed_at })
      .eq("id", caseId);
    return mapSupabaseError(eventError, "support_case_event_failed");
  }

  return NextResponse.json({ ok: true });
}
