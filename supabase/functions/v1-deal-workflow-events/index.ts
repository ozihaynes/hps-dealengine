import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function errorResponse(req: Request, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return jsonResponse(req, { ok: false, error: code, message, ...(extra ?? {}) }, status);
}

function hasBearerAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.toLowerCase().startsWith("bearer ");
}

function createSupabaseClient(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_URL/SUPABASE_ANON_KEY");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Caller JWT only; RLS enforced.
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

const CreateUnderwritingCompleteSchema = z.object({
  op: z.literal("create_underwriting_complete"),
  deal_id: z.string().uuid(),
  posture: z.string().min(1).optional(),
});

const RequestSchema = z.discriminatedUnion("op", [CreateUnderwritingCompleteSchema]);

type DealRow = { id: string; org_id: string };

// Canonical hashing: sha256 hex of a stable template string (NOT JSON).
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: any = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

// Fail-closed: only treat run as "ready" if we find an explicit READY/can_finalize signal.
function runIndicatesReady(run: Record<string, unknown>): boolean {
  if (run["can_finalize"] === true) return true;
  if (run["status"] === "READY") return true;

  const candidates: Array<[string, unknown]> = [
    ["output", run["output"]],
    ["outputs", run["outputs"]],
    ["result", run["result"]],
    ["workflow_state", run["workflow_state"]],
  ];

  for (const [, root] of candidates) {
    if (!root || typeof root !== "object") continue;
    const ready1 = getPath(root, "offer_checklist.status");
    const ready2 = getPath(root, "offerChecklist.status");
    const ready3 = getPath(root, "workflow_state.status");
    const ready4 = getPath(root, "workflowState.status");
    const ready5 = getPath(root, "workflow_state.can_finalize");
    const ready6 = getPath(root, "workflowState.can_finalize");

    if (ready1 === "READY" || ready2 === "READY" || ready3 === "READY" || ready4 === "READY") return true;
    if (ready5 === true || ready6 === true) return true;
  }

  return false;
}

async function loadDealOrDeny(req: Request, supabase: ReturnType<typeof createSupabaseClient>, dealId: string) {
  const deal = await supabase.from("deals").select("id, org_id").eq("id", dealId).maybeSingle();
  if (deal.error) {
    return { ok: false as const, res: errorResponse(req, 500, "WORKFLOW_EVENTS_DEAL_LOOKUP", "Failed to load deal.") };
  }
  if (!deal.data) {
    return { ok: false as const, res: errorResponse(req, 404, "WORKFLOW_EVENTS_NOT_FOUND", "Deal not found or access denied.") };
  }
  return { ok: true as const, deal: deal.data as DealRow };
}

serve(async (req: Request): Promise<Response> => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return errorResponse(req, 405, "WORKFLOW_EVENTS_METHOD", "Method not allowed (use POST).");
  }

  // verify_jwt=true is enforced by Supabase; this check improves the error message.
  if (!hasBearerAuth(req)) {
    return errorResponse(req, 401, "WORKFLOW_EVENTS_AUTH", "Missing or invalid Authorization header; call with a Supabase user JWT.");
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse(req, 400, "WORKFLOW_EVENTS_BAD_JSON", "Invalid JSON body.");
  }

  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(req, 400, "WORKFLOW_EVENTS_VALIDATION", "Invalid payload.", { issues: parsed.error.issues });
  }

  const supabase = createSupabaseClient(req);

  if (parsed.data.op === "create_underwriting_complete") {
    const dealRes = await loadDealOrDeny(req, supabase, parsed.data.deal_id);
    if (!dealRes.ok) return dealRes.res;

    // Load latest run (policy_hash must exist). We select * to avoid guessing column names.
    let runQ = supabase
      .from("runs")
      .select("*")
      .eq("org_id", dealRes.deal.org_id)
      .eq("deal_id", parsed.data.deal_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (parsed.data.posture) {
      runQ = runQ.eq("posture", parsed.data.posture);
    }

    const runRes = await runQ.maybeSingle();
    if (runRes.error) {
      return errorResponse(req, 500, "WORKFLOW_EVENTS_RUN_LOOKUP", "Failed to load latest run.");
    }
    if (!runRes.data) {
      return errorResponse(req, 409, "WORKFLOW_EVENTS_NO_RUN", "No saved run found for this deal; run Analyze and Save Run first.");
    }

    const run = runRes.data as Record<string, unknown>;
    const runId = String(run["id"] ?? "");
    const policyHash = typeof run["policy_hash"] === "string" ? run["policy_hash"] : "";

    if (!runId) {
      return errorResponse(req, 500, "WORKFLOW_EVENTS_RUN_BAD", "Latest run row missing id.");
    }
    if (!policyHash) {
      return errorResponse(req, 409, "WORKFLOW_EVENTS_NO_POLICY_HASH", "Latest run has no policy_hash; cannot record Underwriting Complete defensibly.");
    }

    // Validate can_finalize/ready from latest inputs (fail-closed if no explicit ready signal).
    if (!runIndicatesReady(run)) {
      return errorResponse(req, 409, "WORKFLOW_EVENTS_NOT_READY", "Underwriting is not READY based on the latest saved run; completion is blocked.", {
        run_id: runId,
        policy_hash: policyHash,
      });
    }

    const createdAt = new Date().toISOString();
    const canonical = `${dealRes.deal.org_id}:${parsed.data.deal_id}:${runId}:${policyHash}:${createdAt}`;
    const eventHash = await sha256Hex(canonical);

    const id = crypto.randomUUID();

    const insertRow = {
      id,
      org_id: dealRes.deal.org_id,
      deal_id: parsed.data.deal_id,
      event_type: "UNDERWRITING_COMPLETE",
      run_id: runId,
      policy_hash: policyHash,
      event_hash: eventHash,
      metadata: {
        canonical_template: "org_id:deal_id:run_id:policy_hash:timestamp",
        canonical_value: canonical,
        posture: parsed.data.posture ?? null,
      },
      created_at: createdAt,
    };

    const ins = await supabase
      .from("deal_workflow_events")
      .insert(insertRow)
      .select("id, deal_id, org_id, event_type, run_id, policy_hash, event_hash, metadata, created_at")
      .single();

    if (ins.error) {
      // Idempotency for same canonical hash
      if ((ins.error as any).code === "23505") {
        const existing = await supabase
          .from("deal_workflow_events")
          .select("id, deal_id, org_id, event_type, run_id, policy_hash, event_hash, metadata, created_at")
          .eq("event_hash", eventHash)
          .maybeSingle();

        if (existing.data) return jsonResponse(req, { ok: true, event: existing.data, deduped: true });
      }

      return errorResponse(req, 500, "WORKFLOW_EVENTS_INSERT", "Failed to write workflow event.", {
        details: ins.error.message,
      });
    }

    return jsonResponse(req, { ok: true, event: ins.data, deduped: false });
  }

  return errorResponse(req, 400, "WORKFLOW_EVENTS_OP", "Unknown op.");
});
