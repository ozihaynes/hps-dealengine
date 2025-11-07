export type Json = string | number | boolean | null | Json[] | {
    [k: string]: Json;
};
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
    path: string;
    token?: string | null;
    reason: string;
    source_of_truth?: 'investor_set' | 'team_policy_set' | 'external_feed' | 'unknown';
}
export interface TraceEntry {
    rule: string;
    used: string[];
    details?: Record<string, unknown>;
}
export interface UnderwriteOutputs {
    caps: {
        aivCapApplied: boolean;
        aivCapValue: number | null;
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
    provenance?: boolean;
}
