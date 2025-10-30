// packages/engine/src/double_close.ts
// Double-close module: exports a simple math variant (doubleClose)
// and a Florida-detailed variant (computeDoubleClose) that returns side-level fees
// plus aggregate totals used by tests.

// ----------------------------
// Simple math variant (kept as-is)
// ----------------------------
export function doubleClose(input: {
  sellerPrice: number;
  buyerPrice: number;
  aToBCloseCosts: number;
  bToCCloseCosts: number;
  holdingDays: number;
  carryPerDay: number;
}) {
  const gross_spread = round2(input.buyerPrice - input.sellerPrice);
  const carrying_costs = round2(input.holdingDays * input.carryPerDay);
  const costs_total = round2(input.aToBCloseCosts + input.bToCCloseCosts + carrying_costs);
  const net_profit_b = round2(gross_spread - costs_total);
  return { gross_spread, carrying_costs, costs_total, net_profit_b };
}

// ----------------------------
// Florida-detailed variant used by tests
// ----------------------------
export type DCInput = {
  // prices — accept many key styles for legacy compatibility (numbers or numeric strings)
  sellerPrice?: number | string; // A->B consideration
  buyerPrice?: number | string; // B->C consideration
  a_price?: number | string;
  b_price?: number | string;
  price_ab?: number | string;
  price_bc?: number | string;
  ab_price?: number | string;
  bc_price?: number | string;
  a_to_b_price?: number | string;
  b_to_c_price?: number | string;

  // optional note amounts (present in tests but not used by assertions yet)
  ab_note_amount?: number | string;
  bc_note_amount?: number | string;

  // recording page counts (for deed); default 1 page each
  ab_pages?: number;
  bc_pages?: number;

  // county & property type affect deed doc stamp rate (Miami-Dade special cases)
  county?: string; // e.g., "Miami-Dade", "MIAMI", "DADE"
  property_type?: 'SFR' | 'OTHER';

  // carrying
  hold_days?: number;
  monthly_carry?: number | string; // total monthly cost; per-day = /30
};

export type DCSideFees = {
  deed_stamps: number;
  recording_fees: number;
  title_premium: number;
};

export type DCDetailed = {
  side_ab: DCSideFees;
  side_bc: DCSideFees;
  carrying_costs: number; // per-day * hold_days (rounded to 2)
  // --- aggregates expected by tests ---
  dc_total_costs: number; // sum of all side fees (AB+BC)
  dc_carry_cost: number; // alias of carrying_costs (rounded to 2)
  dc_net_spread: number; // (BC-AB) - total_costs - carry
  comparison: 'AssignmentBetter' | 'DoubleCloseBetter' | 'Equal';
};

export function computeDoubleClose(input: DCInput): DCDetailed {
  const priceAB = coalesceNumber(
    input.sellerPrice,
    input.a_price,
    input.price_ab,
    input.ab_price,
    input.a_to_b_price
  );
  const priceBC = coalesceNumber(
    input.buyerPrice,
    input.b_price,
    input.price_bc,
    input.bc_price,
    input.b_to_c_price
  );

  if (priceAB == null || priceBC == null) {
    throw new Error('computeDoubleClose requires A->B and B->C prices');
  }

  const county = (input.county ?? '').toLowerCase();
  const isMiami = county.includes('miami') || county.includes('dade') || county.includes('mdc');
  const ptype = input.property_type ?? 'SFR';

  const deedRateAB = deedRate(isMiami, ptype);
  const deedRateBC = deedRate(isMiami, ptype);

  const ab_pages = Math.max(1, Math.floor(input.ab_pages ?? 1));
  const bc_pages = Math.max(1, Math.floor(input.bc_pages ?? 1));

  const side_ab: DCSideFees = {
    deed_stamps: round0(priceAB * deedRateAB), // e.g., 100,000 * 0.007 = 700
    recording_fees: round0(recordingFee(ab_pages)), // $10 first page + $8.5 each add'l
    title_premium: round0(titlePremium(priceAB)), // simplified FAC schedule
  };

  const side_bc: DCSideFees = {
    deed_stamps: round0(priceBC * deedRateBC),
    recording_fees: round0(recordingFee(bc_pages)),
    title_premium: round0(titlePremium(priceBC)),
  };

  const hold_days = Math.max(0, Math.floor(input.hold_days ?? 0));
  const monthly = asNumber(input.monthly_carry ?? 0);
  const perDay = monthly / 30;
  const carrying_costs = round2(perDay * hold_days);

  // --- aggregates ---
  const dc_total_costs = round0(
    side_ab.deed_stamps +
      side_ab.recording_fees +
      side_ab.title_premium +
      side_bc.deed_stamps +
      side_bc.recording_fees +
      side_bc.title_premium
  );

  const dc_carry_cost = carrying_costs; // keep 2-decimal precision
  const gross_spread = priceBC - priceAB;
  const dc_net_spread = round0(gross_spread - (dc_total_costs + dc_carry_cost));

  let comparison: DCDetailed['comparison'] = 'Equal';
  const assignment_net = round0(gross_spread); // simple baseline: no closing costs
  if (assignment_net > dc_net_spread) comparison = 'AssignmentBetter';
  else if (assignment_net < dc_net_spread) comparison = 'DoubleCloseBetter';

  return {
    side_ab,
    side_bc,
    carrying_costs,
    dc_total_costs,
    dc_carry_cost,
    dc_net_spread,
    comparison,
  };
}

// ----------------------------
// Helpers (policy-calibrated)
// ----------------------------

// Deed doc stamp rate
// FL default 0.007; Miami-Dade SFR 0.006; Miami-Dade OTHER 0.0105 (surtax).
function deedRate(isMiami: boolean, property: 'SFR' | 'OTHER') {
  if (isMiami) {
    return property === 'SFR' ? 0.006 : 0.0105;
  }
  return 0.007;
}

// Recording fee: $10 first page + $8.50 each additional page
function recordingFee(pages: number) {
  const first = 10;
  const more = Math.max(0, pages - 1) * 8.5;
  return first + more;
}

// Title premium: simplified FAC 69O-186.003 schedule used in the tests.
// $5.75 per $1,000 up to $100,000;
// $5.00 per $1,000 from $100,000.01 to $1,000,000.
function titlePremium(amount: number) {
  const upTo100k = Math.min(amount, 100_000);
  const over100k = Math.max(0, amount - 100_000);
  const p1 = (upTo100k / 1000) * 5.75; // e.g., 100k => 575
  const p2 = (over100k / 1000) * 5.0; // e.g., +50k => +250 => 825 total for 150k
  return p1 + p2;
}

// number utils (accept number or numeric string)
function asNumber(x: any): number {
  const n = typeof x === 'string' ? Number(x.trim()) : Number(x);
  return Number.isFinite(n) ? n : 0;
}
function coalesceNumber(...vals: (number | string | undefined)[]) {
  for (const v of vals) {
    const n = asNumber(v);
    if (
      Number.isFinite(n) &&
      !(v === undefined || v === null || (typeof v === 'string' && v.trim() === ''))
    ) {
      return n;
    }
  }
  return undefined;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round0(n: number) {
  return Math.round(n);
}
