// packages/engine/src/compute_underwriting.ts

import { UNDERWRITE_POLICY, type UnderwritePolicy } from './policy-defaults';
import type {
  EngineDeal,
  DTMOut,
  CarryOut,
  FloorsOut,
  CeilingsOut,
  HeadlinesOut,
  UnderwriteResult,
  Money,
} from './types';

const n = (v: unknown, d = 0): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};

const sum = (arr: Array<number>) => arr.reduce((a, b) => a + b, 0);

export function computeDTM(deal: EngineDeal, policy: UnderwritePolicy = UNDERWRITE_POLICY): DTMOut {
  const dom = n(deal.market?.dom_zip, NaN);
  const add = n(policy.default_cash_close_add_days, 35);
  const manual = n(deal.timeline?.days_to_sale_manual, NaN);

  const domBased = Number.isFinite(dom) ? Math.max(0, Math.round(dom + add)) : Infinity;
  const manualBased = Number.isFinite(manual) && manual > 0 ? manual : Infinity;

  if (!Number.isFinite(domBased) && !Number.isFinite(manualBased)) {
    return { days: 0, method: 'unknown' };
  }

  if (manualBased <= domBased) {
    return { days: manualBased, method: 'manual', manual: manual };
  }

  return { days: domBased, method: 'dom+add', dom_zip: dom, add_days: add };
}

export function computeCarry(
  deal: EngineDeal,
  dtm: DTMOut,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): CarryOut {
  const m = deal.costs?.monthly ?? {};
  // Treat taxes/insurance as annual by SOT convention; /12 to monthly
  const taxesMonthly = policy.annual_cost_keys.includes('taxes') ? n(m.taxes) / 12 : n(m.taxes);
  const insMonthly = policy.annual_cost_keys.includes('insurance')
    ? n(m.insurance) / 12
    : n(m.insurance);
  const hoaMonthly = n(m.hoa);
  const utilMonthly = n(m.utilities);

  const amountMonthly = Math.max(0, taxesMonthly + insMonthly + hoaMonthly + utilMonthly);

  const monthsRaw = Math.max(0, dtm.days / 30);
  const cap = n(policy.carry_month_cap, 5);
  const cappedMonths = Math.min(monthsRaw, cap);

  const total = +(amountMonthly * cappedMonths).toFixed(2);

  return {
    months: +monthsRaw.toFixed(3),
    capped_months: +cappedMonths.toFixed(3),
    cap,
    amount_monthly: +amountMonthly.toFixed(2),
    total,
    note: 'Carry = monthly sum × min(DTM/30, cap). Taxes/insurance treated as annual ÷ 12.',
  };
}

export function computeRespectFloor(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): FloorsOut {
  const senior = n(deal.debt?.senior_principal);
  const juniors = (deal.debt?.juniors ?? []).map((j) => n(j.amount));
  const essentials = n(deal.costs?.essentials_moveout_cash);

  const payoffPlusEss = +(senior + sum(juniors) + essentials).toFixed(2);

  // Investor floors (optional until ZIP dataset is wired)
  const aiv = n(deal.market?.aiv);
  const p20 =
    policy.investor_floor_p20_zip_pct != null
      ? +(aiv * (1 - policy.investor_floor_p20_zip_pct)).toFixed(2)
      : null;
  const typical =
    policy.investor_floor_typical_zip_pct != null
      ? +(aiv * (1 - policy.investor_floor_typical_zip_pct)).toFixed(2)
      : null;

  const candidates = [payoffPlusEss, p20 ?? -Infinity, typical ?? -Infinity].filter((x) =>
    Number.isFinite(x)
  ) as number[];
  const operational = Math.max(...candidates);

  const notes: string[] = [];
  if (p20 == null || typical == null)
    notes.push(
      '[INFO NEEDED] ZIP investor discount dataset not wired; RF uses payoff+essentials if higher.'
    );

  return {
    payoff_plus_essentials: payoffPlusEss,
    investor: { p20, typical },
    operational: +operational.toFixed(2),
    notes,
  };
}

export function computeBuyerCeiling(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): CeilingsOut {
  const aiv = n(deal.market?.aiv);
  const maoAivCap = +(aiv * n(policy.mao_aiv_cap_pct, 0.97)).toFixed(2);

  // For now we expose just the AIV cap candidate and choose it.
  const candidates = [
    {
      label: 'AIV cap',
      value: maoAivCap,
      eligible: Number.isFinite(maoAivCap),
      reason: 'Presentation clamp (≤ cap × AIV). Detailed MAO math to follow SOT wiring.',
    },
  ];

  const chosen: Money | null = candidates.find((c) => c.eligible)?.value ?? null;

  return {
    chosen,
    reason: 'cap_only',
    mao_aiv_cap: maoAivCap,
    candidates,
    notes: [
      '[INFO NEEDED] Flip/Wholetail/BRRRR candidates and gates to be implemented per SOT policy.',
    ],
  };
}

export function composeHeadlines(
  deal: EngineDeal,
  floors: FloorsOut,
  ceilings: CeilingsOut,
  _carry: CarryOut
): HeadlinesOut {
  const instant = ceilings.chosen ?? null;
  // For a safe first cut: show RF operational as “net to seller” placeholder.
  const net: Money | null = floors.operational ?? null;

  const notes: string[] = [];
  if (instant == null)
    notes.push('[INFO NEEDED] Ceiling not determined; instant_cash_offer unavailable.');
  notes.push(
    'Net to seller currently reflects Respect-Floor operational (payoff+essentials or investor floor).'
  );

  return {
    instant_cash_offer: instant,
    net_to_seller: net,
    notes,
  };
}

export function runUnderwrite(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): UnderwriteResult {
  const dtm = computeDTM(deal, policy);
  const carry = computeCarry(deal, dtm, policy);
  const floors = computeRespectFloor(deal, policy);
  const ceilings = computeBuyerCeiling(deal, policy);
  const headlines = composeHeadlines(deal, floors, ceilings, carry);

  return {
    inputs: { deal },
    policy,
    dtm,
    carry,
    floors,
    ceilings,
    headlines,
  };
}

export { UNDERWRITE_POLICY };
