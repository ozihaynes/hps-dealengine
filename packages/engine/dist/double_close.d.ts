export declare function doubleClose(input: {
    sellerPrice: number;
    buyerPrice: number;
    aToBCloseCosts: number;
    bToCCloseCosts: number;
    holdingDays: number;
    carryPerDay: number;
}): {
    gross_spread: number;
    carrying_costs: number;
    costs_total: number;
    net_profit_b: number;
};
export type DCInput = {
    sellerPrice?: number | string;
    buyerPrice?: number | string;
    a_price?: number | string;
    b_price?: number | string;
    price_ab?: number | string;
    price_bc?: number | string;
    ab_price?: number | string;
    bc_price?: number | string;
    a_to_b_price?: number | string;
    b_to_c_price?: number | string;
    ab_note_amount?: number | string;
    bc_note_amount?: number | string;
    ab_pages?: number;
    bc_pages?: number;
    county?: string;
    property_type?: 'SFR' | 'OTHER';
    hold_days?: number;
    monthly_carry?: number | string;
};
export type DCSideFees = {
    deed_stamps: number;
    recording_fees: number;
    title_premium: number;
};
export type DCDetailed = {
    side_ab: DCSideFees;
    side_bc: DCSideFees;
    carrying_costs: number;
    dc_total_costs: number;
    dc_carry_cost: number;
    dc_net_spread: number;
    comparison: 'AssignmentBetter' | 'DoubleCloseBetter' | 'Equal';
};
export declare function computeDoubleClose(input: DCInput): DCDetailed;
