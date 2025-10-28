import { runUnderwrite } from '../src/run_underwrite';
import { describe, it, expect } from 'vitest';
import type { EngineDeal as Deal } from '../src/types';
import { UNDERWRITE_POLICY } from '../src/policy-defaults';

describe('Respect Floor + DTM/Carry (sanity)', () => {
  const base: Deal = {
    market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
    costs: {
      repairs_base: 40000,
      contingency_pct: 0.15,
      monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
      essentials_moveout_cash: 2000,
    },
    debt: { senior_principal: 180000, juniors: [{ label: 'HELOC', amount: 10000 }] },
    timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
  };

  it('DTM chooses manual (28) vs default (DOM+35=80), carry capped <= 5.0 months', () => {
    const out = runUnderwrite(base, UNDERWRITE_POLICY);
    expect(out.dtm.reason).toBe('manual');
    expect(out.dtm.chosen_days).toBe(28);
    expect(out.carry.hold_monthly).toBe(6250);
    expect(Math.abs(out.carry.hold_months - (28 / 30))).toBeLessThan(1e-9);
  });

  it('Respect Floor operational = max(investor typical, payoff+essentials)', () => {
    // No investor discounts → investor null, operational == payoff+essentials
    const out1 = runUnderwrite(base, UNDERWRITE_POLICY);
    expect(out1.floors.investor).toBeNull();
    expect(out1.floors.payoff_plus_essentials).toBe(180000 + 10000 + 2000);
    expect(out1.floors.operational).toBe(192000);

    // With investor typical 22% + p20 28%: typical floor 234,000
    const policy2 = { ...UNDERWRITE_POLICY, investor_discounts: { typical_zip: 0.22, p20_zip: 0.28 } };
    const out2 = runUnderwrite(base, policy2);
    expect(out2.floors.investor).not.toBeNull();
    expect(out2.floors.investor?.typical_floor).toBeCloseTo(300000 * (1 - 0.22), 6); // 234,000
    expect(out2.floors.operational).toBeCloseTo(234000, 6);
  });
});
