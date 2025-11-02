export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export interface DealInput {
  market?: {
    aiv?: number | null;
    arv?: number | null;
    dom_zip?: number | null;
    moi_zip?: number | null;
    price_to_list_pct?: number | null;
  };
  costs?: {
    monthly?: {
      taxes?: number | null;
      insurance?: number | null;
      hoa?: number | null;
      utilities?: number | null;
    };
  };
  debt?: {
    payoff?: number | null;
  };
}

export interface InfoNeeded {
  path: string; // e.g., "aiv.safety_cap_pct_token"
  token?: string | null; // e.g., "<AIV_CAP_PCT>"
  reason: string; // why this is needed
  source_of_truth?: 'investor_set' | 'team_policy_set' | 'external_feed' | 'unknown';
}

export interface TraceEntry {
  rule: string; // e.g., "aiv.cap"
  used: string[]; // list of policy paths referenced
  details?: Record<string, unknown>;
}

export interface UnderwriteOutputs {
  caps: {
    aivCapApplied: boolean;
    aivCapValue: number | null; // null when unresolved due to missing policy
  };
  summaryNotes: string[];
}

export interface UnderwriteResult {
  ok: true;
  infoNeeded: InfoNeeded[];
  trace: TraceEntry[];
  outputs: UnderwriteOutputs;
}

export interface ComputeOptions {
  provenance?: boolean; // reserved for later use
}
