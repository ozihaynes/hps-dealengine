// supabase/functions/v1-ai-bridge/index.ts
// Hardened AI bridge: JWT verification, contract validation, guardrails to avoid numeric invention.
// Uses caller JWT (no service_role) and always returns structured JSON (never throws to the runtime).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { AiBridgeInputSchema } from "../_shared/contracts.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const MODEL = "gpt-4o-mini";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

type RunRow = {
  id: string;
  org_id: string;
  posture: string;
  deal_id?: string | null;
  input: unknown;
  output: unknown;
  trace: unknown;
  policy_snapshot: unknown;
};

type EvidenceRow = {
  id: string;
  kind?: string | null;
  storage_key?: string | null;
  mime_type?: string | null;
  bytes?: number | null;
  created_at?: string;
};

type ErrorBody = {
  ok: false;
  errorCode: string;
  message: string;
  issues?: Array<{ path: string; message: string }>;
};

const GUARDRAILS = [
  "Do not invent numeric values. Reference only numbers present in provided run outputs, trace, or policy.",
  "Do not override or propose final offer numbers; provide advisory guidance only.",
  "Call out missing evidence or weak assumptions; suggest evidence to collect.",
  "Keep responses concise and actionable for underwriters.",
];

const ERROR_CODES = {
  BAD_REQUEST: "v1-ai-bridge-BAD_REQUEST",
  METHOD_NOT_ALLOWED: "v1-ai-bridge-METHOD-405",
  AUTH: "v1-ai-bridge-AUTH-401",
  ENV_MISSING: "v1-ai-bridge-ENV-001",
  SUPABASE_ENV: "v1-ai-bridge-ENV-002",
  RUN_NOT_FOUND: "v1-ai-bridge-RUN-NOT-FOUND-404",
  RUN_FORBIDDEN: "v1-ai-bridge-RUN-FORBIDDEN-403",
  RUN_LOAD_FAILED: "v1-ai-bridge-RUN-LOAD-500",
  EVIDENCE_FORBIDDEN: "v1-ai-bridge-EVIDENCE-403",
  UPSTREAM: "v1-ai-bridge-UPSTREAM-001",
  UNEXPECTED: "v1-ai-bridge-UNEXPECTED-001",
} as const;

class BridgeError extends Error {
  status: number;
  code: string;
  extra?: Partial<ErrorBody>;

  constructor(status: number, code: string, message: string, extra?: Partial<ErrorBody>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

function errorResponse(req: Request, status: number, code: string, message: string, extra?: Partial<ErrorBody>) {
  return jsonResponse(req, { ok: false, errorCode: code, message, ...(extra ?? {}) }, status);
}

function mapZodIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

function selectProvider() {
  const openaiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
  const geminiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  const provider = openaiKey ? "openai" : geminiKey ? "gemini" : null;

  if (!provider) {
    console.error("[v1-ai-bridge] No AI provider key configured", {
      hasOpenAI: !!openaiKey,
      hasGemini: !!geminiKey,
    });
    throw new BridgeError(
      500,
      ERROR_CODES.ENV_MISSING,
      "AI bridge is not configured for this environment.",
    );
  }

  if (provider === "gemini") {
    console.error("[v1-ai-bridge] Gemini key present but provider not wired for this function");
    throw new BridgeError(
      500,
      ERROR_CODES.ENV_MISSING,
      "AI bridge is not configured for this environment.",
    );
  }

  return { provider, apiKey: openaiKey };
}

async function requireUserId(supabase: any) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new BridgeError(401, ERROR_CODES.AUTH, "Unauthorized");
  }
  return data.user.id as string;
}

async function loadRun(
  supabase: any,
  runId: string,
  expectedDealId: string,
): Promise<RunRow> {
  console.log("[v1-ai-bridge] loadRun start", {
    runId,
    expectedDealId,
  });

  const { data, error } = await supabase
    .from("runs")
    .select("id, org_id, posture, input, output, trace, policy_snapshot")
    .eq("id", runId)
    .maybeSingle();

  console.error("[v1-ai-bridge] run load result", {
    runId,
    dealId: expectedDealId,
    data,
    error,
    errorCode: (error as any)?.code,
    errorMessage: (error as any)?.message,
    status: (error as any)?.status,
  });

  if (error) {
    console.error("[v1-ai-bridge] run lookup failed", {
      runId,
      expectedDealId,
      code: (error as any)?.code,
      status: (error as any)?.status,
      message: error.message,
      details: (error as any)?.details,
    });
    const message = (error.message ?? "").toLowerCase();
    const code = (error as any)?.code ?? "";
    const status = (error as any)?.status ?? 0;
    const isRlsDenied =
      code === "PGRST116" ||
      code === "PGRST301" ||
      code === "PGRST302" ||
      code === "PGRST305" ||
      code === "PGRST306" ||
      code === "42501" ||
      (error as any)?.status === 401 ||
      (error as any)?.status === 403 ||
      message.includes("permission") ||
      message.includes("rls") ||
      message.includes("not authorized") ||
      message.includes("not authorised");
    if (isRlsDenied) {
      throw new BridgeError(
        403,
        ERROR_CODES.RUN_FORBIDDEN,
        "You do not have access to this run.",
      );
    }
    throw new BridgeError(
      500,
      ERROR_CODES.RUN_LOAD_FAILED,
      "Unexpected error while loading run for this user.",
    );
  }

  if (!data) {
    console.warn("[v1-ai-bridge] run not found", { runId, expectedDealId });
    throw new BridgeError(
      404,
      ERROR_CODES.RUN_NOT_FOUND,
      "No run was found for this user. Run an analysis and save it first.",
    );
  }

  const inferredDealId =
    (data as any)?.input && typeof (data as any).input === "object"
      ? (data as any).input?.dealId ?? null
      : null;

  if (inferredDealId && inferredDealId !== expectedDealId) {
    console.warn("[v1-ai-bridge] run dealId mismatch", {
      runId,
      expectedDealId,
      inferredDealId,
    });
    throw new BridgeError(
      403,
      ERROR_CODES.RUN_NOT_FOUND,
      "Run not found or not accessible for this user.",
    );
  }

  console.log("[v1-ai-bridge] loadRun success", {
    runId,
    dealId: inferredDealId ?? null,
    orgId: (data as any)?.org_id,
    posture: (data as any)?.posture,
  });

  return data as RunRow;
}

async function loadEvidence(
  supabase: any,
  dealId: string,
  runId: string,
): Promise<EvidenceRow[]> {
  console.log("[v1-ai-bridge] loadEvidence start", { dealId, runId });
  const { data, error } = await supabase
    .from("evidence")
    .select("id, kind, storage_key, mime_type, bytes, created_at")
    .eq("deal_id", dealId)
    .or(`run_id.eq.${runId},run_id.is.null`)
    .limit(20);

  if (error) {
    console.error("[v1-ai-bridge] evidence lookup failed", {
      dealId,
      runId,
      code: (error as any)?.code,
      status: (error as any)?.status,
      message: error.message,
      details: (error as any)?.details,
    });
    const message = (error.message ?? "").toLowerCase();
    const code = (error as any)?.code ?? "";
    const status = (error as any)?.status ?? 0;
    const isRlsDenied =
      code === "PGRST116" ||
      code === "PGRST301" ||
      code === "PGRST302" ||
      code === "PGRST305" ||
      code === "PGRST306" ||
      code === "42501" ||
      (error as any)?.status === 401 ||
      (error as any)?.status === 403 ||
      message.includes("permission") ||
      message.includes("rls") ||
      message.includes("not authorized") ||
      message.includes("not authorised");
    if (isRlsDenied) {
      throw new BridgeError(
        403,
        ERROR_CODES.EVIDENCE_FORBIDDEN,
        "You do not have access to evidence for this run.",
      );
    }
    if (status && status >= 500) {
      throw new BridgeError(
        500,
        ERROR_CODES.RUN_LOAD_FAILED,
        "Unexpected error while loading evidence for this run.",
      );
    }
    throw new BridgeError(
      403,
      ERROR_CODES.EVIDENCE_FORBIDDEN,
      "You do not have access to evidence for this run.",
    );
  }

  console.log("[v1-ai-bridge] loadEvidence success", {
    dealId,
    runId,
    count: (data ?? []).length,
  });

  return (data ?? []) as EvidenceRow[];
}

async function callOpenAI(prompt: string, apiKey: string) {
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an underwriting strategist. Provide advisory guidance only; never invent numbers; reference only supplied outputs/trace/policy/evidence.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new BridgeError(
      502,
      ERROR_CODES.UPSTREAM,
      "Upstream AI provider error. Please try again later.",
      { issues: [{ path: "provider", message: `OpenAI ${res.status}` }] },
    );
  }

  const json = await res.json();
  const content =
    json?.choices?.[0]?.message?.content?.trim() ??
    "Unable to produce analysis.";
  return content as string;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      throw new BridgeError(405, ERROR_CODES.METHOD_NOT_ALLOWED, "Method not allowed");
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[v1-ai-bridge] missing Supabase env vars", {
        hasUrl: !!SUPABASE_URL,
        hasAnon: !!SUPABASE_ANON_KEY,
      });
      throw new BridgeError(
        500,
        ERROR_CODES.SUPABASE_ENV,
        "Supabase environment not configured.",
      );
    }

    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch (err) {
      console.error("[v1-ai-bridge] failed to parse body", err);
      throw new BridgeError(
        400,
        ERROR_CODES.BAD_REQUEST,
        "Invalid request payload",
      );
    }

    const parsed = AiBridgeInputSchema.safeParse(bodyJson);
    if (!parsed.success) {
      const issues = mapZodIssues(parsed.error);
      console.error("[v1-ai-bridge] invalid request", issues);
      throw new BridgeError(
        400,
        ERROR_CODES.BAD_REQUEST,
        "Invalid request payload",
        { issues },
      );
    }

    const input = parsed.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const userId = await requireUserId(supabase);
    const { provider, apiKey } = selectProvider();
    console.log("[v1-ai-bridge] request", {
      userId,
      dealId: input.dealId,
      runId: input.runId,
      posture: input.posture,
      provider,
    });

    const run = await loadRun(supabase, input.runId, input.dealId);
    const evidence = await loadEvidence(supabase, input.dealId, input.runId);

    const promptParts = [
      "You are an underwriting strategist. Provide advisory guidance only.",
      "Guardrails:",
      ...GUARDRAILS,
      `Posture: ${run.posture}`,
      `User prompt: ${input.prompt}`,
      `Run output: ${JSON.stringify(run.output)}`,
      `Run trace: ${JSON.stringify(run.trace)}`,
      `Policy snapshot: ${JSON.stringify(run.policy_snapshot)}`,
      `Evidence (ids/kinds/filesize): ${JSON.stringify(
        evidence.map((e) => ({
          id: e.id,
          kind: e.kind,
          storageKey: e.storage_key,
          bytes: e.bytes,
        })),
      )}`,
    ].join("\n\n");

    let summary: string;
    try {
      summary = await callOpenAI(promptParts, apiKey);
    } catch (err) {
      if (err instanceof BridgeError) {
        throw err;
      }
      console.error("[v1-ai-bridge] OpenAI error", err);
      throw new BridgeError(
        502,
        ERROR_CODES.UPSTREAM,
        "Upstream AI provider error. Please try again later.",
      );
    }

    return jsonResponse(req, {
      ok: true,
      analysis: {
        summary,
        strengths: [],
        risks: [],
        questions: [],
        nextActions: [],
      },
      guardrails: GUARDRAILS,
      provider,
      model: MODEL,
    });
  } catch (err) {
    if (err instanceof BridgeError) {
      console.error("[v1-ai-bridge] BridgeError", {
        status: err.status,
        code: err.code,
        message: err.message,
      });
      return errorResponse(req, err.status, err.code, err.message, err.extra);
    }

    console.error("[v1-ai-bridge] UNEXPECTED", err);
    return errorResponse(
      req,
      500,
      ERROR_CODES.UNEXPECTED,
      "Unexpected error in AI bridge.",
    );
  }
});
