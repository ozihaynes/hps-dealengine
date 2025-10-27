export type County = "MIAMI-DADE" | "OTHER";
export type PropertyType = "SFR" | "OTHER";
export interface DoubleCloseInput {
    ab_price: number;
    bc_price: number;
    county: County;
    property_type: PropertyType;
    hold_days?: number;
    monthly_carry?: number;
    ab_note_amount?: number;
    bc_note_amount?: number;
    ab_pages?: number;
    bc_pages?: number;
}
export interface SideCosts {
    deed_stamps: number;
    note_stamps: number;
    intangible_tax: number;
    title_premium: number;
    recording_fees: number;
    total: number;
}
export interface DoubleCloseResult {
    side_ab: SideCosts;
    side_bc: SideCosts;
    assignment_fee: number;
    dc_total_costs: number;
    dc_carry_cost: number;
    dc_net_spread: number;
    comparison: "AssignmentBetter" | "DoubleCloseBetter";
}
export declare function computeDoubleClose(input: DoubleCloseInput): DoubleCloseResult;
