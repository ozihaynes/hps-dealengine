export type StrategistTimeRange = {
  from?: string;
  to?: string;
};

export type StrategistTimeRangeInput = StrategistTimeRange;

export type KpiSnapshot = {
  dealCount: number;
  runCount: number;
  readyForOfferCount: number;
  spreadBands: Record<string, number>;
  assignmentFeeBands: Record<string, number>;
  timelineUrgency: Record<string, number>;
};

export type RiskGateCounts = {
  pass: number;
  watch: number;
  fail: number;
  missing: number;
};

export type RiskGateStats = {
  totalRuns: number;
  gates: Record<string, RiskGateCounts>;
};

export type SandboxSettings = {
  posture: string;
  config: unknown;
  presetName: string | null;
};

export type KbChunk = {
  docId: string;
  trustTier: number;
  heading?: string | null;
  text: string;
};

export type StrategistContext = {
  kpiSnapshot?: KpiSnapshot;
  riskGateStats?: RiskGateStats;
  sandboxSettings?: SandboxSettings | null;
  kbChunks?: KbChunk[];
};

export interface StrategistAgentInput {
  orgId: string;
  userId: string;
  accessToken: string;
  timeRange?: StrategistTimeRange | null;
  focusArea?: string | null;
  question?: string | null;
  preferredModel?: string | null;
  systemPrompt?: string | null;
}

export interface StrategistAgentResult {
  answer: string;
  context: StrategistContext;
  model: string;
  totalTokens?: number;
  latencyMs?: number;
}
