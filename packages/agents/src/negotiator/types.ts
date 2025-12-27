export interface NegotiatorAgentInput {
  orgId: string;
  userId: string;
  dealId: string;
  accessToken: string;
  question?: string | null;
  sellerContext?: string | null;
  runId?: string | null;
  preferredModel?: string | null;
  systemPrompt?: string | null;
}

export interface NegotiationPlanRow {
  id: string;
  module: string;
  scenarioLabel: string;
  dealFacts: Record<string, unknown>;
  triggerPhrase?: string | null;
  scriptBody: string;
  notesForAi?: string | null;
  [key: string]: unknown;
}

export interface NegotiatorContext {
  deal?: unknown;
  run?: unknown;
  negotiationPlan?: NegotiationPlanRow | null;
}

export interface NegotiatorAgentResult {
  answer: string;
  context: NegotiatorContext;
  model: string;
  totalTokens?: number;
  latencyMs?: number;
  didAutoTrimRetry?: boolean;
}
