import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return jsonResponse(
    {
      ok: false,
      error: code,
      message,
      ...(extra ?? {}),
    },
    status,
  );
}

function createSupabaseClient(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY not set; cannot create client.");
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

/**
 * Extract user id (sub) from a Bearer <JWT> header.
 * We assume the function is behind verify_jwt=true, so the JWT is valid;
 * we just need the payload.sub for created_by.
 */
function getUserIdFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  const segments = token.split(".");
  if (segments.length < 2) return null;

  const payloadB64 = segments[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  // Pad base64 string
  const padded = payloadB64.padEnd(
    payloadB64.length + ((4 - (payloadB64.length % 4)) % 4),
    "=",
  );

  try {
    const json = atob(padded);
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Contracts (Deno copy, aligned with packages/contracts/src/runs.ts + runsSave.ts)
// ---------------------------------------------------------------------------

const RunTraceFrameSchema = z.object({
  key: z.string(),
  label: z.string(),
  details: z.unknown().optional(),
});

type RunTraceFrame = z.infer<typeof RunTraceFrameSchema>;

const RunInputEnvelopeSchema = z.object({
  dealId: z.string().uuid(),
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
  repairProfile: z.unknown().optional(),
  meta: z
    .object({
      engineVersion: z.string().optional(),
      policyVersion: z.string().optional(),
      source: z.string().optional(),
    })
    .default({}),
});

type RunInputEnvelope = z.infer<typeof RunInputEnvelopeSchema>;

const RunOutputEnvelopeSchema = z.object({
  trace: z.array(RunTraceFrameSchema),
  meta: z
    .object({
      engineVersion: z.string().optional(),
      policyVersion: z.string().optional(),
      durationMs: z.number().optional(),
    })
    .default({}),
  outputs: z.unknown().optional(),
});

type RunOutputEnvelope = z.infer<typeof RunOutputEnvelopeSchema>;

type PolicySnapshot = unknown;

const SaveRunArgsSchema = z.object({
  orgId: z.string().uuid(),
  dealId: z.string().uuid(),
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
  repairProfile: z.unknown().optional(),
  outputs: z.unknown(),
  trace: z.array(RunTraceFrameSchema),
  meta: z
    .object({
      engineVersion: z.string().optional(),
      policyVersion: z.string().optional(),
      source: z.string().optional(),
      durationMs: z.number().optional(),
    })
    .default({}),
  policyVersionId: z.string().uuid().nullable().optional(),
  // Flexible snapshot; upstream policy logic is responsible for shape.
  policySnapshot: z.unknown().optional(),
});

type SaveRunArgs = z.infer<typeof SaveRunArgsSchema>;

type RunRowInsert = {
  org_id: string;
  posture: string;
  deal_id: string;
  policy_version_id: string | null;
  input: RunInputEnvelope;
  output: RunOutputEnvelope;
  trace: RunTraceFrame[];
  policy_snapshot: PolicySnapshot | null;
  input_hash: string;
  output_hash: string;
  policy_hash: string | null;
  created_by: string;
};

// ---------------------------------------------------------------------------
// canonicalJson + hashJson (djb2) – copied from packages/contracts/src/runs.ts
// ---------------------------------------------------------------------------

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return (value as unknown[]).map((v) => sortKeys(v));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

function hashJson(value: unknown): string {
  const str = canonicalJson(value);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // unsigned 32-bit → hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Envelope + row builders (mirrors packages/contracts/src/runsSave.ts)
// ---------------------------------------------------------------------------

function buildRunEnvelopes(args: SaveRunArgs): {
  inputEnvelope: RunInputEnvelope;
  outputEnvelope: RunOutputEnvelope;
  policySnapshot: PolicySnapshot | null;
} {
  const parsed = SaveRunArgsSchema.parse(args);

  const inputEnvelope = RunInputEnvelopeSchema.parse({
    dealId: parsed.dealId,
    posture: parsed.posture,
    deal: parsed.deal,
    sandbox: parsed.sandbox,
    repairProfile: parsed.repairProfile,
    meta: {
      engineVersion: parsed.meta.engineVersion,
      policyVersion: parsed.meta.policyVersion,
      source: parsed.meta.source ?? "unknown",
    },
  });

  const outputEnvelope = RunOutputEnvelopeSchema.parse({
    trace: parsed.trace,
    outputs: parsed.outputs,
    meta: {
      engineVersion: parsed.meta.engineVersion,
      policyVersion: parsed.meta.policyVersion,
      durationMs: parsed.meta.durationMs,
    },
  });

  const policySnapshot = (parsed.policySnapshot ?? null) as PolicySnapshot | null;

  return { inputEnvelope, outputEnvelope, policySnapshot };
}

function buildRunRow(args: SaveRunArgs, createdBy: string): RunRowInsert {
  const { inputEnvelope, outputEnvelope, policySnapshot } = buildRunEnvelopes(
    args,
  );

  const input_hash = hashJson(inputEnvelope);
  const output_hash = hashJson(outputEnvelope);
  const policy_hash = policySnapshot ? hashJson(policySnapshot) : null;

  return {
    org_id: args.orgId,
    posture: args.posture,
    deal_id: args.dealId,
    policy_version_id: args.policyVersionId ?? null,
    input: inputEnvelope,
    output: outputEnvelope,
    trace: outputEnvelope.trace,
    policy_snapshot: policySnapshot,
    input_hash,
    output_hash,
    policy_hash,
    created_by: createdBy,
  };
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let payloadSummary: Record<string, unknown> | null = null;

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[v1-runs-save] Missing Supabase env", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
      });
      return errorResponse(
        500,
        "RUNS_SAVE_CONFIG",
        "Supabase environment variables are not configured for this function.",
      );
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return errorResponse(400, "RUNS_SAVE_BAD_JSON", "Invalid JSON body; expected SaveRunArgs");
    }

    const parsed = SaveRunArgsSchema.safeParse(json);
    if (!parsed.success) {
      return errorResponse(400, "RUNS_SAVE_VALIDATION", "Invalid payload", {
        issues: parsed.error.issues,
      });
    }

    const args = parsed.data;
    const policySnapshot = args.policySnapshot ?? null;
    const policyVersionId =
      typeof args.policyVersionId === "string" ? args.policyVersionId : null;

    if (!policySnapshot || !policyVersionId) {
      return errorResponse(
        400,
        "missing_policy_snapshot_linkage",
        "Run save requires policySnapshot and policyVersionId.",
      );
    }
    payloadSummary = {
      orgId: args.orgId,
      dealId: args.dealId,
      posture: args.posture,
      hasOutputs: typeof args.outputs !== "undefined",
      traceCount: Array.isArray(args.trace) ? args.trace.length : 0,
      hasPolicySnapshot: true,
      policyVersionId,
    };

    const authHeader = req.headers.get("Authorization");
    const userId = getUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return errorResponse(
        401,
        "RUNS_SAVE_AUTH",
        "Missing or invalid Authorization header; call with a Supabase user JWT.",
      );
    }

    const row = buildRunRow(args, userId);
    const supabase = createSupabaseClient(req);

    // Primary insert attempt
    const insert = await supabase
      .from("runs")
      .insert(row)
      .select(
        "id, org_id, posture, deal_id, input_hash, output_hash, policy_hash, created_at, created_by",
      )
      .single();

    if (insert.error) {
      const err = insert.error as any;

      // Unique index hit: treat as dedupe and return existing canonical row
      if (err.code === "23505") {
        let existingQuery = supabase
          .from("runs")
          .select(
            "id, org_id, posture, deal_id, input_hash, output_hash, policy_hash, created_at, created_by",
          )
          .eq("org_id", args.orgId)
          .eq("posture", args.posture)
          .eq("input_hash", row.input_hash);

        if (row.policy_hash === null) {
          existingQuery = existingQuery.is("policy_hash", null);
        } else {
          existingQuery = existingQuery.eq("policy_hash", row.policy_hash);
        }

        const existing = await existingQuery.maybeSingle();

        if (existing.error) {
          console.error("[v1-runs-save] dedupe lookup failed", {
            message: existing.error.message,
            code: existing.error.code,
            details: existing.error.details,
          });
          return errorResponse(
            500,
            "RUNS_SAVE_DEDUPE_LOOKUP",
            "Run already exists but could not be loaded.",
          );
        }

        return jsonResponse({
          ok: true,
          deduped: true,
          run: existing.data,
        });
      }

      // Any other DB error is a hard failure
      console.error("[v1-runs-save] insert error", {
        message: insert.error.message,
        code: insert.error.code,
        details: insert.error.details,
        payloadSummary,
      });
      return errorResponse(
        500,
        "RUNS_SAVE_INSERT_ERROR",
        "Failed to persist run.",
      );
    }

    // Fresh insert success
    return jsonResponse({
      ok: true,
      run: insert.data,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Unknown error";

    console.error("[v1-runs-save error]", {
      message,
      stack: err instanceof Error ? err.stack : undefined,
      payloadSummary,
    });

    return errorResponse(
      500,
      "RUNS_SAVE_ERROR",
      "Unexpected error while saving run.",
    );
  }
});
