import { Agent, run, setDefaultOpenAIKey } from "@openai/agents";
import { AiBridgeResultSchema } from "@hps-internal/contracts";
import type { AiBridgeResult } from "@hps-internal/contracts";
import { loadAnalystRunContext } from "./tools";
import type { AnalystRunContext } from "./types";

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
};

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

  const promptLines = [
    "You are the Deal Analyst for HPS DealEngine.",
    "Use ONLY the numeric values provided below; do not invent or adjust numbers.",
    `Run ID: ${ctx.runId}`,
    `Deal ID: ${ctx.dealId}`,
    keyNumbers.asText,
    `Risk gates:\n${riskText}`,
    ctx.isStale ? "Data is stale; advise the user to re-run underwriting for fresh numbers." : "",
    question ? `User question: ${question}` : "Summarize the latest run, risk gates, and next steps.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const agent = new Agent({
    name: DEAL_ANALYST_AGENT_NAME,
    instructions:
      "Explain the deterministic underwriting run for a single deal. Do not invent numbers. Mention stale data if indicated.",
    model: DEFAULT_MODEL,
  });

  const runResult = await run(agent, promptLines);
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
  };
}
