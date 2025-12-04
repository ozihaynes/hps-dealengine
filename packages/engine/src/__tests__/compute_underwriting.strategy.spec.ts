import { describe, expect, it } from 'vitest';

import { computeUnderwriting } from '../compute_underwriting';

describe('computeUnderwriting strategy bundle (provisional)', () => {
  it('computes ceiling/floor, MAOs, bands, workflow, and confidence', () => {
    const deal = {
      market: { aiv: 200000, arv: 250000, dom_zip: 60 },
      debt: { payoff: 150000 },
      costs: { repairs_base: 30000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: {
        list_commission_pct: 0.06,
        concessions_pct: 0.02,
        sell_close_pct: 0.015,
      },
      floorsSpreads: {
        wholesale_target_margin_pct: 0.2,
        investor_floor_discount_p20_pct: 0.2,
        investor_floor_discount_typical_pct: 0.1,
        retained_equity_pct: 0.05,
        move_out_cash_default: 5000,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.buyer_ceiling).toBe(146250);
    expect(o.buyer_ceiling_unclamped).toBe(146250);
    expect(o.respect_floor).toBe(180000);
    expect(o.mao_cap_wholesale).toBe(180000);
    expect(o.primary_offer).toBe(146250);
    expect(o.primary_offer_track).toBe('wholesale');

    expect(o.window_floor_to_offer).toBe(-33750);
    expect(o.headroom_offer_to_ceiling).toBe(0);
    expect(o.cushion_vs_payoff).toBe(-3750);
    expect(o.shortfall_vs_payoff).toBe(3750);

    expect(o.mao_wholesale).toBe(146250);
    expect(o.mao_flip).toBe(146250);
    expect(o.mao_wholetail).toBe(146250);
    expect(o.mao_as_is_cap).toBe(180000);

    expect(o.seller_offer_band).toBe('low');
    expect(o.buyer_ask_band).toBe('balanced');
    expect(o.sweet_spot_flag).toBe(false);
    expect(o.gap_flag).toBe('wide_gap');

    expect(o.workflow_state).toBe('NeedsReview');
    expect(o.confidence_grade).toBe('B');
    expect(o.min_spread_required).toBeDefined();
    expect(o.spread_cash).toBeDefined();
  });

  it('falls back to NeedsInfo/low confidence when inputs are missing', () => {
    const result = computeUnderwriting({}, {});
    const o = result.outputs;

    expect(o.workflow_state).toBe('NeedsInfo');
    expect(o.confidence_grade).toBe('C');
    expect(o.primary_offer).toBeNull();
  });

  it('clamps MAO to the lowest of presentation, cap, and buyer ceiling', () => {
    const deal = {
      market: { aiv: 250000, arv: 300000, dom_zip: 30 },
      debt: { payoff: 100000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: {
        list_commission_pct: 0,
        concessions_pct: 0,
        sell_close_pct: 0,
      },
      floorsSpreads: {
        wholesale_target_margin_pct: 0.1,
        investor_floor_discount_p20_pct: 0.2,
        investor_floor_discount_typical_pct: 0.1,
        retained_equity_pct: 0.05,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    // aivCap = 225k, buyer ceiling = 270k, presentation floor = 225k
    expect(o.mao_cap_wholesale).toBe(225000);
    expect(o.buyer_ceiling).toBe(270000);
    expect(o.mao_wholesale).toBe(225000);
    expect(o.primary_offer).toBe(225000);
  });

  it('computes investor floor and payoff+essentials for respect floor', () => {
    const deal = {
      market: { aiv: 300000, arv: 320000, dom_zip: 45, zip_percentile: 15 },
      debt: { payoff: 180000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.95 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0.15,
        investor_floor_discount_p20_pct: 0.22,
        investor_floor_discount_typical_pct: 0.12,
        retained_equity_pct: 0.05,
        move_out_cash_default: 4000,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    // P20 ZIP so use 22% discount
    expect(o.floor_investor).toBe(234000);
    // Payoff + essentials = 180k + (300k * 5%) + 4k = 199k
    expect(o.payoff_plus_essentials).toBe(199000);
    // Respect floor = max(234k, 199k) = 234k
    expect(o.respect_floor).toBe(234000);
    const rfTrace = (result.trace as any[]).find((t) => t.rule === 'RESPECT_FLOOR');
    expect(rfTrace?.details?.respect_floor).toBe(234000);
  });

  it('falls back and records infoNeeded when floor inputs are missing', () => {
    const result = computeUnderwriting({ market: { arv: 200000 } }, {});
    const o = result.outputs;
    expect(o.respect_floor).toBeNull();
    expect(result.infoNeeded.length).toBeGreaterThan(0);
  });

  it('applies ARV-band min spread ladder and cash gate', () => {
    const deal = {
      market: { aiv: 180000, arv: 180000, dom_zip: 30 },
      debt: { payoff: 99000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0,
        investor_floor_discount_p20_pct: 0.4,
        investor_floor_discount_typical_pct: 0.4,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.respect_floor).toBe(108000);
    expect(o.primary_offer).toBe(108000);
    expect(o.spread_cash).toBe(9000);
    expect(o.min_spread_required).toBe(15000); // <=200k band
    expect(o.cash_gate_status).toBe('shortfall');
    expect(o.cash_deficit).toBe(1000);
    const cgTrace = (result.trace as any[]).find((t) => t.rule === 'CASH_GATE');
    expect(cgTrace?.details?.cash_gate_status).toBe('shortfall');
  });

  it('uses policy-driven spread ladder, cash gate, and borderline band', () => {
    const deal = {
      market: { aiv: 180000, arv: 180000, dom_zip: 30 },
      debt: { payoff: 99000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      workflow: {
        cashPresentationGateMinimumSpreadOverPayoff: 20000,
        analystReviewTriggerBorderlineBandThreshold: 10000,
      },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0,
        investor_floor_discount_p20_pct: 0.4,
        investor_floor_discount_typical_pct: 0.4,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
        min_spread_by_arv_band: [{ id: 1, bandName: 'Custom', maxArv: 200000, minSpread: 25000 }],
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.min_spread_required).toBe(25000);
    expect(o.cash_gate_status).toBe('shortfall');
    expect(o.cash_deficit).toBe(11000);
    expect(o.borderline_flag).toBe(false);

    const ladderTrace = (result.trace as any[]).find((t) => t.rule === 'SPREAD_LADDER');
    expect(ladderTrace?.details?.min_spread_required).toBe(25000);
    expect(ladderTrace?.details?.cash_gate_min).toBe(20000);
  });

  it('computes min spread ladder for upper bands', () => {
    const deal = {
      market: { aiv: 800000, arv: 800000, dom_zip: 30 },
      debt: { payoff: 500000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0,
        investor_floor_discount_p20_pct: 0.4,
        investor_floor_discount_typical_pct: 0.4,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.min_spread_required).toBe(32000); // max(30k, 4% of 800k)
  });

  it('sets borderline when spread is within band or confidence is C', () => {
    const deal = {
      market: { aiv: 180000, arv: 180000, dom_zip: 30 },
      debt: { payoff: 93000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0,
        investor_floor_discount_p20_pct: 0.4,
        investor_floor_discount_typical_pct: 0.4,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const o = result.outputs;

    expect(o.borderline_flag).toBe(true); // spread within band

    const lowConf = computeUnderwriting({ market: { aiv: 0 } }, {});
    expect(lowConf.outputs.borderline_flag).toBe(true);

    const blTrace = (result.trace as any[]).find((t) => t.rule === 'BORDERLINE');
    expect(blTrace?.details?.borderline_flag).toBe(true);
  });

  it('uses policy-driven hold costs for buyer ceiling when bills are missing', () => {
    const deal = {
      market: { aiv: 200000, arv: 200000, dom_zip: 30 },
      debt: { payoff: 100000 },
      costs: { repairs_base: 0 },
    };
    const basePolicy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 12 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0.1,
        investor_floor_discount_p20_pct: 0.2,
        investor_floor_discount_typical_pct: 0.2,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
      },
    };

    const lowHold = computeUnderwriting(deal, {
      ...basePolicy,
      holdCostsWholesaleMonthlyPctOfArvDefault: 1.0, // 1% per month -> 0.01
    });
    const highHold = computeUnderwriting(deal, {
      ...basePolicy,
      holdCostsWholesaleMonthlyPctOfArvDefault: 2.0, // 2% per month -> 0.02
    });

    expect(lowHold.outputs.buyer_ceiling).toBeGreaterThan(highHold.outputs.buyer_ceiling);

    const holdTrace = (highHold.trace as any[]).find((t) => t.rule === 'HOLD_COST_POLICY');
    expect(holdTrace?.details?.pct_of_arv).toBeCloseTo(0.02, 5);
    expect(holdTrace?.details?.hold_cost_per_month).toBeGreaterThan(0);
  });

  it('applies AIV cap override rules and falls back when evidence is missing', () => {
    const deal = {
      market: { aiv: 200000, arv: 220000, dom_zip: 20, moi_zip: 2 },
      debt: { payoff: 100000 },
      status: { insurability: 'bindable', insurance_bindable: true },
      title: { status: 'clear', quote_present: true },
      approvals: { aiv_cap_override_role: 'VP', aiv_cap_override_reason: 'ok' },
    };
    const basePolicy = {
      aiv: { safety_cap_pct: 0.97, safety_cap_override_pct: 0.99 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0,
        investor_floor_discount_p20_pct: 0.2,
        investor_floor_discount_typical_pct: 0.2,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
      },
      aivCapOverrideApprovalRole: 'VP',
      aivCapOverrideConditionBindableInsuranceRequired: true,
      aivCapOverrideConditionClearTitleQuoteRequired: true,
      aivCapOverrideConditionFastZipLiquidityRequired: true,
      aivCapEvidenceVpApprovalLoggingRequirement: true,
    };

    const allowed = computeUnderwriting(deal, basePolicy);
    const allowedTrace = (allowed.trace as any[]).find((t) => t.rule === 'AIV_SAFETY_CAP');
    expect(allowedTrace?.details?.cap_pct_used ?? allowedTrace?.details?.cap_pct).toBeCloseTo(0.99, 5);
    expect(allowed.outputs.mao_cap_wholesale).toBeCloseTo(198000, 0);

    const blocked = computeUnderwriting(
      { ...deal, status: { insurability: 'unknown' }, title: { status: 'pending' } },
      basePolicy,
    );
    const blockedTrace = (blocked.trace as any[]).find((t) => t.rule === 'AIV_SAFETY_CAP');
    expect(blockedTrace?.details?.cap_pct_used ?? blockedTrace?.details?.cap_pct).toBeCloseTo(0.97, 5);
  });
});
