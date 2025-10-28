import { runUnderwrite } from '../src/run_underwrite';
import { describe, it, expect } from 'vitest';
import type { EngineDeal as Deal } from '../src/types';
import { UNDERWRITE_POLICY } from '../src/policy-defaults';

describe('buyer ceiling + clamp + headlines', () => {
  const sample: Deal = {
    market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
    costs: {
      repairs_base: 40000,
      contingency_pct: 0.15,
      monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
      close_cost_items_seller: [],
      close_cost_items_buyer: [],
      essentials_moveout_cash: 2000,
    },
    debt: { senior_principal: 180000, juniors: [{ label: 'HELOC', amount: 10000 }] },
    timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
    status: { insurance_bindable: true },
  };

  it('wholetail beats flip with defaults; clamp ≤ 0.97 * AIV', () => {
    const out = runUnderwrite(sample, UNDERWRITE_POLICY);

    // DTM sanity
    expect(out.dtm.reason).toBe('manual');
    expect(out.dtm.chosen_days).toBe(28);

    // Floors sanity
    expect(out.floors.payoff_plus_essentials).toBe(192000);

    // Candidates present
    const flip = out.ceilings.candidates.find(c => c.label === 'flip')!;
    const wt   = out.ceilings.candidates.find(c => c.label === 'wholetail')!;
    expect(flip.value).toBeCloseTo(225366.6667, 2);
    expect(wt.value).toBeCloseTo(258166.6667, 2);

    // Winner label from candidates by chosen value (works if chosen is a number)
    const chosenVal = out.ceilings.chosen!;
    const chosen = out.ceilings.candidates.find(c => c.value === chosenVal);
    expect(chosen?.label).toBe('wholetail');

    // Clamp should not trigger here (cap = 0.97 * 300k = 291k)
    expect(wt.value).toBeLessThanOrEqual(291000);
  });

  it('clamps when MAO would exceed 0.97*AIV', () => {
    const rich: Deal = {
      ...sample,
      market: { ...sample.market, arv: 500000, aiv: 300000 },
      costs: { ...sample.costs, repairs_base: 5000 },
    };

    const out = runUnderwrite(rich, UNDERWRITE_POLICY);
    const cap = 0.97 * rich.market!.aiv!;
    expect(out.ceilings.candidates.every(c => c.value <= cap)).toBe(true);

    if (out.headlines.instant_cash_offer !== null) {
      expect(out.headlines.instant_cash_offer).toBeLessThanOrEqual(cap);
    }
  });
});
