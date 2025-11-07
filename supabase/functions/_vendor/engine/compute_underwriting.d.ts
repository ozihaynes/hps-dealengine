/**
 * Deterministic underwriting core (MVP).
 * - Resolves AIV cap and fee rates from an already-token-resolved policy.
 * - Adds Carry Months (DOM→months with cap) using tokens.
 * - Returns caps + fee rates + fee preview + carry, with round-to-cents math.
 * - Adds a provenance trace and infoNeeded for any missing policy inputs.
 */
type Json = any;
type InfoNeeded = {
    path: string;
    token?: string | null;
    reason: string;
    source_of_truth?: 'investor_set' | 'team_policy_set' | 'external_feed' | 'unknown';
};
type TraceEntry = {
    rule: string;
    used: string[];
    details?: Record<string, unknown>;
};
export type UnderwriteOutputs = {
    caps: {
        aivCapApplied: boolean;
        aivCapValue: number | null;
    };
    carry: {
        monthsRule: string | null;
        monthsCap: number | null;
        rawMonths: number | null;
        carryMonths: number | null;
    };
    fees: {
        rates: {
            list_commission_pct: number;
            concessions_pct: number;
            sell_close_pct: number;
        };
        preview: {
            base_price: number;
            list_commission_amount: number;
            concessions_amount: number;
            sell_close_amount: number;
            total_seller_side_costs: number;
        };
    };
    summaryNotes: string[];
};
export type AnalyzeResult = {
    ok: true;
    infoNeeded: InfoNeeded[];
    trace: TraceEntry[];
    outputs: UnderwriteOutputs;
};
export declare function computeUnderwriting(deal: Json, policy: Json): AnalyzeResult;
export {};
