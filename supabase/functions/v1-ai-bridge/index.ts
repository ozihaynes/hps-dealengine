// supabase/functions/v1-ai-bridge/index.ts
// Persona-aware AI bridge. Routes requests to Deal Analyst (per-run) or Deal Strategist (system/docs).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  AiBridgeInputSchema,
  type DealAnalystPayload,
  type DealStrategistPayload,
  type DealNegotiatorPayload,
} from "../_shared/contracts.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { loadDocChunksForCategories, type DocChunk } from "./docLoader.ts";
import { getNegotiationMatrix } from "./negotiation/matrix-loader.ts";
import {
  buildNegotiatorChatResult,
  buildPlaybookResult,
} from "./negotiation/prompts.ts";
import { deriveNegotiationDealFacts, type NegotiationSourceContext } from "./negotiation/deal-facts.ts";
import type { AnalystRunContext } from "../../../packages/agents/src/analyst/types.ts";
import type {
  NegotiationPlaybookResult,
  NegotiatorChatResult,
} from "./negotiation/matrix-types.ts";
import { buildAnalystRunContextFromRow, type RunRow } from "../../../packages/agents/src/analyst/runContext.ts";

type AiPersona = "dealAnalyst" | "dealStrategist" | "dealNegotiator";
type AiTone = "neutral" | "punchy" | "visionary" | "direct" | "empathetic";

type AiBridgeSection = {
  title: string;
  body: string;
};

type AiSourceRefKind = "run" | "trace" | "doc" | "external";

type AiSourceRef = {
  kind: AiSourceRefKind;
  ref: string;
  doc_id?: string;
  title?: string;
  trust_tier?: number;
};

type AiBridgeResult = {
  persona: AiPersona;
  summary: string;
  key_numbers?: AiBridgeSection;
  guardrails?: AiBridgeSection;
  risk_and_evidence?: AiBridgeSection;
  negotiation_playbook?: AiBridgeSection;
  system_guidance?: AiBridgeSection;
  followups?: string[];
  sources: AiSourceRef[];
};

type BridgeResult = AiBridgeResult | NegotiationPlaybookResult | NegotiatorChatResult;

const MODEL = "gpt-5-chat-latest";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();

type ErrorBody = { ok: false; error: string; message: string; issues?: Array<{ path: string; message: string }> };

function bridgeError(req: Request, status: number, error: string, message: string, issues?: Array<{ path: string; message: string }>) {
  return jsonResponse(req, { ok: false, error, message, ...(issues ? { issues } : {}) }, status);
}

function mapZodIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

function buildRunContext(run: RunRow, opts: { orgId: string; userId: string; isStale: boolean }): AnalystRunContext {
  return buildAnalystRunContextFromRow(run, opts);
}

async function callOpenAI(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Upstream error ${res.status}: ${text}`);
    (err as any).status = res.status;
    (err as any).response_body = text;
    throw err;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content?.trim() ?? "{}";
  return content as string;
}

function parseAiResult(raw: string, fallbackPersona: AiPersona): AiBridgeResult {
  try {
    const parsed = JSON.parse(raw);
    return {
      persona: (parsed.persona as AiPersona) ?? fallbackPersona,
      summary: parsed.summary ?? "No summary returned.",
      key_numbers: parsed.key_numbers,
      guardrails: parsed.guardrails,
      risk_and_evidence: parsed.risk_and_evidence,
      negotiation_playbook: parsed.negotiation_playbook,
      system_guidance: parsed.system_guidance,
      followups: Array.isArray(parsed.followups) ? parsed.followups : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  } catch (_err) {
    return {
      persona: fallbackPersona,
      summary: "AI response could not be parsed as JSON.",
      sources: [],
    };
  }
}

function renderDocs(docs: DocChunk[]): string {
  return docs
    .map(
      (doc) =>
        `- [tier ${doc.trustTier}] ${doc.docId} - ${doc.heading}: ${doc.content.slice(0, 320).replace(/\s+/g, " ")}`,
    )
    .join("\n");
}

function renderRunContext(ctx: AnalystRunContext) {
  return JSON.stringify(
    {
      dealId: ctx.dealId,
      runId: ctx.runId,
      kpis: ctx.kpis,
      trace: ctx.trace,
    },
    null,
    2,
  );
}

function buildToneInstruction(tone?: AiTone): string {
  switch (tone) {
    case "punchy":
      return "Use concise, punchy language with direct recommendations. Avoid hedging.";
    case "visionary":
      return "Use a strategic tone, focusing on long-term positioning and business model impact.";
    case "direct":
      return "Be direct and plainspoken. Prioritize clarity over politeness.";
    case "empathetic":
      return "Acknowledge the user's stress and concerns. Be supportive while staying factual.";
    default:
      return "";
  }
}

function buildAnalystPrompt(params: { payload: DealAnalystPayload; ctx: AnalystRunContext }) {
  const toneInstruction = buildToneInstruction(params.payload.tone as AiTone | undefined);
  const freshnessInstruction = params.payload.isStale
    ? "WARNING: The user has unsaved changes that are NOT reflected in this run. You must clearly warn that analysis is based on the last completed run and may be out of date compared to on-screen inputs."
    : "";

  return [
    "You are the Deal Analyst for a single wholesale deal.",
    "Scope: explain the engine's outputs and trace, and turn them into a negotiation playbook.",
    "Never recompute or invent numbers (MAO, spreads, DTM). Use the provided run outputs and trace only.",
    freshnessInstruction,
    toneInstruction,
    "Return JSON with fields: persona, summary, key_numbers{title,body}, guardrails{title,body}, risk_and_evidence{title,body}, negotiation_playbook{title,body}, followups[string[]], sources[{kind,ref,doc_id?,title?,trust_tier?}].",
    "Run context (ground truth):",
    renderRunContext(params.ctx),
    "User request:",
    params.payload.userPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildStrategistPrompt(params: {
  payload: DealStrategistPayload;
  docs: DocChunk[];
}) {
  const toneInstruction = buildToneInstruction(params.payload.tone as AiTone | undefined);
  return [
    "You are the Deal Strategist persona for HPS DealEngine.",
    "Stay concise and actionable; avoid flowery language.",
    "Do NOT invent or adjust numeric underwriting results; if the user wants numbers, tell them you only operate on provided deal outputs or policies.",
    "Only suggest using external sources/tools when the user explicitly asks; otherwise stay within provided docs/context.",
    toneInstruction || "Tone: calm, professional.",
    "Return JSON with fields: persona, summary, system_guidance{title,body}, guardrails{title,body}, followups[string[]], sources[{kind,ref,doc_id?,title?,trust_tier?}].",
    "Docs (with trust tiers; prefer lower tier on conflict):",
    renderDocs(params.docs),
    "User request:",
    params.payload.userPrompt,
  ].join("\n\n");
}

function scoreChunks(chunks: DocChunk[], query: string, max: number): DocChunk[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 2);

  const scored = chunks.map((chunk) => {
    const haystack = `${chunk.heading} ${chunk.content}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 2;
    }
    score += (3 - chunk.trustTier) * 1.5;
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.chunk);
}

async function handleDealAnalyst(req: Request, supabase: any, payload: DealAnalystPayload, userId: string) {
  if (!payload.dealId || !payload.runId) {
    return bridgeError(req, 400, "invalid_request", "dealId and runId are required for dealAnalyst.");
  }

  const { data, error } = await supabase
    .from("runs")
    .select("id, org_id, posture, deal_id, input, output, trace, policy_snapshot, created_at")
    .eq("deal_id", payload.dealId)
    .eq("id", payload.runId)
    .maybeSingle();
  if (error) {
    const message = (error.message ?? "").toLowerCase();
    const code = (error as any)?.code ?? "";
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
      return bridgeError(req, 403, "run_forbidden", "You do not have access to this run.");
    }
    return bridgeError(req, 500, "run_load_failed", "Unexpected error while loading run.");
  }

  if (!data) {
    return bridgeError(req, 404, "run_not_found", "Run not found for this deal/run.");
  }

  const ctx = buildRunContext(data as RunRow, {
    orgId: (data as RunRow).org_id ?? "",
    userId,
    isStale: Boolean(payload.isStale),
  });
  const prompt = buildAnalystPrompt({ payload, ctx });

  let parsed: AiBridgeResult | null = null;
  try {
    const content = await callOpenAI(prompt);
    parsed = parseAiResult(content, "dealAnalyst");
  } catch (err) {
    parsed = {
      persona: "dealAnalyst",
      summary: err instanceof Error ? err.message : "AI unavailable",
      sources: [],
    };
  }

  return jsonResponse(req, { ok: true, result: parsed });
}

async function handleDealStrategist(req: Request, payload: DealStrategistPayload) {
  const categories: DocChunk["docId"][] = (() => {
    if (!payload.route) return [];
    const r = payload.route.toLowerCase();
    if (r.includes("dashboard")) return ["dashboard", "app", "engine", "domain"];
    if (r.includes("underwrite") || r.includes("repairs")) return ["app", "domain", "engine", "dashboard"];
    if (r.includes("sandbox")) return ["domain", "engine", "app", "dashboard", "ai"];
    return [];
  })();

  const docs = await loadDocChunksForCategories(
    categories.length > 0 ? (categories as any) : ["ai", "product", "domain", "engine", "app", "dashboard", "glossary"],
  );
  const selectedDocs = scoreChunks(docs, payload.userPrompt, 10);
  const prompt = buildStrategistPrompt({ payload, docs: selectedDocs });

  let parsed: AiBridgeResult | null = null;
  try {
    const content = await callOpenAI(prompt);
    parsed = parseAiResult(content, "dealStrategist");
  } catch (err) {
    parsed = {
      persona: "dealStrategist",
      summary: err instanceof Error ? err.message : "AI unavailable",
      sources: [],
    };
  }

  return jsonResponse(req, { ok: true, result: parsed });
}

async function handleDealNegotiator(req: Request, supabase: any, payload: DealNegotiatorPayload, userId: string) {
  if (!payload.dealId) {
    return bridgeError(req, 400, "invalid_request", "dealId is required for dealNegotiator.");
  }

  const baseQuery = supabase
    .from("runs")
    .select("id, org_id, posture, deal_id, input, output, trace, policy_snapshot, created_at")
    .eq("deal_id", payload.dealId)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data, error } = payload.runId ? await baseQuery.eq("id", payload.runId).maybeSingle() : await baseQuery.single();

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    const code = (error as any)?.code ?? "";
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
      return bridgeError(req, 403, "run_forbidden", "You do not have access to this run.");
    }
    return bridgeError(req, 500, "run_load_failed", "Unexpected error while loading run for negotiator.");
  }

  if (!data) {
    return bridgeError(req, 404, "run_not_found", "Run not found for this deal.");
  }

  const ctx = buildRunContext(data as RunRow, {
    orgId: (data as RunRow).org_id ?? "",
    userId,
    isStale: false,
  });
  const matrix = await getNegotiationMatrix();
  const facts: NegotiationSourceContext["outputs"] = ctx.outputs as Record<string, unknown>;
  const normalizedFacts = deriveNegotiationDealFacts({
    dealId: ctx.dealId,
    runId: ctx.runId,
    outputs: facts,
    trace: ctx.trace,
    input: (ctx as any)?.input ?? null,
  });

  if (payload.mode === "generate_playbook") {
    const result = buildPlaybookResult({
      runId: ctx.runId,
      facts: normalizedFacts,
      matrix,
    });
    return jsonResponse(req, { ok: true, result });
  }

  if (payload.mode === "chat") {
    const result = buildNegotiatorChatResult({
      runId: ctx.runId,
      facts: normalizedFacts,
      matrix,
      logicRowIds: payload.logicRowIds ?? [],
      userMessage: payload.userMessage ?? "",
      tone: (payload as any)?.tone as "objective" | "empathetic" | "assertive" | undefined,
    });
    return jsonResponse(req, { ok: true, result });
  }

  return bridgeError(req, 400, "invalid_request", `Unsupported mode for dealNegotiator: ${payload.mode}`);
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return bridgeError(req, 405, "method_not_allowed", "Method not allowed");
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return bridgeError(req, 500, "config_error", "Supabase environment not configured.");
    }

    if (!OPENAI_API_KEY) {
      return bridgeError(req, 500, "config_error", "OPENAI_API_KEY is missing.");
    }
    if (!OPENAI_API_KEY.startsWith("sk-")) {
      return bridgeError(req, 500, "config_error", "OPENAI_API_KEY appears malformed (expected to start with \"sk-\").");
    }

    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch (err) {
      return bridgeError(req, 400, "invalid_json", "Invalid JSON body");
    }

    const parsed = AiBridgeInputSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return bridgeError(req, 400, "invalid_request", "Invalid request payload", mapZodIssues(parsed.error));
    }
    const input = parsed.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return bridgeError(req, 401, "unauthorized", "Unauthorized");
    }

    const userId = userData.user.id;

    switch (input.persona) {
      case "dealAnalyst":
        return await handleDealAnalyst(req, supabase, input as DealAnalystPayload, userId);
      case "dealStrategist":
        return await handleDealStrategist(req, input as DealStrategistPayload);
      case "dealNegotiator":
        return await handleDealNegotiator(req, supabase, input as DealNegotiatorPayload, userId);
      default:
        return bridgeError(req, 400, "invalid_request", "Unsupported persona");
    }
  } catch (err) {
    return bridgeError(
      req,
      500,
      "unexpected_error",
      err instanceof Error ? err.message : "Unexpected error in AI bridge.",
    );
  }
});
