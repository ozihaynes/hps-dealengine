/**
 * Net Clearance Calculator Tests — V2.5 Wholesaler Dashboard
 *
 * Tests for Assignment, Double Close, and Wholetail clearance calculations.
 */
import { describe, it, expect } from "vitest";
import {
  computeNetClearance,
  validateNetClearanceInput,
  calculateBreakEvenPrices,
  DEFAULT_NET_CLEARANCE_POLICY,
  type NetClearanceInput,
  type NetClearancePolicy,
} from "../slices/netClearance";

/**
 * Helper to create a standard input with defaults
 */
function makeInput(
  overrides: Partial<NetClearanceInput> = {}
): NetClearanceInput {
  return {
    purchasePrice: 150000,
    maoWholesale: 175000,
    maoFlip: 190000,
    maoWholetail: null,
    arv: 250000,
    wholetailViable: false,
    ...overrides,
  };
}

describe("computeNetClearance", () => {
  const policy = DEFAULT_NET_CLEARANCE_POLICY;

  // ═══════════════════════════════════════════════════════════════
  // ASSIGNMENT CLEARANCE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("assignment clearance", () => {
    it("calculates assignment clearance correctly", () => {
      const input = makeInput();
      const { netClearance } = computeNetClearance(input, policy);

      // Gross = 175000 - 150000 = 25000
      // Costs = 500 (flat fee)
      // Net = 25000 - 500 = 24500
      expect(netClearance.assignment.gross).toBe(25000);
      expect(netClearance.assignment.costs).toBe(500);
      expect(netClearance.assignment.net).toBe(24500);
    });

    it("calculates assignment margin percentage", () => {
      const input = makeInput();
      const { netClearance } = computeNetClearance(input, policy);

      // Margin = (24500 / 25000) * 100 = 98%
      expect(netClearance.assignment.margin_pct).toBe(98);
    });

    it("uses percentage-based fee when configured", () => {
      const pctPolicy: NetClearancePolicy = {
        ...policy,
        assignmentUsePct: true,
        assignmentFeePct: 0.1, // 10%
      };

      const input = makeInput();
      const { netClearance } = computeNetClearance(input, pctPolicy);

      // Gross = 25000
      // Costs = 25000 * 0.10 = 2500
      // Net = 25000 - 2500 = 22500
      expect(netClearance.assignment.costs).toBe(2500);
      expect(netClearance.assignment.net).toBe(22500);
    });

    it("handles zero spread gracefully", () => {
      const input = makeInput({
        maoWholesale: 150000, // Same as purchase price
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.assignment.gross).toBe(0);
      expect(netClearance.assignment.net).toBe(0);
      expect(netClearance.assignment.margin_pct).toBe(0);
    });

    it("does not return negative net", () => {
      const input = makeInput({
        maoWholesale: 150100, // Only $100 spread
      });
      const { netClearance } = computeNetClearance(input, policy);

      // Gross = 100, Costs = 500 → would be -400
      // Should clamp to 0
      expect(netClearance.assignment.net).toBe(0);
    });

    it("includes cost breakdown in assignment", () => {
      const input = makeInput();
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.assignment.cost_breakdown?.title_fees).toBe(500);
    });

    it("does not produce negative fee on negative gross with percentage mode", () => {
      const pctPolicy: NetClearancePolicy = {
        ...policy,
        assignmentUsePct: true,
        assignmentFeePct: 0.1,
      };

      const input = makeInput({
        purchasePrice: 180000,
        maoWholesale: 160000, // Negative gross = -20000
      });
      const { netClearance } = computeNetClearance(input, pctPolicy);

      // Fee should be 0, not -2000
      expect(netClearance.assignment.costs).toBe(0);
      expect(netClearance.assignment.gross).toBe(-20000);
      expect(netClearance.assignment.net).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DOUBLE CLOSE CLEARANCE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("double close clearance", () => {
    it("calculates double close clearance with all costs", () => {
      const input = makeInput();
      const { netClearance } = computeNetClearance(input, policy);

      // Gross = 190000 - 150000 = 40000
      // Costs breakdown:
      // - Funding fee: 150000 * 0.02 = 3000
      // - Buy closing: 1500
      // - Sell closing: 2000
      // - Holding: 100 * 7 = 700
      // - Contingency: 500
      // Total costs = 7700
      // Net = 40000 - 7700 = 32300
      expect(netClearance.double_close.gross).toBe(40000);
      expect(netClearance.double_close.costs).toBe(7700);
      expect(netClearance.double_close.net).toBe(32300);
    });

    it("calculates DC margin percentage", () => {
      const input = makeInput();
      const { netClearance } = computeNetClearance(input, policy);

      // Margin = (32300 / 40000) * 100 = 80.75%
      expect(netClearance.double_close.margin_pct).toBe(80.75);
    });

    it("scales funding fee with purchase price", () => {
      const input1 = makeInput({
        purchasePrice: 100000,
        maoWholesale: 120000,
        maoFlip: 130000,
      });

      const input2 = makeInput({
        purchasePrice: 200000,
        maoWholesale: 220000,
        maoFlip: 230000,
      });

      const { traceEntry: trace1 } = computeNetClearance(input1, policy);
      const { traceEntry: trace2 } = computeNetClearance(input2, policy);

      const details1 = trace1.details as Record<string, unknown>;
      const details2 = trace2.details as Record<string, unknown>;
      const dc1 = details1.double_close as Record<string, unknown>;
      const dc2 = details2.double_close as Record<string, unknown>;
      const breakdown1 = dc1.costs_breakdown as Record<string, unknown>;
      const breakdown2 = dc2.costs_breakdown as Record<string, unknown>;

      // Funding fee should be 2% of purchase price
      expect(breakdown1.funding_fee).toBe(2000); // 100k * 2%
      expect(breakdown2.funding_fee).toBe(4000); // 200k * 2%
    });

    it("includes cost breakdown in double close", () => {
      const input = makeInput();
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.double_close.cost_breakdown?.title_fees).toBe(3500); // 1500 + 2000
      expect(netClearance.double_close.cost_breakdown?.closing_costs).toBe(3000); // funding fee
      expect(netClearance.double_close.cost_breakdown?.carry_costs).toBe(700); // 100 * 7
      expect(netClearance.double_close.cost_breakdown?.other).toBe(500); // contingency
    });

    it("handles zero flip MAO", () => {
      const input = makeInput({
        maoFlip: null,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.double_close.gross).toBe(-150000);
      expect(netClearance.double_close.net).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // WHOLETAIL CLEARANCE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("wholetail clearance", () => {
    it("calculates wholetail when viable and ARV meets threshold", () => {
      const input = makeInput({
        maoWholetail: 230000,
        arv: 280000,
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.wholetail).not.toBeNull();
      // Gross = 230000 - 150000 = 80000
      expect(netClearance.wholetail!.gross).toBe(80000);
    });

    it("includes all wholetail costs", () => {
      const input = makeInput({
        maoWholetail: 230000,
        arv: 280000,
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, policy);

      // Costs breakdown:
      // - Rehab: 15000
      // - Listing commission: 230000 * 0.03 = 6900
      // - Buyer commission: 230000 * 0.025 = 5750
      // - Closing: 3000
      // - Holding: 1500 * 3 = 4500
      // - Staging: 2000
      // Total = 37150
      const expectedTotalCosts = 15000 + 6900 + 5750 + 3000 + 4500 + 2000;
      expect(netClearance.wholetail!.costs).toBe(expectedTotalCosts);
    });

    it("returns null wholetail when not viable", () => {
      const input = makeInput({
        maoWholetail: 230000,
        arv: 280000,
        wholetailViable: false,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.wholetail).toBeNull();
    });

    it("returns null wholetail when ARV below threshold", () => {
      const input = makeInput({
        purchasePrice: 100000,
        maoWholetail: 145000,
        arv: 180000, // Below 200k threshold
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.wholetail).toBeNull();
    });

    it("excludes wholetail when margin below threshold", () => {
      const lowMarginPolicy: NetClearancePolicy = {
        ...policy,
        wholetailMinMarginPct: 50, // Require 50% margin
        wholetailMinArv: 100000,
      };

      const input = makeInput({
        purchasePrice: 180000,
        maoWholetail: 200000, // Very low margin
        arv: 220000,
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, lowMarginPolicy);

      expect(netClearance.wholetail).toBeNull();
    });

    it("includes cost breakdown in wholetail", () => {
      const input = makeInput({
        maoWholetail: 230000,
        arv: 280000,
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.wholetail!.cost_breakdown?.title_fees).toBe(3000); // closing
      expect(netClearance.wholetail!.cost_breakdown?.closing_costs).toBe(12650); // commissions
      expect(netClearance.wholetail!.cost_breakdown?.carry_costs).toBe(4500); // holding
      expect(netClearance.wholetail!.cost_breakdown?.other).toBe(17000); // rehab + staging
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RECOMMENDATION LOGIC TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("recommendation logic", () => {
    it("recommends assignment when it has highest net", () => {
      const input = makeInput({
        maoWholesale: 180000, // High wholesale
        maoFlip: 175000, // Lower flip (unusual but possible)
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.recommended_exit).toBe("assignment");
    });

    it("recommends double_close when it nets significantly more", () => {
      const input = makeInput({
        maoWholesale: 175000,
        maoFlip: 200000, // Much higher
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.recommended_exit).toBe("double_close");
      expect(netClearance.recommendation_reason).toContain("DC nets");
    });

    it("recommends wholetail when it has highest net", () => {
      const input = makeInput({
        maoWholesale: 170000,
        maoFlip: 180000,
        maoWholetail: 250000, // Much higher
        arv: 300000,
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.recommended_exit).toBe("wholetail");
      expect(netClearance.recommendation_reason).toContain("Wholetail nets");
    });

    it("prefers assignment when DC advantage is below threshold", () => {
      // Create scenario where assignment has higher net than DC
      const input = makeInput({
        purchasePrice: 150000,
        maoWholesale: 175000,
        maoFlip: 162000, // Low flip, DC costs eat into profit
      });
      const { netClearance } = computeNetClearance(input, policy);

      // Assignment net = 25000 - 500 = 24500
      // DC gross = 12000, costs = ~7700, net = ~4300
      // Assignment should be recommended
      expect(netClearance.recommended_exit).toBe("assignment");
    });

    it("overrides DC to assignment when DC advantage is below threshold", () => {
      // Scenario: DC would win, but its advantage is < $5000
      const input = makeInput({
        purchasePrice: 150000,
        maoWholesale: 178000, // Assignment gross = 28000, net = 27500
        maoFlip: 189000, // DC gross = 39000, costs ~7700, net ~31300
      });
      const { netClearance } = computeNetClearance(input, policy);

      // DC advantage = 31300 - 27500 = 3800 (< $5000 threshold)
      // Should override to assignment
      expect(netClearance.recommended_exit).toBe("assignment");
      expect(netClearance.recommendation_reason).toContain("Assignment preferred");
      expect(netClearance.recommendation_reason).toContain("threshold");
    });

    it("keeps DC recommendation when advantage exceeds threshold", () => {
      // Scenario: DC wins by more than $5000
      const input = makeInput({
        purchasePrice: 150000,
        maoWholesale: 165000, // Assignment gross = 15000, net = 14500
        maoFlip: 195000, // DC gross = 45000, costs ~7700, net ~37300
      });
      const { netClearance } = computeNetClearance(input, policy);

      // DC advantage = 37300 - 14500 = 22800 (> $5000 threshold)
      // Should NOT override - DC wins
      expect(netClearance.recommended_exit).toBe("double_close");
      expect(netClearance.recommendation_reason).toContain("DC nets");
    });

    it("does not override when assignment net is zero or negative", () => {
      // DC wins, advantage is small, but assignment is not viable
      const input = makeInput({
        purchasePrice: 150000,
        maoWholesale: 150300, // Assignment gross = 300, net clamped to 0 after fee
        maoFlip: 165000, // DC gross = 15000, net ~7300
      });
      const { netClearance } = computeNetClearance(input, policy);

      // Even though DC advantage is small, assignment is not viable
      // Should NOT override to assignment
      expect(netClearance.recommended_exit).toBe("double_close");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("trace entry emission", () => {
    it("emits NET_CLEARANCE trace frame", () => {
      const input = makeInput();
      const { traceEntry } = computeNetClearance(input, policy);

      expect(traceEntry.rule).toBe("NET_CLEARANCE");
    });

    it("includes input references", () => {
      const input = makeInput();
      const { traceEntry } = computeNetClearance(input, policy);

      expect(traceEntry.used).toContain("inputs.purchase_price");
      expect(traceEntry.used).toContain("outputs.mao_wholesale");
      expect(traceEntry.used).toContain("outputs.mao_flip");
    });

    it("includes cost breakdowns in trace", () => {
      const input = makeInput();
      const { traceEntry } = computeNetClearance(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const assignment = details.assignment as Record<string, unknown>;
      const breakdown = assignment.costs_breakdown as Record<string, unknown>;

      expect(breakdown.assignment_fee).toBe(500);
    });

    it("includes recommendation in trace", () => {
      const input = makeInput();
      const { traceEntry } = computeNetClearance(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const recommendation = details.recommendation as Record<string, unknown>;

      expect(recommendation.exit).toBeDefined();
      expect(recommendation.reason).toBeDefined();
      expect(recommendation.net_advantage).toBeDefined();
    });

    it("includes policy values in trace", () => {
      const input = makeInput();
      const { traceEntry } = computeNetClearance(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const policyValues = details.policy as Record<string, unknown>;

      expect(policyValues.dc_funding_fee_pct).toBe(0.02);
      expect(policyValues.dc_expected_hold_days).toBe(7);
      expect(policyValues.wholetail_hold_months).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CUSTOM POLICY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("custom policy handling", () => {
    it("respects custom DC funding fee", () => {
      const customPolicy: NetClearancePolicy = {
        ...policy,
        dcFundingFeePct: 0.03, // 3% instead of 2%
      };

      const input = makeInput({
        purchasePrice: 100000,
      });
      const { traceEntry } = computeNetClearance(input, customPolicy);

      const details = traceEntry.details as Record<string, unknown>;
      const dc = details.double_close as Record<string, unknown>;
      const breakdown = dc.costs_breakdown as Record<string, unknown>;

      // Funding fee should be 3% of 100k = 3000
      expect(breakdown.funding_fee).toBe(3000);
    });

    it("respects custom wholetail hold months", () => {
      const customPolicy: NetClearancePolicy = {
        ...policy,
        wholetailHoldMonths: 6,
        wholetailMinArv: 100000,
      };

      const input = makeInput({
        maoWholetail: 230000,
        arv: 280000,
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, customPolicy);

      // Holding cost should be 6 * 1500 = 9000 (not 4500)
      // Total costs will include higher holding
      expect(netClearance.wholetail!.cost_breakdown?.carry_costs).toBe(9000);
    });

    it("respects custom assignment fee", () => {
      const customPolicy: NetClearancePolicy = {
        ...policy,
        assignmentFeeFlat: 1000,
      };

      const input = makeInput();
      const { netClearance } = computeNetClearance(input, customPolicy);

      expect(netClearance.assignment.costs).toBe(1000);
      expect(netClearance.assignment.net).toBe(24000); // 25000 - 1000
    });

    it("respects custom DC preference threshold", () => {
      const customPolicy: NetClearancePolicy = {
        ...policy,
        dcPreferenceMarginThreshold: 50000, // Very high threshold
      };

      // DC nets slightly more but below threshold
      const input = makeInput({
        maoWholesale: 175000,
        maoFlip: 195000,
      });
      const { netClearance } = computeNetClearance(input, customPolicy);

      // DC advantage should still result in DC recommendation if it has higher net
      // But recommendation reason should reflect the threshold
      expect(netClearance.min_spread_threshold).toBe(50000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles null MAO values gracefully", () => {
      const input = makeInput({
        maoWholesale: null,
        maoFlip: null,
        maoWholetail: null,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.assignment.gross).toBe(-150000);
      expect(netClearance.assignment.net).toBe(0);
    });

    it("handles zero purchase price", () => {
      const input = makeInput({
        purchasePrice: 0,
        maoWholesale: 25000,
        maoFlip: 30000,
      });
      const { netClearance, traceEntry } = computeNetClearance(input, policy);

      expect(netClearance.assignment.gross).toBe(25000);

      // DC funding fee should be 0 (0 * 2%)
      const details = traceEntry.details as Record<string, unknown>;
      const dc = details.double_close as Record<string, unknown>;
      const breakdown = dc.costs_breakdown as Record<string, unknown>;
      expect(breakdown.funding_fee).toBe(0);
    });

    it("rounds currency values to 2 decimals", () => {
      const input = makeInput({
        maoWholesale: 175000.333,
        maoFlip: 190000.777,
      });
      const { netClearance } = computeNetClearance(input, policy);

      // Values should be rounded
      expect(netClearance.assignment.gross).toBe(25000.33);
    });

    it("handles very high purchase price (negative gross)", () => {
      const input = makeInput({
        purchasePrice: 200000,
        maoWholesale: 175000,
        maoFlip: 190000,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.assignment.gross).toBe(-25000);
      expect(netClearance.assignment.net).toBe(0);
      expect(netClearance.double_close.gross).toBe(-10000);
      expect(netClearance.double_close.net).toBe(0);
    });

    it("includes wholetail_viable flag in output", () => {
      const input = makeInput({
        wholetailViable: true,
      });
      const { netClearance } = computeNetClearance(input, policy);

      expect(netClearance.wholetail_viable).toBe(true);
    });
  });
});

describe("validateNetClearanceInput", () => {
  it("returns empty array for valid input", () => {
    const input = makeInput();
    const errors = validateNetClearanceInput(input);

    expect(errors).toHaveLength(0);
  });

  it("returns error for negative purchasePrice", () => {
    const input = makeInput({ purchasePrice: -1 });
    const errors = validateNetClearanceInput(input);

    expect(errors).toContain("purchasePrice cannot be negative");
  });

  it("returns error for negative arv", () => {
    const input = makeInput({ arv: -1 });
    const errors = validateNetClearanceInput(input);

    expect(errors).toContain("arv cannot be negative");
  });

  it("returns error for negative maoWholesale", () => {
    const input = makeInput({ maoWholesale: -1 });
    const errors = validateNetClearanceInput(input);

    expect(errors).toContain("maoWholesale cannot be negative");
  });

  it("returns error for negative maoFlip", () => {
    const input = makeInput({ maoFlip: -1 });
    const errors = validateNetClearanceInput(input);

    expect(errors).toContain("maoFlip cannot be negative");
  });

  it("returns error for negative maoWholetail", () => {
    const input = makeInput({ maoWholetail: -1 });
    const errors = validateNetClearanceInput(input);

    expect(errors).toContain("maoWholetail cannot be negative");
  });

  it("allows null MAO values without error", () => {
    const input = makeInput({
      maoWholesale: null,
      maoFlip: null,
      maoWholetail: null,
    });
    const errors = validateNetClearanceInput(input);

    expect(errors).toHaveLength(0);
  });

  it("returns multiple errors for multiple issues", () => {
    const input = makeInput({
      purchasePrice: -100,
      arv: -200,
      maoWholesale: -300,
    });
    const errors = validateNetClearanceInput(input);

    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("calculateBreakEvenPrices", () => {
  const policy = DEFAULT_NET_CLEARANCE_POLICY;

  it("calculates assignment break-even price", () => {
    const result = calculateBreakEvenPrices(policy, 175000, 190000);

    // Break-even = MAO - fee = 175000 - 500 = 174500
    expect(result.assignment).toBe(174500);
  });

  it("calculates DC break-even price", () => {
    const result = calculateBreakEvenPrices(policy, 175000, 190000);

    // Fixed costs = 1500 + 2000 + 700 + 500 = 4700
    // Break-even = (MAO - fixed) / (1 + funding%) = (190000 - 4700) / 1.02
    // = 185300 / 1.02 = 181666.67
    expect(result.doubleClose).toBeCloseTo(181666.67, 0);
  });

  it("handles different MAO values", () => {
    const result = calculateBreakEvenPrices(policy, 200000, 220000);

    expect(result.assignment).toBe(199500); // 200000 - 500
  });
});
