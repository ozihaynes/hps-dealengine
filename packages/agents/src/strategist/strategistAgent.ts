import {
  type StrategistAgentInput,
  type StrategistAgentResult,
  type StrategistContext,
  type StrategistTimeRange,
} from "./types";
import {
  getKpiSnapshot,
  getRiskGateStats,
  getSandboxSettings,
  kbSearchStrategist,
} from "./shared";
import { createSupabaseRlsClient } from "../supabase/supabaseRlsClient";
import { Agent, run, setDefaultOpenAIKey } from "@openai/agents";
import { classifyOpenAiError } from "../shared/openaiErrors";
import { truncateArray, truncateString } from "../shared/contextSlimming";

const DEFAULT_MODEL = process.env.HPS_STRATEGIST_MODEL ?? "gpt-4.1";
let openAIKeyInitialized = false;
const STRATEGIST_THIN_KB_MAX = 1;
const STRATEGIST_THIN_KB_TEXT_MAX = 2000;
const STRATEGIST_THIN_KB_HEADING_MAX = 160;

function ensureOpenAIKey() {
  if (openAIKeyInitialized) return;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing in environment");
  if (typeof setDefaultOpenAIKey === "function") {
    setDefaultOpenAIKey(apiKey);
  }
  openAIKeyInitialized = true;
}

function buildSystemPrompt(override?: string | null): string {
  const base = `
You are the HPS DealEngine Deal Strategist (org-level advisor).
- Use only provided context: KPIs, risk gates, sandbox settings, and doc snippets.
- Do NOT invent or change numeric outputs or policy knobs.
- Respect trust tiers: prefer Tier 0/1 sources; treat Tier 2 cautiously; ignore unknown.
- Output structure (markdown):
  ## Strategic overview
  ## Key patterns
  ## Recommendations
  ## Caveats / data gaps
`.trim();
  if (override && override.trim().length > 0) {
    return `${override.trim()}\n\n${base}`;
  }
  return base;
}

function buildUserPrompt(question?: string | null): string {
  if (question && question.trim().length > 0) return question.trim();
  return "Provide an org-level strategic overview and recommendations based on the supplied KPIs, risk gates, sandbox settings, and docs.";
}

function buildStrategistContextThin(context: StrategistContext): StrategistContext {
  const kbChunks = truncateArray(context.kbChunks ?? [], STRATEGIST_THIN_KB_MAX).map((chunk) => ({
    ...chunk,
    heading: chunk.heading ? truncateString(chunk.heading, STRATEGIST_THIN_KB_HEADING_MAX) : chunk.heading,
    text: truncateString(chunk.text ?? "", STRATEGIST_THIN_KB_TEXT_MAX),
  }));

  return {
    kpiSnapshot: context.kpiSnapshot,
    riskGateStats: context.riskGateStats,
    sandboxSettings: context.sandboxSettings ?? null,
    kbChunks,
  };
}

export async function runStrategistAgent(input: StrategistAgentInput): Promise<StrategistAgentResult> {
  ensureOpenAIKey();
  const model = input.preferredModel?.trim() || DEFAULT_MODEL;
  const supabase = createSupabaseRlsClient(input.accessToken);
  const timeRange: StrategistTimeRange | null = input.timeRange ?? null;

  const t0 = Date.now();
  const [kpiSnapshot, riskGateStats, sandboxSettings] = await Promise.all([
    getKpiSnapshot(supabase, { orgId: input.orgId, timeRange }),
    getRiskGateStats(supabase, { orgId: input.orgId, timeRange }),
    getSandboxSettings(supabase, { orgId: input.orgId, posture: null }),
  ]);

  const kbQuery =
    input.question?.trim() ||
    input.focusArea?.trim() ||
    "org-level posture and sandbox strategy";

  const kbChunks = await kbSearchStrategist({
    query: kbQuery,
    category: null,
    trustTierMax: 2,
    kbRootDir: null,
    registryPath: null,
  });

  const strategistContext: StrategistContext = {
    kpiSnapshot,
    riskGateStats,
    sandboxSettings,
    kbChunks,
  };

  const systemPrompt = buildSystemPrompt(input.systemPrompt);
  const userPrompt = buildUserPrompt(input.question);

  const agent = new Agent({
    name: "deal-strategist-v2",
    instructions: systemPrompt,
    model,
  });

  const buildPrompt = (context: StrategistContext) =>
    [
      userPrompt,
      `Context JSON:\n${JSON.stringify(context, null, 2)}`,
      'Respond as JSON: {"answer": "<markdown with sections: Strategic overview, Key patterns, Recommendations, Caveats / data gaps>"}',
    ].join("\n\n");

  const fullPrompt = buildPrompt(strategistContext);
  const thinPrompt = buildPrompt(buildStrategistContextThin(strategistContext));

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

  const latencyMs = Date.now() - t0;
  const rawOutput =
    typeof runResult.finalOutput === "string"
      ? runResult.finalOutput
      : (runResult.finalOutput as any)?.text ?? "";

  let answer = rawOutput;
  try {
    const parsed = JSON.parse(rawOutput) as { answer?: string };
    if (parsed?.answer) answer = parsed.answer;
  } catch {
    // leave as rawOutput
  }

  return {
    answer,
    context: strategistContext,
    model,
    totalTokens: (runResult as any)?.usage?.total_tokens ?? undefined,
    latencyMs,
    didAutoTrimRetry,
  };
}
