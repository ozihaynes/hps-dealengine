/**
 * packages/engine/src/double_close.ts
 * Implements Double-Close cost math per spec:
 *  - compute_deed_doc_stamps
 *  - compute_note_doc_stamps
 *  - compute_intangible_tax
 *  - compute_title_premium (banded schedule)
 *  - compute_recording_fees
 *  - compute_dc_costs_side("AB"|"BC")
 *  - compute_double_close (net & comparison)
 * Spec refs in PDF deliverables.  // PDF  :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}
 */

import { dcPolicyDefaults, DCPolicy, CountyCode, PropertyType } from './policy-defaults';

export type DCSide = 'AB' | 'BC';

export interface DCInput {
  ab_price: number; // A→B contract price
  bc_price: number; // B→C contract price
  county: CountyCode; // "MIAMI-DADE" | "OTHER"
  property_type: PropertyType; // "SFR" | "OTHER"
  ab_note_amount?: number; // financed note for AB side (if any)
  bc_note_amount?: number; // financed note for BC side (if any)
  ab_pages?: number; // pages to record (AB deed/mortgage)
  bc_pages?: number; // pages to record (BC deed/mortgage)
  hold_days?: number; // days between closings
  daily_carry?: number; // explicit daily carry (preferred)
  monthly_carry?: number; // fallback monthly carry (derive daily)
}

export interface CostBreakdown {
  deed_stamps: number;
  note_stamps: number;
  intangible_tax: number;
  title_premium: number;
  recording_fees: number;
  total: number;
}

export interface DCResult {
  side_ab: CostBreakdown;
  side_bc: CostBreakdown;
  assignment_fee: number;
  dc_total_costs: number;
  dc_carry_cost: number;
  dc_net_spread: number;
  comparison: 'AssignmentBetter' | 'DoubleCloseBetter' | 'Tie';
}

/** Helpers */
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function compute_deed_doc_stamps(
  amount: number,
  county: CountyCode,
  property_type: PropertyType,
  policy: DCPolicy = dcPolicyDefaults
): number {
  const rate =
    county === 'MIAMI-DADE'
      ? property_type === 'SFR'
        ? policy.deedStampRateMiamiDadeSFR
        : policy.deedStampRateMiamiDadeOther
      : policy.deedStampRateDefault;
  return money(rate * Math.max(0, amount));
}

export function compute_note_doc_stamps(
  note_amount: number,
  policy: DCPolicy = dcPolicyDefaults
): number {
  return money(policy.noteDocStampRate * Math.max(0, note_amount));
}

export function compute_intangible_tax(
  note_amount: number,
  policy: DCPolicy = dcPolicyDefaults
): number {
  return money(policy.intangibleTaxRate * Math.max(0, note_amount));
}

export function compute_title_premium(
  purchase_price: number,
  policy: DCPolicy = dcPolicyDefaults
): number {
  let remaining = Math.max(0, purchase_price);
  let premium = 0;
  let lower = 0;
  for (const band of policy.titlePremiumBands) {
    const upper = band.upto ?? remaining + lower; // if null → all remaining
    const span = Math.max(0, Math.min(remaining, upper - lower));
    if (span <= 0) break;
    premium += (span / 1000) * band.ratePerThousand;
    remaining -= span;
    lower = upper;
  }
  return money(premium);
}

export function compute_recording_fees(pages = 1, policy: DCPolicy = dcPolicyDefaults): number {
  const p = Math.max(1, Math.floor(pages));
  const extra = Math.max(0, p - 1);
  return money(policy.recordingFeeBase + extra * policy.recordingFeePerPageAdditional);
}

export function compute_dc_costs_side(
  side: DCSide,
  input: DCInput,
  policy: DCPolicy = dcPolicyDefaults
): CostBreakdown {
  const price = side === 'AB' ? input.ab_price : input.bc_price;
  const note = side === 'AB' ? (input.ab_note_amount ?? 0) : (input.bc_note_amount ?? 0);
  const pages = side === 'AB' ? (input.ab_pages ?? 1) : (input.bc_pages ?? 1);

  const deed_stamps = compute_deed_doc_stamps(price, input.county, input.property_type, policy);
  const note_stamps = compute_note_doc_stamps(note, policy);
  const intangible_tax = compute_intangible_tax(note, policy);
  const title_premium = compute_title_premium(price, policy);
  const recording_fees = compute_recording_fees(pages, policy);

  const total = money(deed_stamps + note_stamps + intangible_tax + title_premium + recording_fees);

  return { deed_stamps, note_stamps, intangible_tax, title_premium, recording_fees, total };
}

export function compute_double_close(
  input: DCInput,
  dealForCarry?: { monthly_carry?: number },
  policy: DCPolicy = dcPolicyDefaults
): DCResult {
  const side_ab = compute_dc_costs_side('AB', input, policy);
  const side_bc = compute_dc_costs_side('BC', input, policy);

  const assignment_fee = money(input.bc_price - input.ab_price);
  const dc_total_costs = money(side_ab.total + side_bc.total);

  const daily = input.daily_carry ?? (input.monthly_carry ?? dealForCarry?.monthly_carry ?? 0) / 30;

  const hold_days = Math.max(0, Math.floor(input.hold_days ?? 0));
  const dc_carry_cost = money((daily || 0) * hold_days);

  const dc_net_spread = money(assignment_fee - dc_total_costs - dc_carry_cost);

  const comparison =
    dc_net_spread > assignment_fee
      ? 'DoubleCloseBetter'
      : dc_net_spread < assignment_fee
        ? 'AssignmentBetter'
        : 'Tie';

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
