import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[v1-deal-task-states] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.",
  );
}

function errorResponse(
  req: Request,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return jsonResponse(
    req,
    { ok: false, error: code, message, ...(extra ?? {}) },
    status,
  );
}

function createSupabaseClient(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY not set; cannot create client.");
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

function hasBearerAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.toLowerCase().startsWith("bearer ");
}

// ---------------------------------------------------------------------------
// Contracts (Slice 1): NYA only + list/clear
// NOTE: NOT_APPLICABLE (NA) is intentionally rejected in Slice 1 (fail-closed).
// ---------------------------------------------------------------------------

const ListSchema = z.object({
  op: z.literal("list"),
  deal_id: z.string().uuid(),
});

const UpsertSchema = z.object({
  op: z.literal("upsert"),
  deal_id: z.string().uuid(),
  task_key: z.string().min(1),
  override_status: z.enum(["NOT_YET_AVAILABLE", "NOT_APPLICABLE"]),
  note: z.string().max(1000).optional(),
  expected_by: z.string().datetime().optional(),
});

const ClearSchema = z.object({
  op: z.literal("clear"),
  deal_id: z.string().uuid(),
  task_key: z.string().min(1),
});

const RequestSchema = z.discriminatedUnion("op", [
  ListSchema,
  UpsertSchema,
  ClearSchema,
]);

type DealRow = { id: string; org_id: string };

async function loadDealOrDeny(
  req: Request,
  supabase: ReturnType<typeof createSupabaseClient>,
  dealId: string,
) {
  const deal = await supabase
    .from("deals")
    .select("id, org_id")
    .eq("id", dealId)
    .maybeSingle();

  if (deal.error) {
    console.error("[v1-deal-task-states] deal lookup error", {
      message: deal.error.message,
      code: deal.error.code,
      details: deal.error.details,
    });
    return {
      ok: false as const,
      res: errorResponse(
        req,
        500,
        "DEAL_TASK_STATES_DEAL_LOOKUP",
        "Failed to load deal.",
      ),
    };
  }

  if (!deal.data) {
    return {
      ok: false as const,
      res: errorResponse(
        req,
        404,
        "DEAL_TASK_STATES_NOT_FOUND",
        "Deal not found or access denied.",
      ),
    };
  }

  return { ok: true as const, deal: deal.data as DealRow };
}

serve(async (req: Request): Promise<Response> => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return errorResponse(req, 405, "DEAL_TASK_STATES_METHOD", "Method not allowed (use POST).");
  }

  if (!hasBearerAuth(req)) {
    return errorResponse(
      req,
      401,
      "DEAL_TASK_STATES_AUTH",
      "Missing or invalid Authorization header; call with a Supabase user JWT.",
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse(req, 400, "DEAL_TASK_STATES_BAD_JSON", "Invalid JSON body.");
  }

  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(req, 400, "DEAL_TASK_STATES_VALIDATION", "Invalid payload.", {
      issues: parsed.error.issues,
    });
  }

  const supabase = createSupabaseClient(req);

  if (parsed.data.op === "list") {
    const dealRes = await loadDealOrDeny(req, supabase, parsed.data.deal_id);
    if (!dealRes.ok) return dealRes.res;

    const rows = await supabase
      .from("deal_task_states")
      .select("deal_id, task_key, override_status, note, expected_by, created_at, updated_at")
      .eq("deal_id", parsed.data.deal_id)
      .order("task_key", { ascending: true });

    if (rows.error) {
      console.error("[v1-deal-task-states] list error", rows.error);
      return errorResponse(req, 500, "DEAL_TASK_STATES_LIST", "Failed to load task states.");
    }

    return jsonResponse(req, { ok: true, task_states: rows.data ?? [] });
  }

  if (parsed.data.op === "clear") {
    const dealRes = await loadDealOrDeny(req, supabase, parsed.data.deal_id);
    if (!dealRes.ok) return dealRes.res;

    const del = await supabase
      .from("deal_task_states")
      .delete()
      .eq("deal_id", parsed.data.deal_id)
      .eq("task_key", parsed.data.task_key);

    if (del.error) {
      console.error("[v1-deal-task-states] clear error", del.error);
      return errorResponse(req, 500, "DEAL_TASK_STATES_CLEAR", "Failed to clear task state.");
    }

    return jsonResponse(req, { ok: true });
  }

  // upsert
  const dealRes = await loadDealOrDeny(req, supabase, parsed.data.deal_id);
  if (!dealRes.ok) return dealRes.res;

  if (parsed.data.override_status === "NOT_APPLICABLE") {
    return errorResponse(
      req,
      409,
      "DEAL_TASK_STATES_NA_DISABLED",
      "NOT_APPLICABLE is not enabled in Slice 1. Use NOT_YET_AVAILABLE or clear. NA ships in Slice 2 with policy validation.",
    );
  }

  const upsertRow = {
    org_id: dealRes.deal.org_id,
    deal_id: parsed.data.deal_id,
    task_key: parsed.data.task_key,
    override_status: parsed.data.override_status,
    note: parsed.data.note ?? null,
    expected_by: parsed.data.expected_by ?? null,
  };

  const up = await supabase
    .from("deal_task_states")
    .upsert(upsertRow, { onConflict: "org_id,deal_id,task_key" })
    .select("deal_id, task_key, override_status, note, expected_by, created_at, updated_at")
    .single();

  if (up.error) {
    console.error("[v1-deal-task-states] upsert error", {
      message: up.error.message,
      code: up.error.code,
      details: up.error.details,
    });
    return errorResponse(req, 500, "DEAL_TASK_STATES_UPSERT", "Failed to persist task state.");
  }

  return jsonResponse(req, { ok: true, task_state: up.data });
});
