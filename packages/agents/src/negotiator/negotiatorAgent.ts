import type { NegotiatorAgentInput, NegotiatorAgentResult, NegotiationPlanRow } from "./types";
import { resolveNegotiationPlan } from "./shared";
import { classifyOpenAiError } from "../shared/openaiErrors";
import { truncateString } from "../shared/contextSlimming";

const DEFAULT_MODEL = process.env.HPS_NEGOTIATOR_MODEL ?? "gpt-4.1";
const NEGOTIATOR_MAX_OUTPUT_TOKENS = 1200;
const NEGOTIATOR_THIN_SCRIPT_MAX = 4000;
const NEGOTIATOR_THIN_NOTES_MAX = 1200;
const NEGOTIATOR_THIN_SELLER_CONTEXT_MAX = 800;
const NEGOTIATOR_THIN_QUESTION_MAX = 800;

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

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return JSON.stringify({ error: "Failed to serialize", message: (err as any)?.message ?? String(err) });
  }
}

function buildNegotiatorContextFull(params: {
  deal: unknown;
  run: unknown;
  negotiationPlan: unknown;
}) {
  const runRow = params.run as any;
  const runSummary = runRow
    ? {
        id: runRow.id ?? null,
        created_at: runRow.created_at ?? null,
        output: runRow.output ?? null,
        policy_snapshot: runRow.policy_snapshot ?? null,
      }
    : null;

  const dealRow = params.deal as any;
  const dealSummary = dealRow
    ? {
        id: dealRow.id ?? null,
        org_id: dealRow.org_id ?? null,
        updated_at: dealRow.updated_at ?? null,
      }
    : null;

  return {
    deal: dealSummary,
    run: runSummary,
    negotiationPlan: params.negotiationPlan,
  };
}

function pickNegotiatorOutputs(runOutput: any) {
  const outputs = runOutput?.outputs ?? runOutput ?? {};
  return {
    arv: outputs?.arv ?? null,
    aiv: outputs?.aiv ?? null,
    primary_offer:
      outputs?.primary_offer ??
      outputs?.mao_wholesale ??
      outputs?.mao_cap_wholesale ??
      outputs?.mao_flip ??
      outputs?.mao_wholetail ??
      null,
    spread: outputs?.spread_cash ?? outputs?.spread_wholesale ?? outputs?.spread ?? null,
    repairs_total: outputs?.total_repairs ?? outputs?.repairs_total ?? outputs?.rehab_total ?? null,
    payoff: outputs?.payoff ?? null,
  };
}

function buildNegotiatorContextThin(params: {
  deal: unknown;
  run: unknown;
  negotiationPlan: NegotiationPlanRow | null;
}) {
  const runRow = params.run as any;
  const runSummary = runRow
    ? {
        id: runRow.id ?? null,
        created_at: runRow.created_at ?? null,
        outputs: pickNegotiatorOutputs(runRow.output),
      }
    : null;

  const dealRow = params.deal as any;
  const dealSummary = dealRow
    ? {
        id: dealRow.id ?? null,
        org_id: dealRow.org_id ?? null,
        updated_at: dealRow.updated_at ?? null,
      }
    : null;

  const plan = params.negotiationPlan
    ? {
        id: params.negotiationPlan.id,
        module: params.negotiationPlan.module,
        scenarioLabel: params.negotiationPlan.scenarioLabel,
        dealFacts: params.negotiationPlan.dealFacts,
        triggerPhrase: params.negotiationPlan.triggerPhrase ?? null,
        scriptBody: truncateString(params.negotiationPlan.scriptBody ?? "", NEGOTIATOR_THIN_SCRIPT_MAX),
        notesForAi: truncateString(params.negotiationPlan.notesForAi ?? "", NEGOTIATOR_THIN_NOTES_MAX),
        followupQuestion: params.negotiationPlan.followupQuestion ?? null,
      }
    : null;

  return {
    deal: dealSummary,
    run: runSummary,
    negotiationPlan: plan,
  };
}

function buildNegotiatorInput(params: { systemPrompt: string; userPrompt: string; context: unknown }) {
  return [
    { role: "system", content: params.systemPrompt },
    { role: "user", content: params.userPrompt },
    { role: "user", content: `Context JSON:\n${safeStringify(params.context)}` },
    {
      role: "user",
      content:
        'Respond as JSON: {"answer": "<markdown with sections: Negotiation summary, Recommended move, Rationale, Suggested phrasing>"}',
    },
  ];
}

async function callNegotiatorLLMOnce(args: { model: string; input: unknown; apiKey: string }) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "endpoints=responses",
    },
    body: JSON.stringify({
      model: args.model,
      input: args.input,
      max_output_tokens: NEGOTIATOR_MAX_OUTPUT_TOKENS,
    }),
  });

  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const err = new Error(parsed?.error?.message ?? `Negotiator LLM request failed with status ${res.status}`);
    (err as any).status = res.status;
    (err as any).code = parsed?.error?.code ?? null;
    (err as any).error = parsed?.error ?? parsed ?? null;
    throw err;
  }

  return parsed;
}

async function callNegotiatorLLMWithRetry(args: {
  model: string;
  input: unknown;
  apiKey: string;
  maxAttempts?: number;
}) {
  const maxAttempts = args.maxAttempts ?? 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callNegotiatorLLMOnce(args);
    } catch (err: any) {
      lastError = err;
      const code = err?.code ?? err?.error?.code ?? null;
      const status = err?.status ?? err?.response?.status ?? null;
      const isRateLimit =
        code === "rate_limit_exceeded" ||
        status === 429 ||
        (typeof err?.message === "string" && err.message.toLowerCase().includes("rate limit"));

      if (!isRateLimit || attempt === maxAttempts) {
        throw err;
      }

      const delayMs = attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new Error("Negotiator LLM failed after retries");
}

function extractResponseText(response: any): string {
  const outputContent = response?.output?.[0]?.content;
  if (Array.isArray(outputContent)) {
    const textChunk = outputContent.find((chunk) => typeof chunk?.text === "string" && chunk.text.trim().length > 0);
    if (textChunk?.text) return textChunk.text;
  }

  if (typeof response?.output_text === "string") return response.output_text;
  if (typeof response?.content === "string") return response.content;
  if (typeof response === "string") return response;

  return "";
}

export async function runNegotiatorAgent(input: NegotiatorAgentInput): Promise<NegotiatorAgentResult> {
  const apiKey = getOpenAIKey();
  const model = input.preferredModel?.trim() || DEFAULT_MODEL;
  const start = Date.now();

  const { deal, run: runRow, negotiationPlan } = await resolveNegotiationPlan({
    orgId: input.orgId,
    userId: input.userId,
    accessToken: input.accessToken,
    dealId: input.dealId,
    runId: input.runId ?? null,
    dealFactsOverride: null,
  });

  const systemPrompt = [
    "You are the HPS Deal Negotiator.",
    "Use only the deterministic run outputs and the selected negotiation plan.",
    "Never breach MAO or respect floor; do not invent new numeric values.",
    "Keep numbers and facts anchored to the provided run and negotiation plan.",
    "Return a single JSON object with key \"answer\" containing markdown with sections:",
    "## Negotiation summary",
    "## Recommended move",
    "## Rationale",
    "## Suggested phrasing (use a blockquote with the script).",
    input.systemPrompt ? `Additional guidance: ${input.systemPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    input.question ? `User question: ${input.question}` : "Provide the next best negotiation move.",
    input.sellerContext ? `Seller context: ${input.sellerContext}` : "",
    "Use the negotiationPlan.module and scenarioLabel as your template; keep the scriptBody intact and tailored.",
    "Context JSON follows.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const fullContextPayload = buildNegotiatorContextFull({ deal, run: runRow, negotiationPlan });
  const thinContextPayload = buildNegotiatorContextThin({
    deal,
    run: runRow,
    negotiationPlan: negotiationPlan ?? null,
  });
  const thinUserPrompt = [
    input.question
      ? `User question: ${truncateString(input.question, NEGOTIATOR_THIN_QUESTION_MAX)}`
      : "Provide the next best negotiation move.",
    input.sellerContext
      ? `Seller context: ${truncateString(input.sellerContext, NEGOTIATOR_THIN_SELLER_CONTEXT_MAX)}`
      : "",
    "Use the negotiationPlan.module and scenarioLabel as your template; keep the scriptBody intact and tailored.",
    "Context JSON follows.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let didAutoTrimRetry = false;
  let response: any;
  try {
    response = await callNegotiatorLLMWithRetry({
      model,
      input: buildNegotiatorInput({ systemPrompt, userPrompt, context: fullContextPayload }),
      apiKey,
      maxAttempts: 3,
    });
  } catch (err: any) {
    const classified = classifyOpenAiError(err);
    if (classified.error_code !== "context_length_exceeded") {
      throw err;
    }
    didAutoTrimRetry = true;
    try {
      response = await callNegotiatorLLMWithRetry({
        model,
        input: buildNegotiatorInput({ systemPrompt, userPrompt: thinUserPrompt, context: thinContextPayload }),
        apiKey,
        maxAttempts: 3,
      });
    } catch (retryErr: any) {
      (retryErr as any).didAutoTrimRetry = true;
      throw retryErr;
    }
  }
  const latencyMs = Date.now() - start;

  const finalOutput = extractResponseText(response);

  let answer = finalOutput;
  try {
    const parsed = JSON.parse(finalOutput);
    if (parsed && typeof parsed.answer === "string") {
      answer = parsed.answer;
    }
  } catch {
    // fall back to raw text
  }

  const totalTokens = response?.usage?.total_tokens ?? response?.usage?.totalTokens ?? undefined;

  return {
    answer,
    context: {
      deal: fullContextPayload.deal,
      run: fullContextPayload.run,
      negotiationPlan,
    },
    model,
    totalTokens,
    latencyMs,
    didAutoTrimRetry,
  };
}
