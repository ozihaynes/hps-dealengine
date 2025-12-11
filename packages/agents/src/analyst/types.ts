import type { AnalyzeOutputs } from "@hps-internal/contracts";

export interface AnalystRunContext {
  orgId: string;
  userId: string;
  dealId: string;
  runId: string;
  runCreatedAt: string;
  isStale: boolean;
  input?: unknown;
  outputs: AnalyzeOutputs;
  trace?: unknown;
  policySnapshot?: unknown;
  kpis?: {
    mao: unknown;
    spread: unknown;
    respectFloor: unknown;
    buyerCeiling: unknown;
    assignmentFee: unknown;
    payoff: unknown;
    dtmDays: unknown;
    urgencyBand: unknown;
    marketTemp: unknown;
    carryMonths: unknown;
    riskOverall: unknown;
  };
}

export interface AnalystRunFetchInput {
  orgId: string;
  userId: string;
  dealId: string;
  runId?: string | null;
  allowStale?: boolean;
  includeEvidence?: boolean;
}
