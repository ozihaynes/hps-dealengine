export type County = 'MIAMI-DADE' | 'OTHER';
export type PropertyType = 'SFR' | 'OTHER';

export interface DoubleCloseInput {
  ab_price: number;
  bc_price: number;
  county: County;
  property_type: PropertyType;
  hold_days?: number; // default 0
  monthly_carry?: number; // default 0
  ab_note_amount?: number; // default 0
  bc_note_amount?: number; // default 0
  ab_pages?: number; // default 1
  bc_pages?: number; // default 1
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
  comparison: 'AssignmentBetter' | 'DoubleCloseBetter';
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round0 = (n: number) => Math.round(n);

function deedRate(county: County, prop: PropertyType): number {
  // FL doc stamps on deeds ($ per $100)
  // - Most counties: $0.70 per $100 => 0.007
  // - Miami-Dade SFR: $0.60 per $100 => 0.006
  // - Miami-Dade OTHER: $1.05 per $100 => 0.0105
  if (county === 'MIAMI-DADE') {
    return prop === 'SFR' ? 0.006 : 0.0105;
  }
  return 0.007;
}

function deedStamps(price: number, county: County, prop: PropertyType): number {
  return round0(price * deedRate(county, prop));
}

function noteDocStamps(noteAmount: number): number {
  // FL doc stamps on notes: $0.35 per $100 => 0.0035
  return round0(noteAmount * 0.0035);
}

function intangibleTax(noteAmount: number): number {
  // FL non-recurring intangible tax on mortgages: 0.2% => 0.002
  return round0(noteAmount * 0.002);
}

function titlePremium(amount: number): number {
  // FL promulgated rate (basic owner’s policy)
  // - First $100k: $5.75 per $1k
  // - $100k–$1M: $5.00 per $1k (incremental)
  const base100k = Math.min(amount, 100000);
  const over100k = Math.max(amount - 100000, 0);
  const p = (base100k / 1000) * 5.75 + (over100k / 1000) * 5.0;
  return round0(p);
}

function recordingFees(pages: number): number {
  // Common schedule: $10 first page + $8.50 each additional page
  const p = Math.max(1, Math.floor(pages || 1));
  const extra = Math.max(0, p - 1);
  const fees = 10 + 8.5 * extra;
  // Keep cents when needed (e.g., 2 pages = 18.5); otherwise whole dollars
  return round2(fees);
}

function sideTotals(
  price: number,
  county: County,
  prop: PropertyType,
  noteAmount: number,
  pages: number
): SideCosts {
  const deed = deedStamps(price, county, prop);
  const note = noteDocStamps(noteAmount || 0);
  const intang = intangibleTax(noteAmount || 0);
  const title = titlePremium(price);
  const rec = recordingFees(pages || 1);
  const total = round2(deed + note + intang + title + rec);
  return {
    deed_stamps: deed,
    note_stamps: note,
    intangible_tax: intang,
    title_premium: title,
    recording_fees: rec,
    total,
  };
}

export function computeDoubleClose(input: DoubleCloseInput): DoubleCloseResult {
  const county = input.county;
  const prop = input.property_type;
  const holdDays = input.hold_days ?? 0;
  const monthlyCarry = input.monthly_carry ?? 0;

  const side_ab = sideTotals(
    input.ab_price,
    county,
    prop,
    input.ab_note_amount ?? 0,
    input.ab_pages ?? 1
  );

  const side_bc = sideTotals(
    input.bc_price,
    county,
    prop,
    input.bc_note_amount ?? 0,
    input.bc_pages ?? 1
  );

  const assignment_fee = round2(input.bc_price - input.ab_price);
  const dc_total_costs = round2(side_ab.total + side_bc.total);

  // Carry: simple day-count using 30-day month convention (matches your baseline 3 days on $300/mo => $30)
  const dc_carry_cost = round2((monthlyCarry / 30) * holdDays);

  const dc_net_spread = round2(assignment_fee - dc_total_costs - dc_carry_cost);
  const comparison = dc_net_spread < assignment_fee ? 'AssignmentBetter' : 'DoubleCloseBetter';

  return {
    side_ab,
    side_bc,
    assignment_fee,
    dc_total_costs,
    dc_carry_cost,
    dc_net_spread,
    comparison,
  };
}
