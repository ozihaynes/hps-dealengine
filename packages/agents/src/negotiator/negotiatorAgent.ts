import type { NegotiatorAgentInput, NegotiatorAgentResult } from "./types";
import { resolveNegotiationPlan } from "./shared";

const DEFAULT_MODEL = process.env.HPS_NEGOTIATOR_MODEL ?? "gpt-4.1";
const NEGOTIATOR_MAX_OUTPUT_TOKENS = 1200;

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

function buildNegotiatorContext(params: {
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

  const contextPayload = buildNegotiatorContext({ deal, run: runRow, negotiationPlan });
  const response = await callNegotiatorLLMWithRetry({
    model,
    input: buildNegotiatorInput({ systemPrompt, userPrompt, context: contextPayload }),
    apiKey,
    maxAttempts: 3,
  });
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
      deal: contextPayload.deal,
      run: contextPayload.run,
      negotiationPlan,
    },
    model,
    totalTokens,
    latencyMs,
  };
}
