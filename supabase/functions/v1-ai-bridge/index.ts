// supabase/functions/v1-ai-bridge/index.ts
// Persona-aware AI bridge. Routes requests to Deal Analyst (per-run) or Deal Strategist (system/docs).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { AiBridgeInputSchema } from "../_shared/contracts.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { loadDocChunksForCategories, type DocChunk } from "./docLoader.ts";

type AiPersona = "dealAnalyst" | "dealStrategist";
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

type DealAnalystPayload = z.infer<typeof AiBridgeInputSchema> & { persona: "dealAnalyst" };
type DealStrategistPayload = z.infer<typeof AiBridgeInputSchema> & { persona: "dealStrategist" };

const MODEL = "gpt-4o-mini";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();

type RunRow = {
  id: string;
  org_id: string;
  posture: string;
  deal_id?: string | null;
  output?: unknown;
  trace?: unknown;
  policy_snapshot?: unknown;
  created_at?: string;
};

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

function pickOutputs(output: any) {
  if (!output) return {} as Record<string, unknown>;
  if (typeof output === "object" && "outputs" in output) return (output as any).outputs ?? output;
  return output as Record<string, unknown>;
}

function extractTrace(run: RunRow): any[] {
  const outputTrace = Array.isArray((run.output as any)?.trace) ? (run.output as any).trace : null;
  if (outputTrace) return outputTrace as any[];
  if (Array.isArray(run.trace)) return run.trace as any[];
  return [];
}

function summarizeTrace(trace: any[]): Array<{ frameCode: string; summary: string }> {
  const codes = new Set([
    "SPREAD_LADDER",
    "CASH_GATE",
    "RESPECT_FLOOR",
    "BUYER_CEILING",
    "MAO_CLAMP",
    "TIMELINE_SUMMARY",
    "DTM_URGENCY",
    "CARRY_MONTHS_POLICY",
    "RISK_GATES",
    "EVIDENCE_FRESHNESS",
    "WORKFLOW_DECISION",
    "STRATEGY_RECOMMENDATION",
  ]);
  const gateStatuses = new Set(["fail", "watch", "warning", "warn", "error"]);
  const maxLen = 320;

  return trace.reduce<Array<{ frameCode: string; summary: string }>>((acc, frame) => {
    const rawCode = (frame?.code ?? frame?.key ?? frame?.id ?? "UNKNOWN").toString();
    const status = (frame?.status ?? "").toString().toLowerCase();
    const include = codes.has(rawCode) || gateStatuses.has(status);
    if (!include) return acc;

    let summary = "";

    if (rawCode === "RISK_GATES" && frame?.details?.per_gate) {
      const perGate = frame.details.per_gate as Record<string, { status?: string; reasons?: string[] }>;
      const gated = Object.entries(perGate)
        .filter(([, v]) => gateStatuses.has((v?.status ?? "").toString().toLowerCase()))
        .slice(0, 4)
        .map(
          ([gate, v]) =>
            `${gate}:${(v?.status ?? "unknown").toString()}${Array.isArray(v?.reasons) && v?.reasons.length > 0 ? ` (${v.reasons[0]})` : ""}`,
        );
      summary = gated.length > 0 ? gated.join("; ") : "Risk gates evaluated; no blocking gates.";
    } else if (rawCode === "EVIDENCE_FRESHNESS" && frame?.details?.freshness_by_kind) {
      const freshness = frame.details.freshness_by_kind as Record<string, { status?: string; age_days?: number }>;
      const blocking = Object.entries(freshness)
        .filter(([, v]) => gateStatuses.has((v?.status ?? "").toString().toLowerCase()))
        .slice(0, 4)
        .map(([kind, v]) => `${kind}:${v?.status ?? "unknown"}${v?.age_days != null ? ` (${v.age_days}d)` : ""}`);
      summary = blocking.length > 0 ? blocking.join("; ") : "Evidence freshness reviewed; no blocking items.";
    } else {
      summary =
        frame?.message ??
        frame?.label ??
        frame?.summary ??
        frame?.status ??
        (frame?.data ? JSON.stringify(frame.data) : "");
    }

    const trimmed = (summary ?? "").toString().replace(/\s+/g, " ").trim();
    acc.push({
      frameCode: rawCode,
      summary: trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed,
    });
    return acc;
  }, []);
}

function buildRunContext(run: RunRow) {
  const outputs = pickOutputs(run.output);
  const timelineSummary = (outputs as any)?.timeline_summary ?? {};
  const riskSummary = (outputs as any)?.risk_summary ?? {};
  const trace = summarizeTrace(extractTrace(run));
  return {
    dealId: run.deal_id ?? "",
    runId: run.id,
    outputs,
    trace,
    policySnapshot: run.policy_snapshot ?? null,
    kpis: {
      mao: (outputs as any)?.primary_offer ?? null,
      spread: (outputs as any)?.spread_cash ?? (outputs as any)?.spread_wholesale ?? null,
      respectFloor: (outputs as any)?.respect_floor ?? (outputs as any)?.respectFloorPrice ?? null,
      buyerCeiling: (outputs as any)?.buyer_ceiling ?? (outputs as any)?.buyerCeiling ?? null,
      assignmentFee: (outputs as any)?.wholesale_fee ?? (outputs as any)?.wholesale_fee_dc ?? null,
      payoff: (outputs as any)?.payoff ?? null,
      dtmDays: timelineSummary?.days_to_money ?? timelineSummary?.dtm_selected_days ?? null,
      urgencyBand: timelineSummary?.urgency_band ?? timelineSummary?.speed_band ?? null,
      marketTemp: timelineSummary?.speed_band ?? null,
      carryMonths: timelineSummary?.carry_months_raw ?? timelineSummary?.carry_months ?? null,
      riskOverall: riskSummary?.overall ?? null,
    },
  };
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
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstream error ${res.status}: ${text}`);
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

function renderRunContext(ctx: ReturnType<typeof buildRunContext>) {
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

function buildAnalystPrompt(params: { payload: DealAnalystPayload; ctx: ReturnType<typeof buildRunContext> }) {
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
    "You are the Deal Strategist for HPS DealEngine.",
    "Scope: system-level guidance (sandbox knobs, policies, Market Temp, KPIs). Do NOT invent deal-level numbers.",
    toneInstruction || "Tone: {{strategist_tone_slot}} (calm, professional).",
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

async function handleDealAnalyst(req: Request, supabase: any, payload: DealAnalystPayload) {
  if (!payload.dealId || !payload.runId) {
    return bridgeError(req, 400, "invalid_request", "dealId and runId are required for dealAnalyst.");
  }

  const baseQuery = supabase
    .from("runs")
    .select("id, org_id, posture, deal_id, output, trace, policy_snapshot, created_at")
    .eq("deal_id", payload.dealId)
    .eq("id", payload.runId)
    .maybeSingle();

  const { data, error } = await baseQuery;
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

  const ctx = buildRunContext(data as RunRow);
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

    if (input.persona === "dealAnalyst") {
      return await handleDealAnalyst(req, supabase, input as DealAnalystPayload);
    }

    return await handleDealStrategist(req, input as DealStrategistPayload);
  } catch (err) {
    return bridgeError(
      req,
      500,
      "unexpected_error",
      err instanceof Error ? err.message : "Unexpected error in AI bridge.",
    );
  }
});
