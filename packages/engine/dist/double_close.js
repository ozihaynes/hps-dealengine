// packages/engine/src/double_close.ts
function r2(n) { return Math.round(n * 100) / 100; }
function r0(n) { return Math.round(n); }
export function doubleClose(input) {
    const gross_spread = r2(input.buyerPrice - input.sellerPrice);
    const carrying_costs = r2(input.holdingDays * input.carryPerDay);
    const costs_total = r2(input.aToBCloseCosts + input.bToCCloseCosts + carrying_costs);
    const net_profit_b = r2(gross_spread - costs_total);
    return { ok: true, gross_spread, carrying_costs, costs_total, net_profit_b };
}
// Rates / fees
function deedRate(miami, type) {
    if (!miami)
        return 0.007;
    return type === "SFR" ? 0.006 : 0.0105;
}
function recordingFee(pages) {
    const p = Math.max(1, Math.floor(pages ?? 1));
    return 10 + 8.5 * (p - 1); // $10 first page + $8.5 each add'l
}
// $0–100k → $575; above 100k → +$5 per $1,000 (or part) over 100k
function titlePremium(consideration) {
    if (consideration <= 100_000)
        return 575;
    const over = consideration - 100_000;
    const steps = Math.ceil(over / 1_000);
    return 575 + 5 * steps;
}
function isMiamiDade(county, flag) {
    if (flag)
        return true;
    return (county ?? "").toUpperCase().includes("MIAMI");
}
export function doubleCloseFL(input) {
    const miami = isMiamiDade(input.county, input.miami_dade);
    const type = input.property_type ?? "SFR";
    const rate = deedRate(miami, type);
    const ab_deed = r0(rate * input.ab_price);
    const bc_deed = r0(rate * input.bc_price);
    const ab_title = r0(titlePremium(input.ab_price));
    const bc_title = r0(titlePremium(input.bc_price));
    const ab_rec = r0(recordingFee(input.ab_pages));
    const bc_rec = r0(recordingFee(input.bc_pages));
    const hold_days = input.hold_days ?? 0;
    const monthly = input.monthly_carry ?? 0;
    const carry = r2((monthly / 30) * hold_days);
    const side_ab = { deed_stamps: ab_deed, title_premium: ab_title, recording_fees: ab_rec };
    const side_bc = { deed_stamps: bc_deed, title_premium: bc_title, recording_fees: bc_rec };
    const stamps = r0(ab_deed + bc_deed);
    const title = r0(ab_title + bc_title);
    const recording = r0(ab_rec + bc_rec);
    const dc_total_costs = r2(stamps + title + recording);
    const dc_carry_cost = r2(carry);
    const gross_spread = r2(input.bc_price - input.ab_price);
    const dc_net_spread = r2(gross_spread - (dc_total_costs + dc_carry_cost));
    // Simple assignment comparator used by tests: fee = bc - ab
    const assignment_net = gross_spread;
    const comparison = assignment_net > dc_net_spread ? "AssignmentBetter" :
        assignment_net < dc_net_spread ? "DoubleCloseBetter" :
            "Tie";
    const totals = {
        stamps,
        title,
        recording,
        carry: dc_carry_cost,
        total: r2(stamps + title + recording + dc_carry_cost)
    };
    return {
        ok: true,
        side_ab,
        side_bc,
        carrying_costs: dc_carry_cost,
        totals,
        dc_total_costs,
        dc_carry_cost,
        dc_net_spread,
        comparison
    };
}
// alias used by tests/app
export const computeDoubleClose = doubleCloseFL;
