import { Agent, run, setDefaultOpenAIKey } from "@openai/agents";
import { AiBridgeResultSchema } from "@hps-internal/contracts";
import type { AiBridgeResult } from "@hps-internal/contracts";
import { loadAnalystRunContext } from "./tools";
import type { AnalystRunContext } from "./types";
import { classifyOpenAiError } from "../shared/openaiErrors";
import { truncateArray, truncateString } from "../shared/contextSlimming";

export const DEAL_ANALYST_AGENT_NAME = "deal-analyst-v1";
const DEFAULT_MODEL = process.env.HPS_ANALYST_MODEL ?? "gpt-4.1";
let openAIKeyInitialized = false;

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!key && process.env.NODE_ENV === "test") {
    return "sk-test";
  }
  if (!key) {
    const error = new Error("OPENAI_API_KEY is missing in environment");
    (error as any).code = "OPENAI_API_KEY_MISSING";
    throw error;
  }
  return key;
}

function ensureOpenAIKey() {
  if (openAIKeyInitialized) return;
  const apiKey = getOpenAIKey();
  if (typeof setDefaultOpenAIKey === "function") {
    setDefaultOpenAIKey(apiKey);
  }
  openAIKeyInitialized = true;
}

export type RunAnalystAgentOptions = {
  orgId: string;
  userId: string;
  dealId: string;
  accessToken: string;
  runId?: string | null;
  question?: string | null;
  isStale?: boolean;
  traceIdCallback?: (traceId: string) => void;
};

export type RunAnalystAgentResult = {
  aiResult: AiBridgeResult;
  runContext: AnalystRunContext | null;
  traceId: string | null;
  model: string;
  status: "succeeded" | "no_run" | "failed";
  didAutoTrimRetry?: boolean;
};

const ANALYST_THIN_TRACE_MAX = 8;
const ANALYST_THIN_QUESTION_MAX_CHARS = 1200;
const ANALYST_TRACE_LINE_MAX_CHARS = 240;

function fmtCurrency(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n ?? 0);
  if (!Number.isFinite(num)) return "n/a";
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPercent(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n ?? 0);
  if (!Number.isFinite(num)) return "n/a";
  return `${(num * 100).toFixed(1)}%`;
}

function buildKeyNumbers(ctx: AnalystRunContext) {
  const o = ctx.outputs as any;
  const arv = o?.arv ?? null;
  const mao =
    o?.primary_offer ??
    o?.mao_wholesale ??
    o?.mao_cap_wholesale ??
    o?.mao_flip ??
    o?.mao_wholetail ??
    null;
  const spread = o?.spread_cash ?? o?.spread ?? null;
  const respectFloor = o?.respect_floor ?? o?.respectFloorPrice ?? null;
  const buyerCeiling = o?.buyer_ceiling ?? o?.buyerCeiling ?? null;

  return {
    arv,
    mao,
    spread,
    respectFloor,
    buyerCeiling,
    asText: [
      `ARV: ${fmtCurrency(arv)}`,
      `MAO: ${fmtCurrency(mao)}`,
      `Spread: ${fmtCurrency(spread)}`,
      `Respect Floor: ${fmtCurrency(respectFloor)}`,
      `Buyer Ceiling: ${fmtCurrency(buyerCeiling)}`,
    ].join("\n"),
  };
}

function buildRiskText(ctx: AnalystRunContext): string {
  const summary = (ctx.outputs as any)?.risk_summary ?? {};
  const overall = summary?.overall ?? "unknown";
  const perGate = summary?.per_gate ?? {};
  const gateLines = Object.entries(perGate)
    .slice(0, 8)
    .map(([gate, info]) => `${gate}: ${(info as any)?.status ?? "unknown"}`);
  return [`Overall: ${overall}`, ...(gateLines.length ? gateLines : [])].join("\n");
}

function buildTraceHighlights(ctx: AnalystRunContext, maxFrames: number): string[] {
  if (!Array.isArray(ctx.trace)) return [];
  const frames = truncateArray(ctx.trace as any[], maxFrames);
  return frames
    .map((frame) => {
      const code = (frame?.frameCode ?? frame?.code ?? frame?.key ?? "TRACE").toString();
      const summary = truncateString((frame?.summary ?? frame?.message ?? "").toString(), ANALYST_TRACE_LINE_MAX_CHARS);
      return `${code}: ${summary}`.trim();
    })
    .filter((line) => line.length > 0);
}

function buildEvidenceWorkflowSummary(ctx: AnalystRunContext): string[] {
  if (!Array.isArray(ctx.trace)) return [];
  const frames = ctx.trace as Array<{ frameCode?: string; summary?: string }>;
  const candidates = frames.filter((frame) => {
    const code = (frame?.frameCode ?? "").toString().toUpperCase();
    return code.includes("EVIDENCE") || code.includes("WORKFLOW");
  });
  return candidates.map((frame) => {
    const code = (frame?.frameCode ?? "TRACE").toString();
    const summary = truncateString((frame?.summary ?? "").toString(), ANALYST_TRACE_LINE_MAX_CHARS);
    return `${code}: ${summary}`.trim();
  });
}

function buildAnalystPrompt(params: {
  ctx: AnalystRunContext;
  question?: string | null;
  mode: "full" | "thin";
}): string {
  const keyNumbers = buildKeyNumbers(params.ctx);
  const riskText = buildRiskText(params.ctx);
  const question = params.question ?? null;

  if (params.mode === "full") {
    return [
      "You are the Deal Analyst for HPS DealEngine.",
      "Use ONLY the numeric values provided below; do not invent or adjust numbers.",
      `Run ID: ${params.ctx.runId}`,
      `Deal ID: ${params.ctx.dealId}`,
      keyNumbers.asText,
      `Risk gates:\n${riskText}`,
      params.ctx.isStale ? "Data is stale; advise the user to re-run underwriting for fresh numbers." : "",
      question ? `User question: ${question}` : "Summarize the latest run, risk gates, and next steps.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const traceHighlights = buildTraceHighlights(params.ctx, ANALYST_THIN_TRACE_MAX);
  const evidenceWorkflow = buildEvidenceWorkflowSummary(params.ctx);
  const trimmedQuestion = question
    ? truncateString(question, ANALYST_THIN_QUESTION_MAX_CHARS)
    : null;

  return [
    "You are the Deal Analyst for HPS DealEngine.",
    "Use ONLY the numeric values provided below; do not invent or adjust numbers.",
    `Run ID: ${params.ctx.runId}`,
    `Deal ID: ${params.ctx.dealId}`,
    keyNumbers.asText,
    `Risk gates:\n${truncateString(riskText, ANALYST_TRACE_LINE_MAX_CHARS * 4)}`,
    evidenceWorkflow.length > 0 ? `Evidence/workflow:\n${evidenceWorkflow.join("\n")}` : "",
    traceHighlights.length > 0 ? `Trace highlights:\n${traceHighlights.map((line) => `- ${line}`).join("\n")}` : "",
    params.ctx.isStale ? "Data is stale; advise the user to re-run underwriting for fresh numbers." : "",
    trimmedQuestion ? `User question: ${trimmedQuestion}` : "Summarize the latest run, risk gates, and next steps.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runAnalystAgent(options: RunAnalystAgentOptions): Promise<RunAnalystAgentResult> {
  const { orgId, userId, dealId, accessToken, runId, question, isStale, traceIdCallback } = options;
  ensureOpenAIKey();
  const ctx = await loadAnalystRunContext({
    orgId,
    userId,
    dealId,
    runId,
    allowStale: isStale ?? false,
    accessToken,
  });

  if (!ctx) {
    const aiResult = AiBridgeResultSchema.parse({
      persona: "dealAnalyst",
      summary: "No underwriting run found. Please run Analyze before asking the Analyst.",
      guardrails: {
        title: "Guardrails",
        body: "No run is available for this deal. Re-run underwriting to produce deterministic outputs.",
      },
      sources: [],
    });
    return { aiResult, runContext: null, traceId: null, model: DEFAULT_MODEL, status: "no_run" };
  }

  const keyNumbers = buildKeyNumbers(ctx);
  const riskText = buildRiskText(ctx);
  const fullPrompt = buildAnalystPrompt({ ctx, question, mode: "full" });
  const thinPrompt = buildAnalystPrompt({ ctx, question, mode: "thin" });

  const agent = new Agent({
    name: DEAL_ANALYST_AGENT_NAME,
    instructions:
      "Explain the deterministic underwriting run for a single deal. Do not invent numbers. Mention stale data if indicated.",
    model: DEFAULT_MODEL,
  });

  let didAutoTrimRetry = false;
  let runResult: any;
  try {
    runResult = await run(agent, fullPrompt);
  } catch (err: any) {
    const classified = classifyOpenAiError(err);
    if (classified.error_code !== "context_length_exceeded") {
      throw err;
    }
    didAutoTrimRetry = true;
    try {
      runResult = await run(agent, thinPrompt);
    } catch (retryErr: any) {
      (retryErr as any).didAutoTrimRetry = true;
      throw retryErr;
    }
  }
  const finalOutput =
    typeof runResult.finalOutput === "string"
      ? runResult.finalOutput
      : (runResult.finalOutput as any)?.text ?? "";

  if (runResult.lastResponseId && traceIdCallback) {
    traceIdCallback(runResult.lastResponseId);
  }

  const aiResult = AiBridgeResultSchema.parse({
    persona: "dealAnalyst",
    summary: finalOutput || "Analysis complete.",
    key_numbers: {
      title: "Key numbers",
      body: keyNumbers.asText,
    },
    risk_and_evidence: {
      title: "Risk & evidence",
      body: riskText,
    },
    guardrails: {
      title: "Guardrails",
      body: ctx.isStale
        ? "Numbers come from a stale run. Re-run underwriting to refresh before making decisions."
        : "Numbers are pulled directly from the deterministic run outputs.",
    },
    sources: [
      { kind: "run", ref: ctx.runId },
      { kind: "trace", ref: ctx.runId },
    ],
  });

  return {
    aiResult,
    runContext: ctx,
    traceId: runResult.lastResponseId ?? null,
    model: DEFAULT_MODEL,
    status: "succeeded",
    didAutoTrimRetry,
  };
}
