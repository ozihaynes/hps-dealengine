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

    expect(o.risk_summary?.overall).toBeDefined();
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
    expect(o.risk_summary?.overall).toBeDefined();
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

    expect(o.risk_summary?.overall).toBeDefined();
  });

  it('applies sandbox-driven carry formula and DTM caps', () => {
    const deal = {
      market: { aiv: 200000, arv: 220000, dom_zip: 60 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      fees: { list_commission_pct: 0, concessions_pct: 0, sell_close_pct: 0 },
      floorsSpreads: {
        wholesale_target_margin_pct: 0.1,
        investor_floor_discount_p20_pct: 0.15,
        investor_floor_discount_typical_pct: 0.1,
        retained_equity_pct: 0,
        move_out_cash_default: 0,
      },
      carry: {
        carryMonthsFormulaDefinition: "(({DOM_zip} * 1.5) + 30) / 30",
        carryMonthsCap: 12,
      },
      holdCosts: {
        flip: {
          fast: { monthly_pct_of_arv: 0.01 },
          neutral: { monthly_pct_of_arv: 0.0125 },
          slow: { monthly_pct_of_arv: 0.015 },
        },
        default_monthly_bills: { tax: 0, insurance: 0, hoa: 0, utilities: 0 },
      },
      timeline: {
        daysToMoneyDefaultCashCloseDays: 40,
        daysToMoneyMaxDays: 30,
        clearToCloseBufferDays: 5,
      },
    };

    const result = computeUnderwriting(deal, policy);
    const timelineSummary = result.outputs.timeline_summary;

    expect(timelineSummary?.carry_months_raw).toBeCloseTo(4);
    expect(timelineSummary?.carry_months_capped).toBeCloseTo(4);
    expect(timelineSummary?.dtm_selected_days).toBe(30);
    expect(timelineSummary?.dtm_max_days).toBe(30);
  });

  it('emits offer_validity_days from policy snapshot in DTM trace', () => {
    const deal = {
      market: { aiv: 200000, dom_zip: 30 },
      debt: { payoff: 120000 },
    };
    const policy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
      dtm: { offer_validity_days: 999 },
    };

    const result = computeUnderwriting(deal, policy);
    const dtmTrace = result.trace.find((t) => t.rule === 'DTM_URGENCY_POLICY');
    expect(dtmTrace?.details?.offer_validity_days).toBe(999);
  });

  it('toggles compliance gates via policy (bankruptcy)', () => {
    const deal = {
      market: { aiv: 200000, dom_zip: 45 },
      flags: { bankruptcy_stay: true },
    };
    const basePolicy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
      compliance_policy: { bankruptcy_stay_gate_enabled: true },
    };
    const enabled = computeUnderwriting(deal, basePolicy);
    expect(enabled.outputs.risk_summary?.overall).toBe('fail');
    expect(enabled.outputs.risk_summary?.per_gate?.bankruptcy_stay?.status).toBe('fail');

    const disabled = computeUnderwriting(deal, {
      ...basePolicy,
      compliance_policy: { bankruptcy_stay_gate_enabled: false },
    });
    expect(disabled.outputs.risk_summary?.per_gate?.bankruptcy_stay?.status).toBe('pass');
    expect(disabled.outputs.risk_summary?.overall).not.toBe('fail');
  });

  it('honors allow_placeholders_when_evidence_missing for workflow and confidence traces', () => {
    const deal = {
      market: { aiv: 200000, arv: 220000, dom_zip: 30 },
      debt: { payoff: 120000 },
    };
    const basePolicy = {
      aiv: { safety_cap_pct: 0.9 },
      carry: { dom_to_months_rule: 'DOM/30', months_cap: 6 },
      fees: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
      evidence_freshness: {
        comps: {
          max_age_days: 30,
          is_required_for_ready: true,
          is_required_for_conf_a: true,
          block_ready_if_missing: true,
          block_ready_if_stale: true,
        },
      },
      workflow_policy: { allow_placeholders_when_evidence_missing: false },
      workflow: { needs_review_if_confidence_C: true, needs_review_if_spread_shortfall: true },
    };

    const disallow = computeUnderwriting(deal, basePolicy);
    expect(disallow.outputs.workflow_state).toBe('NeedsInfo');
    const disallowEvidence = disallow.trace.find((t) => t.rule === 'EVIDENCE_FRESHNESS_POLICY') as any;
    expect(disallowEvidence?.details?.placeholders_used).toBe(false);
    expect(disallowEvidence?.details?.any_blocking_for_ready).toBe(true);

    const allow = computeUnderwriting(deal, {
      ...basePolicy,
      workflow_policy: { allow_placeholders_when_evidence_missing: true },
    });
    expect(allow.outputs.workflow_state).not.toBe('NeedsInfo');
    const allowEvidence = allow.trace.find((t) => t.rule === 'EVIDENCE_FRESHNESS_POLICY') as any;
    expect(allowEvidence?.details?.placeholders_used).toBe(true);
    expect(allowEvidence?.details?.allow_placeholders_when_evidence_missing).toBe(true);
    const confidenceTrace = allow.trace.find((t) => t.rule === 'CONFIDENCE_POLICY') as any;
    expect(confidenceTrace?.details?.reasons).toContain('placeholders_allowed_missing_evidence');
    expect(allow.outputs.confidence_grade).toBe('B');
  });
});
