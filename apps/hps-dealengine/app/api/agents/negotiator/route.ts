import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { runNegotiatorAgent } from "@hps/agents";

export const runtime = "nodejs";

const BodySchema = z.object({
  dealId: z.string().uuid(),
  question: z.string().optional().nullable(),
  sellerContext: z.string().optional().nullable(),
  threadId: z.string().uuid().optional().nullable(),
  runId: z.string().uuid().optional().nullable(),
});

type AgentErrorPayload = {
  type: "agent_error" | "openai_error" | "config_error";
  message: string;
  code: string | number | null;
  status: number | null;
  details?: unknown;
};

function sanitizeMessage(message: string): string {
  if (!message) return "Negotiator agent failed";
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
    const padded = payloadB64
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), "=");
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

function normalizeAgentError(err: unknown): AgentErrorPayload {
  const base: AgentErrorPayload = {
    type: "agent_error",
    message: sanitizeMessage(err instanceof Error ? err.message : String(err ?? "Negotiator agent failed")),
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

async function ensureThread(
  supabase: SupabaseClient,
  params: { threadId: string; orgId: string; userId: string; dealId: string; runId: string | null },
) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("ai_chat_threads").upsert(
    {
      id: params.threadId,
      persona: "negotiator",
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

export async function POST(req: NextRequest) {
  const accessToken = parseAuthHeader(req);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "auth_missing" }, { status: 401 });
  }

  const userId = parseSubFromJwt(accessToken);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_missing" }, { status: 401 });
  }

  const supabase = createSupabaseWithJwt(accessToken);

  let orgId: string;
  try {
    orgId = await resolveOrgId(supabase);
  } catch (err: any) {
    console.error("[agents/negotiator] org resolution failed", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "org_missing" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { dealId, question, sellerContext, threadId: incomingThreadId, runId } = parsed.data;

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select("id, org_id")
    .eq("id", dealId)
    .maybeSingle();
  if (dealError) {
    return NextResponse.json({ ok: false, error: "deal_load_failed", message: dealError.message }, { status: 500 });
  }
  if (!dealRow) {
    return NextResponse.json({ ok: false, error: "deal_not_found" }, { status: 404 });
  }
  if (dealRow.org_id && dealRow.org_id !== orgId) {
    return NextResponse.json({ ok: false, error: "forbidden_deal_org_mismatch" }, { status: 403 });
  }

  const start = Date.now();
  let agentResult: Awaited<ReturnType<typeof runNegotiatorAgent>>;

  try {
    agentResult = await runNegotiatorAgent({
      orgId,
      userId,
      dealId,
      accessToken,
      question: question ?? null,
      sellerContext: sellerContext ?? null,
      runId: runId ?? null,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const normalizedError = normalizeAgentError(err);
    console.error("[agents/negotiator] runNegotiatorAgent failed", normalizedError);
    const code = normalizedError.code ?? (normalizedError as any)?.error?.code ?? null;
    const isRateLimit =
      code === "rate_limit_exceeded" ||
      normalizedError.status === 429 ||
      (typeof normalizedError.message === "string" && normalizedError.message.toLowerCase().includes("rate limit"));
    try {
      await supabase.from("agent_runs").insert({
        org_id: orgId,
        user_id: userId,
        persona: "negotiator",
        agent_name: "HPS - Deal Negotiator v2",
        workflow_version: "wf_6939e36f4ca08190b3f344325a4aca4e0a1c02199b62b694",
        deal_id: dealId,
        run_id: runId ?? null,
        thread_id: incomingThreadId ?? null,
        trace_id: null,
        model: null,
        status: isRateLimit ? "rate_limited" : "error",
        input: { dealId, question, sellerContext, runId },
        error: normalizedError,
        latency_ms: latencyMs,
      });
    } catch (logErr) {
      console.error("[agents/negotiator] agent_runs failure log failed", logErr);
    }

    if (isRateLimit) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          details: normalizedError,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "failed_to_run_negotiator",
        details: normalizedError,
      },
      { status: 500 },
    );
  }

  const latencyMs = Date.now() - start;
  const threadId = incomingThreadId ?? crypto.randomUUID();
  const safeQuestion =
    question ?? (sellerContext ? "Negotiation context provided" : "Negotiation request");

  try {
    await ensureThread(supabase, {
      threadId,
      orgId,
      userId,
      dealId,
      runId: runId ?? null,
    });
    const userContent = sellerContext
      ? [safeQuestion, `Seller context: ${sellerContext}`].filter(Boolean).join("\n\n")
      : safeQuestion;
    await insertMessages(supabase, threadId, userContent, agentResult.answer);
  } catch (err: any) {
    console.error("[agents/negotiator] chat persistence failed", err?.message ?? err);
  }

  try {
    await supabase.from("agent_runs").insert({
      org_id: orgId,
      user_id: userId,
      persona: "negotiator",
      agent_name: "HPS - Deal Negotiator v2",
      workflow_version: "wf_6939e36f4ca08190b3f344325a4aca4e0a1c02199b62b694",
      deal_id: dealId,
      run_id: runId ?? null,
      thread_id: threadId,
      trace_id: null,
      model: (agentResult as any)?.model ?? null,
      status: "success",
      input: { dealId, question, sellerContext, runId },
      output: agentResult,
      latency_ms: latencyMs,
      total_tokens: (agentResult as any)?.totalTokens ?? null,
    });
  } catch (err) {
    console.error("[agents/negotiator] agent_runs insert failed", err);
  }

  return NextResponse.json({
    ok: true,
    threadId,
    answer: agentResult.answer ?? "Negotiation plan ready.",
    model: (agentResult as any)?.model ?? null,
  });
}
