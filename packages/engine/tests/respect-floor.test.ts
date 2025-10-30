import { runUnderwrite } from '../src/run_underwrite';
import { describe, it, expect } from 'vitest';
import { computeRespectFloor } from '../src/compute_underwriting';
import type { EngineDeal } from '../src/types';
import { UNDERWRITE_POLICY, type UnderwritePolicy } from '../src/policy-defaults';

const baseDeal: EngineDeal = {
  market: { aiv: 300_000, arv: 360_000, dom_zip: 45, moi_zip: 2.3 },
  costs: {
    repairs_base: 40_000,
    contingency_pct: 0.15,
    monthly: { taxes: 3_600, insurance: 2_400, hoa: 0, utilities: 250 },
    close_cost_items_seller: [{ label: 'doc stamps (seller)', amount: 2_100 }],
    close_cost_items_buyer: [{ label: 'lender/title/buyer items', amount: 18_000 }],
    essentials_moveout_cash: 2_000,
  },
  debt: {
    senior_principal: 180_000,
    senior_per_diem: 45,
    good_thru_date: '2025-10-01',
    juniors: [{ label: 'HELOC', amount: 10_000 }],
  },
  timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
};

describe('Respect Floor', () => {
  it('falls back to payoff_plus_essentials when investor_discounts are undefined', () => {
    const rf = computeRespectFloor(baseDeal, {
      ...UNDERWRITE_POLICY,
      investor_discounts: undefined,
    });
    expect(rf.investor).toBeNull();
    expect(rf.payoff_plus_essentials).toBe(192_000); // 180,000 + 10,000 + 2,000
    expect(rf.operational).toBe(192_000);
  });

  it('uses investor floors when provided and takes max()', () => {
    const customPolicy: UnderwritePolicy = {
      ...UNDERWRITE_POLICY,
      investor_discounts: { typical_zip: 0.22 }, // 22% → floor 300k*(1-0.22) = 234k
    };
    const out = runUnderwrite(baseDeal, customPolicy);
    expect(out.floors.investor?.typical_floor).toBeCloseTo(234_000, 6);
    expect(out.floors.operational).toBe(234_000); // max(192k, 234k) = 234k
  });
});
