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

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[v1-runs-save] Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. " +
      "Run persistence will fail until these are set.",
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function createSupabaseClient(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[v1-runs-save] SUPABASE_URL or SUPABASE_ANON_KEY not set; cannot create client.",
    );
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
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
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
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
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
  // Flexible snapshot; upstream policy logic is responsible for shape.
  policySnapshot: z.unknown().optional(),
});

type SaveRunArgs = z.infer<typeof SaveRunArgsSchema>;

type RunRowInsert = {
  org_id: string;
  posture: string;
  input: RunInputEnvelope;
  output: RunOutputEnvelope;
  trace: RunTraceFrame[];
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
    posture: parsed.posture,
    deal: parsed.deal,
    sandbox: parsed.sandbox,
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
    input: inputEnvelope,
    output: outputEnvelope,
    trace: outputEnvelope.trace,
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonResponse(
      { ok: false, error: "Invalid JSON body; expected SaveRunArgs" },
      400,
    );
  }

  const parsed = SaveRunArgsSchema.safeParse(json);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid payload",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const args = parsed.data;

  const authHeader = req.headers.get("Authorization");
  const userId = getUserIdFromAuthHeader(authHeader);

  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: {
          message:
            "[v1-runs-save] Could not determine user id from Authorization header; " +
            "ensure you're calling with a valid Supabase user JWT.",
        },
      },
      401,
    );
  }

  try {
    const row = buildRunRow(args, userId);
    const supabase = createSupabaseClient(req);

    // Primary insert attempt
    const insert = await supabase
      .from("runs")
      .insert(row)
      .select(
        "id, org_id, posture, input_hash, output_hash, policy_hash, created_at, created_by",
      )
      .single();

    if (insert.error) {
      const err = insert.error as any;

      // Unique index hit: treat as dedupe and return existing canonical row
      if (err.code === "23505") {
        const existing = await supabase
          .from("runs")
          .select(
            "id, org_id, posture, input_hash, output_hash, policy_hash, created_at, created_by",
          )
          .eq("org_id", args.orgId)
          .eq("posture", args.posture)
          .eq("input_hash", row.input_hash)
          .eq("policy_hash", row.policy_hash)
          .maybeSingle();

        if (existing.error) {
          return jsonResponse(
            {
              ok: false,
              error: {
                message: existing.error.message,
                details: existing.error.details,
                code: existing.error.code,
              },
            },
            500,
          );
        }

        return jsonResponse({
          ok: true,
          deduped: true,
          run: existing.data,
        });
      }

      // Any other DB error is a hard failure
      return jsonResponse(
        {
          ok: false,
          error: {
            message: insert.error.message,
            details: insert.error.details,
            code: insert.error.code,
          },
        },
        500,
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

    return jsonResponse(
      {
        ok: false,
        error: { message },
      },
      500,
    );
  }
});
