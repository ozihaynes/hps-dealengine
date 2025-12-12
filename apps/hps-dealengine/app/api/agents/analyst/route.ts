import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { DEAL_ANALYST_AGENT_NAME, runAnalystAgent } from "@hps/agents";

export const runtime = "nodejs";

const BodySchema = z.object({
  dealId: z.string().uuid(),
  question: z.string().optional().nullable(),
  threadId: z.string().uuid().optional().nullable(),
  runId: z.string().uuid().optional().nullable(),
  isStale: z.boolean().optional(),
});

type AgentErrorPayload = {
  type: "agent_error" | "openai_error" | "config_error";
  message: string;
  code: string | number | null;
  status: number | null;
  details?: unknown;
};

function sanitizeMessage(message: string): string {
  if (!message) return "Analyst agent failed";
  const redacted = message.replace(/sk-[A-Za-z0-9-_]{10,}/gi, "sk-***redacted***");
  return redacted;
}

function sanitizeDetails(details: unknown): unknown {
  if (typeof details === "string") return sanitizeMessage(details);
  if (Array.isArray(details)) return details.map((item) => sanitizeDetails(item));
  if (details && typeof details === "object") {
    return Object.fromEntries(
      Object.entries(details).map(([key, value]) => [key, sanitizeDetails(value)]),
    );
  }
  return details;
}

function parseAuthHeader(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function parseSubFromJwt(token: string): string | null {
  try {
    const [, payloadB64] = token.split(".");
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/").padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function createSupabaseWithJwt(accessToken: string) {
  const pickEnv = (keys: string[]) => {
    for (const key of keys) {
      const val = process.env[key]?.trim();
      if (val) return val;
    }
    return null;
  };

  const supabaseUrl = pickEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const supabaseAnonKey = pickEnv(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

  if (!supabaseUrl || !supabaseAnonKey) {
    const err = new Error("Missing Supabase environment variables.");
    (err as any).code = "SUPABASE_CONFIG_MISSING";
    throw err;
  }
  if (!supabaseAnonKey.includes(".")) {
    const err = new Error("Supabase anon key appears malformed.");
    (err as any).code = "SUPABASE_ANON_KEY_MALFORMED";
    throw err;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

type SupabaseClient = ReturnType<typeof createSupabaseWithJwt>;

async function resolveOrgId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.org_id) {
    throw new Error("No org membership found for user");
  }
  return data.org_id as string;
}

async function ensureThread(
  supabase: SupabaseClient,
  params: { threadId: string; orgId: string; userId: string; dealId: string; runId: string | null },
) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("ai_chat_threads").upsert(
    {
      id: params.threadId,
      persona: "analyst",
      org_id: params.orgId,
      user_id: params.userId,
      deal_id: params.dealId,
      run_id: params.runId,
      last_message_at: now,
      expires_at: expiresAt,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function insertMessages(
  supabase: SupabaseClient,
  threadId: string,
  userMessage: string,
  assistantMessage: string,
) {
  const now = new Date().toISOString();
  const rows = [
    { id: crypto.randomUUID(), thread_id: threadId, role: "user", content: userMessage, created_at: now },
    { id: crypto.randomUUID(), thread_id: threadId, role: "assistant", content: assistantMessage, created_at: new Date().toISOString() },
  ];
  const { error } = await supabase.from("ai_chat_messages").insert(rows);
  if (error) throw error;
}

function normalizeAgentError(err: unknown): AgentErrorPayload {
  const base: AgentErrorPayload = {
    type: "agent_error",
    message: sanitizeMessage(err instanceof Error ? err.message : String(err ?? "Analyst agent failed")),
    code: (err as any)?.code ?? null,
    status: typeof (err as any)?.status === "number" ? (err as any).status : null,
  };

  const candidates = [err as any, (err as any)?.cause, (err as any)?.response];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (base.status === null && typeof candidate.status === "number") {
      base.status = candidate.status;
    }
    if (base.code === null && typeof candidate.code !== "undefined") {
      base.code = candidate.code as string | number;
    }
    if (!base.details && candidate.response?.data) {
      base.details = sanitizeDetails(candidate.response.data);
    } else if (!base.details && candidate.data) {
      base.details = sanitizeDetails(candidate.data);
    } else if (!base.details && candidate.body) {
      base.details = sanitizeDetails(candidate.body);
    } else if (!base.details && candidate.error) {
      base.details = sanitizeDetails(candidate.error);
    }
  }

  const lowerMsg = base.message.toLowerCase();
  const looksLikeKeyIssue =
    lowerMsg.includes("api key") ||
    base.code === "OPENAI_API_KEY_MISSING" ||
    base.code === "OPENAI_API_KEY_MALFORMED" ||
    base.code === "invalid_api_key";

  if (looksLikeKeyIssue) {
    base.type = "config_error";
  } else if (lowerMsg.includes("openai") || (base.status !== null && base.status >= 400 && base.status < 500)) {
    base.type = "openai_error";
  }

  if (!base.details) {
    base.details = sanitizeDetails(err);
  }

  return base;
}

export async function POST(req: NextRequest) {
  const accessToken = parseAuthHeader(req);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "auth_missing" }, { status: 401 });
  }

  const userId = parseSubFromJwt(accessToken);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_missing" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { dealId, question, threadId: incomingThreadId, runId, isStale } = parsed.data;

  const supabase = createSupabaseWithJwt(accessToken);

  let orgId: string;
  try {
    orgId = await resolveOrgId(supabase);
  } catch (err: any) {
    console.error("[agents/analyst] org resolution failed", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "org_missing" }, { status: 403 });
  }

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, org_id")
    .eq("id", dealId)
    .maybeSingle();
  if (dealError) {
    return NextResponse.json({ ok: false, error: "deal_load_failed", message: dealError.message }, { status: 500 });
  }
  if (!deal) {
    return NextResponse.json({ ok: false, error: "deal_not_found" }, { status: 404 });
  }
  if (deal.org_id && deal.org_id !== orgId) {
    return NextResponse.json({ ok: false, error: "forbidden_deal_org_mismatch" }, { status: 403 });
  }

  const start = Date.now();
  let traceId: string | null = null;
  let agentResult: Awaited<ReturnType<typeof runAnalystAgent>>;
  try {
    agentResult = await runAnalystAgent({
      orgId,
      userId,
      dealId,
      runId,
      question,
      isStale,
      accessToken,
      traceIdCallback: (id: string) => {
        traceId = id;
      },
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const normalizedError = normalizeAgentError(err);
    console.error("[agents/analyst] runAnalystAgent failed", normalizedError);
    try {
      await supabase.from("agent_runs").insert({
        org_id: orgId,
        user_id: userId,
        persona: "analyst",
        agent_name: "HPS - Deal Analyst v2",
        workflow_version: "wf_6939e31f09bc8190b7c7c486389377e4066a586984412bb5",
        deal_id: dealId,
        run_id: runId ?? null,
        thread_id: incomingThreadId ?? null,
        trace_id: traceId,
        model: null,
        status: "error",
        input: { dealId, runId, question, isStale },
        error: normalizedError,
        latency_ms: latencyMs,
      });
    } catch (logErr) {
      console.error("[agents/analyst] agent_runs failure log failed", logErr);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "failed_to_run_analyst",
        details: normalizedError,
      },
      { status: 500 },
    );
  }
  const latencyMs = Date.now() - start;

  const threadId = incomingThreadId ?? crypto.randomUUID();
  try {
    await ensureThread(supabase, {
      threadId,
      orgId,
      userId,
      dealId,
      runId: agentResult.runContext?.runId ?? null,
    });
    const safeQuestion = question ?? "Analyze this deal";
    await insertMessages(supabase, threadId, safeQuestion, agentResult.aiResult.summary ?? "Analysis ready.");
  } catch (err: any) {
    // Do not fail the entire request if chat persistence fails; just log.
    console.error("[agents/analyst] chat persistence failed", err?.message ?? err);
  }

  try {
    await supabase.from("agent_runs").insert({
      org_id: orgId,
      user_id: userId,
      persona: "analyst",
      agent_name: "HPS - Deal Analyst v2",
      workflow_version: "wf_6939e31f09bc8190b7c7c486389377e4066a586984412bb5",
      deal_id: dealId,
      run_id: agentResult.runContext?.runId ?? null,
      thread_id: threadId,
      trace_id: traceId,
      model: agentResult.model,
      status: "success",
      input: {
        dealId,
        runId,
        question,
        isStale,
      },
      output: agentResult.aiResult,
      latency_ms: latencyMs,
      total_tokens: (agentResult as any)?.aiResult?.total_tokens ?? null,
    });
  } catch (err) {
    console.error("[agents/analyst] agent_runs insert failed", err);
  }

  return NextResponse.json({
    ok: true,
    answer: agentResult.aiResult?.summary ?? "Analysis ready.",
    threadId,
    model: agentResult.model ?? null,
    aiBridgeResult: agentResult.aiResult,
    runId: agentResult.runContext?.runId ?? null,
    traceId,
  });
}
