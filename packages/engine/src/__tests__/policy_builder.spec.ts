import { describe, expect, it } from "vitest";
import type { AnalyzeSandboxOptions } from "@hps-internal/contracts/src/analyze";
import { buildUnderwritingPolicyFromOptions } from "../policy_builder";
import type { UnderwritingPolicy } from "../compute_underwriting";

describe("buildUnderwritingPolicyFromOptions", () => {
  it("overlays sandbox options onto base policy", () => {
    const base: UnderwritingPolicy = {
      min_spread_by_arv_band: [
        { min_arv: 0, max_arv: 200000, min_spread_dollars: 10000 },
      ],
      cash_gate_min: 10000,
      borderline_band_width: 5000,
      aiv_cap_pct: 0.9,
      buyer_target_margin_wholesale_pct: 0.08,
      buyer_costs: { list_commission_pct: 0.06, concessions_pct: 0.02, sell_close_pct: 0.015 },
      investor_discount_p20_zip_pct: 0.03,
      investor_discount_typical_zip_pct: 0.025,
      retained_equity_pct: 0.05,
      move_out_cash_default: 0,
    };

    const sandboxOptions: AnalyzeSandboxOptions = {
      valuation: {
        aivSafetyCapPercentage: 0.92,
        arvHardMax: 450000,
      },
      floors: {
        floorInvestorAivDiscountP20Zip: 3,
        floorInvestorAivDiscountTypicalZip: 2.5,
        floorPayoffMinRetainedEquityPercentage: 5,
        floorPayoffMoveOutCashDefault: 1500,
      },
      carry: {
        carryMonthsMaximumCap: 7,
        carryMonthsFormulaDefinition: "{DOM_zip} * 1.1 / 30",
      },
      carryTimeline: {
        daysToMoneyMaxDays: 80,
        daysToMoneyDefaultCashCloseDays: 25,
      },
      profit_and_fees: {
        buyerTargetMarginFlipBaselinePolicy: 22,
        assignmentFeeTarget: 12000,
        assignmentFeeMaxPublicizedArvPercentage: 5,
        minSpreadByArvBand: [
          { bandName: "Base", maxArv: 400000, minSpread: 12000, minSpreadPct: 2 },
        ],
      },
      compliance_and_risk_gates: {
        bankruptcyStayGateLegalBlock: true,
      },
      workflow_and_guardrails: {
        analystReviewTriggerBorderlineBandThreshold: 6000,
        cashPresentationGateMinimumSpreadOverPayoff: 15000,
        assumptionsProtocolPlaceholdersWhenEvidenceMissing: true,
      },
      ux_policy: {
        bankersRoundingModeNumericSafety: "bankers",
        buyerCostsAllocationDualScenarioRenderingWhenUnknown: true,
        buyerCostsLineItemModelingMethod: "line_item",
      },
    };

    const result = buildUnderwritingPolicyFromOptions(base, sandboxOptions);

    expect(result.valuation?.aiv_safety_cap_pct).toBe(0.92);
    expect(result.valuation?.arv_hard_max).toBe(450000);
    expect(result.floors?.investor_aiv_discount_p20_zip).toBeCloseTo(0.03);
    expect(result.floors?.payoff_move_out_cash_default).toBe(1500);
    expect(result.carry_months_cap).toBe(7);
    expect(result.carry_formula_definition).toContain("DOM_zip");
    expect(result.dtm?.max_days_to_money).toBe(80);
    expect(result.dtm?.default_cash_close_days).toBe(25);
    expect(result.profit_policy?.assignment_fee?.target_dollars).toBe(12000);
    expect(result.profit_policy?.assignment_fee?.max_publicized_pct_of_arv).toBeCloseTo(0.05);
    expect(result.profit_policy?.flip_margin?.baseline_pct).toBeCloseTo(0.22);
    expect(result.min_spread_by_arv_band?.length).toBeGreaterThan(0);
    expect(result.compliance_policy?.bankruptcy_stay_gate_enabled).toBe(true);
    expect(result.workflow_policy?.analyst_review_borderline_threshold).toBe(6000);
    expect(result.workflow_policy?.cash_presentation_min_spread_over_payoff).toBe(15000);
    expect(result.ux_policy?.bankers_rounding_mode).toBe("bankers");
    expect(result.ux_policy?.buyer_costs_line_item_modeling_method).toBe("line_item");
  });
});
