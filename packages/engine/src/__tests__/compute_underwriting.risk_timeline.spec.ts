import { describe, expect, it } from 'vitest';

import { computeUnderwriting } from '../compute_underwriting';

describe('compute_underwriting risk/timeline bundles', () => {
  it('produces timeline and pass risk summary with basic inputs', () => {
    const deal = {
      market: { aiv: 200000, dom_zip: 45 },
      debt: { payoff: 120000 },
      status: { insurability: 'bindable' },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.timeline_summary?.days_to_money).toBe(45);
    expect(o.timeline_summary?.carry_months).toBeDefined();
    expect(o.timeline_summary?.speed_band).toBe('balanced');
    expect(o.timeline_summary?.urgency).toBe('elevated');

    expect(o.risk_summary?.overall).toBe('pass');
    expect(o.risk_summary?.insurability).toBe('pass');
    expect(o.risk_summary?.payoff).toBe('pass');
  });

  it('flags risk and info_needed when critical inputs are missing', () => {
    const deal = {
      market: { aiv: 150000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.timeline_summary?.days_to_money).toBeNull();
    expect(o.risk_summary?.overall).toBe('watch');
    expect(o.risk_summary?.payoff).toBe('info_needed');
    expect(o.evidence_summary?.confidence_grade).toBeDefined();
    expect(o.evidence_summary?.freshness_by_kind.payoff_letter).toBe('missing');
  });

  it('marks risk fail when title risk is high', () => {
    const deal = {
      market: { aiv: 180000, dom_zip: 20 },
      title: { risk_pct: 0.5 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.risk_summary?.title).toBe('watch');
    expect(o.risk_summary?.overall).toBe('watch');
  });
});
