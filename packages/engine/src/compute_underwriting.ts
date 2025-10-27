// top of packages/engine/src/compute_underwriting.ts
import { UNDERWRITE_POLICY as POLICY } from './policy-underwrite';

/** Shared money row shape */
export type MoneyRow = { label?: string; amount: number };

/** EngineDeal (mirrors the adapter schema used by the app) */
export type EngineDeal = {
  market: {
    aiv: number;
    arv: number;
    dom_zip: number;
    moi_zip: number;
    ['price-to-list-pct']?: number; // 0..1
  };
  costs: {
    repairs_base: number;
    contingency_pct: number; // 0..1
    monthly: {
      taxes: number;
      insurance: number;
      hoa: number;
      utilities: number;
    };
    close_cost_items_seller?: MoneyRow[];
    close_cost_items_buyer?: MoneyRow[];
    essentials_moveout_cash?: number;
    concessions_pct?: number; // 0..1
  };
  debt: {
    senior_principal: number;
    senior_per_diem: number;
    good_thru_date?: string | null;
    juniors?: MoneyRow[];
  };
  timeline: {
    days_to_ready_list: number;
    days_to_sale_manual: number;
    timeline_total_days?: number;
  };
  status?: unknown;
  evidence?: unknown;
};

import { UNDERWRITE_POLICY as POLICY } from './policy-underwrite';

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function computeDTM(deal: EngineDeal) {
  const manual_days = Math.max(0, Math.round(n(deal.timeline.days_to_sale_manual)));
  const domZip = Math.max(0, Math.round(n(deal.market.dom_zip)));
  const default_cash_close_days = Math.max(0, domZip + POLICY.default_cash_close_add_days);
  const useManual = manual_days > 0 && manual_days <= default_cash_close_days;
  return {
    manual_days,
    default_cash_close_days,
    chosen_days: useManual ? manual_days : default_cash_close_days,
    reason: (useManual ? 'manual' : 'dom+35') as 'manual' | 'dom+35',
  };
}

export function computeCarry(deal: EngineDeal, dtm = computeDTM(deal)) {
  const hold_monthly =
    n(deal.costs.monthly.taxes) +
    n(deal.costs.monthly.insurance) +
    n(deal.costs.monthly.hoa) +
    n(deal.costs.monthly.utilities);
  const total_days = n(deal.timeline.days_to_ready_list) + n(dtm.chosen_days);
  const hold_months = clamp(total_days / 30, 0, POLICY.carry_month_cap);
  return { hold_monthly, hold_months, total_days };
}

export function computeRespectFloor(deal: EngineDeal) {
  const juniors_total = sum((deal.debt.juniors ?? []).map((j) => n(j.amount)));
  const payoff_plus_essentials =
    n(deal.debt.senior_principal) + juniors_total + n(deal.costs.essentials_moveout_cash);
  const investor: null | { p20_floor: number; typical_floor: number } = null;
  const investorFloor =
    typeof investor === 'object' &&
    investor !== null &&
    'typical_floor' in (investor as any) &&
    typeof (investor as any).typical_floor === 'number'
      ? (investor as any).typical_floor
      : 0;
  const operational = Math.max(payoff_plus_essentials, investorFloor);
  return { payoff_plus_essentials, investor, operational };
}

export function computeBuyerCeiling(_deal: EngineDeal, _policy = POLICY) {
  return {
    chosen: null as null | { label: string; value: number },
    candidates: [] as Array<{ label: string; value: number; eligible: boolean; reasons: string[] }>,
    reasons: ['scaffold'],
  };
}

export function runUnderwrite(deal: EngineDeal) {
  const dtm = computeDTM(deal);
  const carry = computeCarry(deal, dtm);
  const floors = computeRespectFloor(deal);
  const ceilings = computeBuyerCeiling(deal, POLICY);
  return { dtm, carry, floors, ceilings };
}
export type UnderwriteOut = ReturnType<typeof runUnderwrite>;
