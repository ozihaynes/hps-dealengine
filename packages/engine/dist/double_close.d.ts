export interface DoubleCloseInput {
    sellerPrice: number;
    buyerPrice: number;
    aToBCloseCosts: number;
    bToCCloseCosts: number;
    holdingDays: number;
    carryPerDay: number;
}
export interface DoubleCloseResult {
    ok: true;
    gross_spread: number;
    carrying_costs: number;
    costs_total: number;
    net_profit_b: number;
}
export declare function doubleClose(input: DoubleCloseInput): DoubleCloseResult;
export type PropertyType = "SFR" | "OTHER";
export interface DoubleCloseFLInput {
    ab_price: number;
    bc_price: number;
    hold_days?: number;
    monthly_carry?: number;
    county?: string;
    miami_dade?: boolean;
    property_type?: PropertyType;
    ab_pages?: number;
    bc_pages?: number;
}
export interface FeeBreakdown {
    deed_stamps: number;
    title_premium: number;
    recording_fees: number;
}
export interface DoubleCloseFLResult {
    ok: true;
    side_ab: FeeBreakdown;
    side_bc: FeeBreakdown;
    carrying_costs: number;
    totals: {
        stamps: number;
        title: number;
        recording: number;
        carry: number;
        total: number;
    };
    dc_total_costs: number;
    dc_carry_cost: number;
    dc_net_spread: number;
    comparison: "AssignmentBetter" | "DoubleCloseBetter" | "Tie";
}
export declare function doubleCloseFL(input: DoubleCloseFLInput): DoubleCloseFLResult;
export declare const computeDoubleClose: typeof doubleCloseFL;
