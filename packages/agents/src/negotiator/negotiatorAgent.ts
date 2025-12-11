import { Agent, run, setDefaultOpenAIKey } from "@openai/agents";
import type { NegotiatorAgentInput, NegotiatorAgentResult } from "./types";
import { resolveNegotiationPlan } from "./shared";

const DEFAULT_MODEL = process.env.HPS_NEGOTIATOR_MODEL ?? "gpt-4.1";
const NEGOTIATOR_AGENT_NAME = "deal-negotiator-v2";
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

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return JSON.stringify({ error: "Failed to serialize", message: (err as any)?.message ?? String(err) });
  }
}

export async function runNegotiatorAgent(input: NegotiatorAgentInput): Promise<NegotiatorAgentResult> {
  ensureOpenAIKey();

  const model = input.preferredModel ?? DEFAULT_MODEL;
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

  const contextJson = safeStringify({
    deal,
    run: runRow,
    negotiationPlan,
  });

  const agent = new Agent({
    name: NEGOTIATOR_AGENT_NAME,
    instructions: systemPrompt,
    model,
  });

  const runResult = await run(agent, [userPrompt, contextJson].join("\n\n"));
  const latencyMs = Date.now() - start;

  const finalOutput =
    typeof runResult.finalOutput === "string"
      ? runResult.finalOutput
      : (runResult.finalOutput as any)?.text ?? "";

  let answer = finalOutput;
  try {
    const parsed = JSON.parse(finalOutput);
    if (parsed && typeof parsed.answer === "string") {
      answer = parsed.answer;
    }
  } catch {
    // fall back to raw text
  }

  const totalTokens = (runResult as any)?.usage?.totalTokens ?? undefined;

  return {
    answer,
    context: { deal, run: runRow, negotiationPlan },
    model,
    totalTokens,
    latencyMs,
  };
}

