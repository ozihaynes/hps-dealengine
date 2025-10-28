// packages/engine/src/double_close.ts

// ---------------- Simple math variant ----------------
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
function r2(n: number) { return Math.round(n * 100) / 100; }
function r0(n: number) { return Math.round(n); }

export function doubleClose(input: DoubleCloseInput): DoubleCloseResult {
  const gross_spread = r2(input.buyerPrice - input.sellerPrice);
  const carrying_costs = r2(input.holdingDays * input.carryPerDay);
  const costs_total = r2(input.aToBCloseCosts + input.bToCCloseCosts + carrying_costs);
  const net_profit_b = r2(gross_spread - costs_total);
  return { ok: true, gross_spread, carrying_costs, costs_total, net_profit_b };
}

// ---------------- Florida detailed variant ----------------
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
  // convenience fields used by tests
  dc_total_costs: number; // stamps + title + recording
  dc_carry_cost: number;  // carry only
  dc_net_spread: number;  // (bc - ab) - (dc_total_costs + dc_carry_cost)

  // NEW: comparison vs pure assignment (tests expect 'AssignmentBetter')
  comparison: "AssignmentBetter" | "DoubleCloseBetter" | "Tie";
}

// Rates / fees
function deedRate(miami: boolean, type: PropertyType) {
  if (!miami) return 0.007;
  return type === "SFR" ? 0.006 : 0.0105;
}
function recordingFee(pages?: number) {
  const p = Math.max(1, Math.floor(pages ?? 1));
  return 10 + 8.5 * (p - 1); // $10 first page + $8.5 each add'l
}
// $0–100k → $575; above 100k → +$5 per $1,000 (or part) over 100k
function titlePremium(consideration: number) {
  if (consideration <= 100_000) return 575;
  const over = consideration - 100_000;
  const steps = Math.ceil(over / 1_000);
  return 575 + 5 * steps;
}
function isMiamiDade(county?: string, flag?: boolean) {
  if (flag) return true;
  return (county ?? "").toUpperCase().includes("MIAMI");
}

export function doubleCloseFL(input: DoubleCloseFLInput): DoubleCloseFLResult {
  const miami = isMiamiDade(input.county, input.miami_dade);
  const type: PropertyType = input.property_type ?? "SFR";
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

  const side_ab: FeeBreakdown = { deed_stamps: ab_deed, title_premium: ab_title, recording_fees: ab_rec };
  const side_bc: FeeBreakdown = { deed_stamps: bc_deed, title_premium: bc_title, recording_fees: bc_rec };

  const stamps = r0(ab_deed + bc_deed);
  const title = r0(ab_title + bc_title);
  const recording = r0(ab_rec + bc_rec);
  const dc_total_costs = r2(stamps + title + recording);
  const dc_carry_cost = r2(carry);
  const gross_spread = r2(input.bc_price - input.ab_price);
  const dc_net_spread = r2(gross_spread - (dc_total_costs + dc_carry_cost));

  // Simple assignment comparator used by tests: fee = bc - ab
  const assignment_net = gross_spread;
  const comparison =
    assignment_net > dc_net_spread ? "AssignmentBetter" :
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

