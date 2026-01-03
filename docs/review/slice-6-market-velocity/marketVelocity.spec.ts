/**
 * Unit Tests for Market Velocity Metrics
 *
 * @module __tests__/marketVelocity.spec
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  computeMarketVelocity,
  validateMarketVelocityInput,
  validateMarketVelocityPolicy,
  estimateDaysToSell,
  shouldFavorQuickExit,
  suggestCarryMonths,
  recommendDispositionStrategy,
  DEFAULT_MARKET_VELOCITY_POLICY,
  type MarketVelocityInput,
  type MarketVelocityPolicy,
} from "../slices/marketVelocity";

describe("computeMarketVelocity", () => {
  let policy: MarketVelocityPolicy;

  beforeEach(() => {
    policy = { ...DEFAULT_MARKET_VELOCITY_POLICY };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VELOCITY BAND CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Velocity Band Classification", () => {
    it("should classify as 'hot' when DOM <=14 and MOI <=2", () => {
      const input: MarketVelocityInput = {
        domZipDays: 10,
        moiZipMonths: 1.5,
        absorptionRate: 50,
        saleToListPct: 102,
        cashBuyerSharePct: 35,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("hot");
    });

    it("should classify as 'warm' when DOM <=30 and MOI <=4", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3.5,
        absorptionRate: 40,
        saleToListPct: 99,
        cashBuyerSharePct: 25,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("warm");
    });

    it("should classify as 'balanced' when DOM <=60 and MOI <=6", () => {
      const input: MarketVelocityInput = {
        domZipDays: 45,
        moiZipMonths: 5,
        absorptionRate: 30,
        saleToListPct: 97,
        cashBuyerSharePct: 20,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("balanced");
    });

    it("should classify as 'cool' when DOM <=90 and MOI <=9", () => {
      const input: MarketVelocityInput = {
        domZipDays: 75,
        moiZipMonths: 8,
        absorptionRate: 20,
        saleToListPct: 94,
        cashBuyerSharePct: 15,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("cool");
    });

    it("should classify as 'cold' when DOM >90 or MOI >9", () => {
      const input: MarketVelocityInput = {
        domZipDays: 120,
        moiZipMonths: 12,
        absorptionRate: 10,
        saleToListPct: 90,
        cashBuyerSharePct: 10,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("cold");
    });

    it("should take more conservative band when DOM and MOI disagree", () => {
      const input: MarketVelocityInput = {
        domZipDays: 10, // Hot (<=14)
        moiZipMonths: 5, // Balanced (<=6)
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      // Should take balanced (more conservative than hot)
      expect(result.marketVelocity.velocity_band).toBe("balanced");
    });

    it("should explain band selection in trace when DOM is slower", () => {
      const input: MarketVelocityInput = {
        domZipDays: 75, // Cool
        moiZipMonths: 3, // Warm
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const evaluation = details.velocity_evaluation as Record<string, string>;

      expect(result.marketVelocity.velocity_band).toBe("cool");
      expect(evaluation.band_selection_reason).toContain("DOM");
      expect(evaluation.band_selection_reason).toContain("slower");
    });

    it("should explain band selection in trace when MOI is slower", () => {
      const input: MarketVelocityInput = {
        domZipDays: 10, // Hot
        moiZipMonths: 5, // Balanced
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const evaluation = details.velocity_evaluation as Record<string, string>;

      expect(evaluation.band_selection_reason).toContain("MOI");
      expect(evaluation.band_selection_reason).toContain("slower");
    });

    it("should note when both metrics agree", () => {
      const input: MarketVelocityInput = {
        domZipDays: 10,
        moiZipMonths: 1.5,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const evaluation = details.velocity_evaluation as Record<string, string>;

      expect(evaluation.band_selection_reason).toContain("Both");
      expect(evaluation.band_selection_reason).toContain("hot");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIQUIDITY SCORE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Liquidity Score Calculation", () => {
    it("should calculate 100 liquidity score for ideal inputs", () => {
      const input: MarketVelocityInput = {
        domZipDays: 14, // Ideal
        moiZipMonths: 2, // Ideal
        absorptionRate: 50,
        saleToListPct: 100,
        cashBuyerSharePct: 30, // Ideal
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.liquidity_score).toBe(100);
    });

    it("should decrease liquidity score as DOM increases", () => {
      const ideal: MarketVelocityInput = {
        domZipDays: 14,
        moiZipMonths: 2,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 30,
      };

      const worse: MarketVelocityInput = {
        ...ideal,
        domZipDays: 44, // 30 days over ideal
      };

      const idealResult = computeMarketVelocity(ideal, policy);
      const worseResult = computeMarketVelocity(worse, policy);

      expect(worseResult.marketVelocity.liquidity_score).toBeLessThan(
        idealResult.marketVelocity.liquidity_score
      );
    });

    it("should decrease liquidity score as MOI increases", () => {
      const ideal: MarketVelocityInput = {
        domZipDays: 14,
        moiZipMonths: 2,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 30,
      };

      const worse: MarketVelocityInput = {
        ...ideal,
        moiZipMonths: 6, // 4 months over ideal
      };

      const idealResult = computeMarketVelocity(ideal, policy);
      const worseResult = computeMarketVelocity(worse, policy);

      expect(worseResult.marketVelocity.liquidity_score).toBeLessThan(
        idealResult.marketVelocity.liquidity_score
      );
    });

    it("should use neutral score when cash buyer share is null", () => {
      const input: MarketVelocityInput = {
        domZipDays: 14,
        moiZipMonths: 2,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const liquidity = details.liquidity_calculation as Record<string, number>;

      // Cash buyer component should be 50 (neutral)
      expect(liquidity.cash_buyer_score_component).toBe(50);
    });

    it("should clamp liquidity score between 0 and 100", () => {
      const terrible: MarketVelocityInput = {
        domZipDays: 200,
        moiZipMonths: 20,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 0,
      };

      const result = computeMarketVelocity(terrible, policy);

      expect(result.marketVelocity.liquidity_score).toBeGreaterThanOrEqual(0);
      expect(result.marketVelocity.liquidity_score).toBeLessThanOrEqual(100);
    });

    it("should apply correct weights to liquidity components", () => {
      // With ideal DOM and MOI but 0% cash buyers
      const input: MarketVelocityInput = {
        domZipDays: 14, // 100 score * 0.4 = 40
        moiZipMonths: 2, // 100 score * 0.4 = 40
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 0, // 0 score * 0.2 = 0
      };

      const result = computeMarketVelocity(input, policy);

      // Total: 40 + 40 + 0 = 80
      expect(result.marketVelocity.liquidity_score).toBe(80);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET CONDITION CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Market Condition Classification", () => {
    it("should classify as sellers_market when sale-to-list >=100%", () => {
      const input: MarketVelocityInput = {
        domZipDays: 20,
        moiZipMonths: 3,
        absorptionRate: 40,
        saleToListPct: 102,
        cashBuyerSharePct: 25,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketCondition).toBe("sellers_market");
    });

    it("should classify as buyers_market when sale-to-list <95%", () => {
      const input: MarketVelocityInput = {
        domZipDays: 60,
        moiZipMonths: 7,
        absorptionRate: 20,
        saleToListPct: 92,
        cashBuyerSharePct: 15,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketCondition).toBe("buyers_market");
    });

    it("should classify as balanced_market when sale-to-list is 95-99%", () => {
      const input: MarketVelocityInput = {
        domZipDays: 40,
        moiZipMonths: 5,
        absorptionRate: 30,
        saleToListPct: 97,
        cashBuyerSharePct: 20,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketCondition).toBe("balanced_market");
    });

    it("should classify as unknown when sale-to-list is null", () => {
      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketCondition).toBe("unknown");
    });

    it("should classify exactly 100% as sellers_market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: null,
        saleToListPct: 100,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketCondition).toBe("sellers_market");
    });

    it("should classify exactly 95% as balanced_market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: null,
        saleToListPct: 95,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketCondition).toBe("balanced_market");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLD TIME MULTIPLIER
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Hold Time Multiplier", () => {
    it("should return 0.75 for hot market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 10,
        moiZipMonths: 1.5,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.holdTimeMultiplier).toBe(0.75);
    });

    it("should return 1.0 for warm market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.holdTimeMultiplier).toBe(1.0);
    });

    it("should return 1.25 for balanced market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 45,
        moiZipMonths: 5,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.holdTimeMultiplier).toBe(1.25);
    });

    it("should return 1.5 for cool market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 75,
        moiZipMonths: 8,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.holdTimeMultiplier).toBe(1.5);
    });

    it("should return 2.0 for cold market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 120,
        moiZipMonths: 12,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.holdTimeMultiplier).toBe(2.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // URGENCY SIGNAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Urgency Signal", () => {
    it("should return 'high' for hot market", () => {
      const input: MarketVelocityInput = {
        domZipDays: 10,
        moiZipMonths: 1.5,
        absorptionRate: 50,
        saleToListPct: 102,
        cashBuyerSharePct: 35,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.urgencySignal).toBe("high");
    });

    it("should return 'high' for very high liquidity score (>=80)", () => {
      const input: MarketVelocityInput = {
        domZipDays: 14,
        moiZipMonths: 2,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 35,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.liquidity_score).toBeGreaterThanOrEqual(80);
      expect(result.urgencySignal).toBe("high");
    });

    it("should return 'low' for cold market with low liquidity", () => {
      const input: MarketVelocityInput = {
        domZipDays: 150,
        moiZipMonths: 15,
        absorptionRate: 5,
        saleToListPct: 88,
        cashBuyerSharePct: 5,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.urgencySignal).toBe("low");
    });

    it("should return 'medium' for balanced conditions", () => {
      const input: MarketVelocityInput = {
        domZipDays: 45,
        moiZipMonths: 5,
        absorptionRate: 25,
        saleToListPct: 96,
        cashBuyerSharePct: 20,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.urgencySignal).toBe("medium");
    });

    it("should return 'low' for cool market with low liquidity", () => {
      const input: MarketVelocityInput = {
        domZipDays: 80,
        moiZipMonths: 8,
        absorptionRate: 15,
        saleToListPct: 93,
        cashBuyerSharePct: 10,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.urgencySignal).toBe("low");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACE FRAME EMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Trace Frame Emission", () => {
    it("should emit MARKET_VELOCITY trace entry", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: 40,
        saleToListPct: 98,
        cashBuyerSharePct: 25,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.traceEntry.rule).toBe("MARKET_VELOCITY");
    });

    it("should include all input values in trace", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: 40,
        saleToListPct: 98,
        cashBuyerSharePct: 25,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const inputs = details.inputs as Record<string, number | null>;

      expect(inputs.dom_zip_days).toBe(25);
      expect(inputs.moi_zip_months).toBe(3);
      expect(inputs.absorption_rate).toBe(40);
    });

    it("should include liquidity calculation breakdown", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 25,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const liquidity = details.liquidity_calculation as Record<string, number>;

      expect(liquidity.dom_score_component).toBeDefined();
      expect(liquidity.moi_score_component).toBeDefined();
      expect(liquidity.cash_buyer_score_component).toBeDefined();
      expect(liquidity.raw_score).toBeDefined();
      expect(liquidity.final_score).toBeDefined();
    });

    it("should include policy values in trace", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const tracePolicy = details.policy as Record<string, unknown>;

      expect(tracePolicy.hot_max_dom).toBe(14);
      expect(tracePolicy.hot_max_moi).toBe(2);
    });

    it("should include used fields list", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.traceEntry.used).toContain("inputs.dom_zip_days");
      expect(result.traceEntry.used).toContain("inputs.moi_zip_months");
      expect(result.traceEntry.used).toContain("policy.velocity_thresholds");
    });

    it("should include velocity evaluation in trace", () => {
      const input: MarketVelocityInput = {
        domZipDays: 25,
        moiZipMonths: 3,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);
      const details = result.traceEntry.details as Record<string, unknown>;
      const evaluation = details.velocity_evaluation as Record<string, string>;

      expect(evaluation.dom_band).toBe("warm");
      expect(evaluation.moi_band).toBe("warm");
      expect(evaluation.combined_band).toBe("warm");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM POLICY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Custom Policy", () => {
    it("should respect custom DOM thresholds", () => {
      const customPolicy: MarketVelocityPolicy = {
        ...policy,
        hotMaxDom: 7, // Stricter
        warmMaxDom: 14,
      };

      const input: MarketVelocityInput = {
        domZipDays: 10, // Would be hot with default, warm with custom
        moiZipMonths: 1,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const resultDefault = computeMarketVelocity(input, policy);
      const resultCustom = computeMarketVelocity(input, customPolicy);

      expect(resultDefault.marketVelocity.velocity_band).toBe("hot");
      expect(resultCustom.marketVelocity.velocity_band).toBe("warm");
    });

    it("should respect custom MOI thresholds", () => {
      const customPolicy: MarketVelocityPolicy = {
        ...policy,
        hotMaxMoi: 1, // Stricter
        warmMaxMoi: 2,
      };

      const input: MarketVelocityInput = {
        domZipDays: 10,
        moiZipMonths: 1.5, // Would be hot with default, warm with custom
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const resultDefault = computeMarketVelocity(input, policy);
      const resultCustom = computeMarketVelocity(input, customPolicy);

      expect(resultDefault.marketVelocity.velocity_band).toBe("hot");
      expect(resultCustom.marketVelocity.velocity_band).toBe("warm");
    });

    it("should respect custom liquidity weights", () => {
      const customPolicy: MarketVelocityPolicy = {
        ...policy,
        liquidityDomWeight: 0.8,
        liquidityMoiWeight: 0.2,
        liquidityCashBuyerWeight: 0,
      };

      const input: MarketVelocityInput = {
        domZipDays: 14, // Ideal
        moiZipMonths: 10, // Terrible
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: 0,
      };

      const result = computeMarketVelocity(input, customPolicy);

      // With 80% weight on DOM (ideal), should have high liquidity despite bad MOI
      expect(result.marketVelocity.liquidity_score).toBeGreaterThan(70);
    });

    it("should respect custom sale-to-list thresholds", () => {
      const customPolicy: MarketVelocityPolicy = {
        ...policy,
        sellerMarketSaleToListPct: 102, // Stricter
        buyerMarketSaleToListPct: 98,
      };

      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: null,
        saleToListPct: 100, // Seller's market with default, balanced with custom
        cashBuyerSharePct: null,
      };

      const resultDefault = computeMarketVelocity(input, policy);
      const resultCustom = computeMarketVelocity(input, customPolicy);

      expect(resultDefault.marketCondition).toBe("sellers_market");
      expect(resultCustom.marketCondition).toBe("balanced_market");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Edge Cases", () => {
    it("should handle all null optional inputs", () => {
      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBeDefined();
      expect(result.marketVelocity.liquidity_score).toBeGreaterThan(0);
      expect(result.marketCondition).toBe("unknown");
    });

    it("should handle zero DOM and MOI", () => {
      const input: MarketVelocityInput = {
        domZipDays: 0,
        moiZipMonths: 0,
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("hot");
      expect(result.marketVelocity.liquidity_score).toBeGreaterThanOrEqual(90);
    });

    it("should preserve absorption_rate in output", () => {
      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: 42.5,
        saleToListPct: 98,
        cashBuyerSharePct: 22,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.absorption_rate).toBe(42.5);
    });

    it("should preserve sale_to_list_pct in output", () => {
      const input: MarketVelocityInput = {
        domZipDays: 30,
        moiZipMonths: 4,
        absorptionRate: null,
        saleToListPct: 98.5,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.sale_to_list_pct).toBe(98.5);
    });

    it("should handle exactly at threshold values", () => {
      const input: MarketVelocityInput = {
        domZipDays: 14, // Exactly at hot threshold
        moiZipMonths: 2, // Exactly at hot threshold
        absorptionRate: null,
        saleToListPct: null,
        cashBuyerSharePct: null,
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("hot");
    });

    it("should handle very large values gracefully", () => {
      const input: MarketVelocityInput = {
        domZipDays: 1000,
        moiZipMonths: 100,
        absorptionRate: 1,
        saleToListPct: 50,
        cashBuyerSharePct: 0, // 0% cash buyers
      };

      const result = computeMarketVelocity(input, policy);

      expect(result.marketVelocity.velocity_band).toBe("cold");
      // DOM: 100 - 986 = 0 (clamped), MOI: 100 - 980 = 0 (clamped), Cash: 0
      // Weighted: 0 * 0.4 + 0 * 0.4 + 0 * 0.2 = 0
      expect(result.marketVelocity.liquidity_score).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("validateMarketVelocityInput", () => {
  it("should return error for negative domZipDays", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: -1,
      moiZipMonths: 4,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: null,
    });
    expect(errors).toContain("domZipDays cannot be negative");
  });

  it("should return error for negative moiZipMonths", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: -1,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: null,
    });
    expect(errors).toContain("moiZipMonths cannot be negative");
  });

  it("should return error for negative absorptionRate", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: 4,
      absorptionRate: -1,
      saleToListPct: null,
      cashBuyerSharePct: null,
    });
    expect(errors).toContain("absorptionRate cannot be negative");
  });

  it("should return error for negative saleToListPct", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: 4,
      absorptionRate: null,
      saleToListPct: -1,
      cashBuyerSharePct: null,
    });
    expect(errors).toContain("saleToListPct cannot be negative");
  });

  it("should return error for cashBuyerSharePct > 100", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: 4,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 150,
    });
    expect(errors).toContain("cashBuyerSharePct must be between 0 and 100");
  });

  it("should return error for cashBuyerSharePct < 0", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: 4,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: -5,
    });
    expect(errors).toContain("cashBuyerSharePct must be between 0 and 100");
  });

  it("should return empty array for valid inputs", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: 4,
      absorptionRate: 40,
      saleToListPct: 98,
      cashBuyerSharePct: 25,
    });
    expect(errors).toHaveLength(0);
  });

  it("should allow null optional values", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: 30,
      moiZipMonths: 4,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: null,
    });
    expect(errors).toHaveLength(0);
  });

  it("should report multiple errors", () => {
    const errors = validateMarketVelocityInput({
      domZipDays: -1,
      moiZipMonths: -2,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: null,
    });
    expect(errors).toHaveLength(2);
  });
});

describe("validateMarketVelocityPolicy", () => {
  it("should return empty array for valid default policy", () => {
    const warnings = validateMarketVelocityPolicy(DEFAULT_MARKET_VELOCITY_POLICY);
    expect(warnings).toHaveLength(0);
  });

  it("should warn when liquidity weights do not sum to 1.0", () => {
    const badPolicy: MarketVelocityPolicy = {
      ...DEFAULT_MARKET_VELOCITY_POLICY,
      liquidityDomWeight: 0.5,
      liquidityMoiWeight: 0.5,
      liquidityCashBuyerWeight: 0.5, // Sum = 1.5
    };

    const warnings = validateMarketVelocityPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("sum to 1.0"))).toBe(true);
  });

  it("should warn for negative weights", () => {
    const badPolicy: MarketVelocityPolicy = {
      ...DEFAULT_MARKET_VELOCITY_POLICY,
      liquidityDomWeight: -0.1,
    };

    const warnings = validateMarketVelocityPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("negative"))).toBe(true);
  });

  it("should warn for out-of-order DOM thresholds", () => {
    const badPolicy: MarketVelocityPolicy = {
      ...DEFAULT_MARKET_VELOCITY_POLICY,
      hotMaxDom: 30,
      warmMaxDom: 14, // Out of order
    };

    const warnings = validateMarketVelocityPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("ascending order"))).toBe(true);
  });

  it("should warn for out-of-order MOI thresholds", () => {
    const badPolicy: MarketVelocityPolicy = {
      ...DEFAULT_MARKET_VELOCITY_POLICY,
      hotMaxMoi: 4,
      warmMaxMoi: 2, // Out of order
    };

    const warnings = validateMarketVelocityPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("ascending order"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("estimateDaysToSell", () => {
  it("should return 23 days for hot market (round(30 * 0.75))", () => {
    // 30 * 0.75 = 22.5, Math.round(22.5) = 23
    expect(estimateDaysToSell("hot", 30)).toBe(23);
  });

  it("should return 30 days for warm market (baseline)", () => {
    expect(estimateDaysToSell("warm", 30)).toBe(30);
  });

  it("should return 38 days for balanced market (30 * 1.25)", () => {
    expect(estimateDaysToSell("balanced", 30)).toBe(38);
  });

  it("should return 45 days for cool market (30 * 1.5)", () => {
    expect(estimateDaysToSell("cool", 30)).toBe(45);
  });

  it("should return 60 days for cold market (30 * 2.0)", () => {
    expect(estimateDaysToSell("cold", 30)).toBe(60);
  });

  it("should use custom baseline", () => {
    expect(estimateDaysToSell("warm", 45)).toBe(45);
  });

  it("should use default baseline of 30", () => {
    expect(estimateDaysToSell("warm")).toBe(30);
  });
});

describe("suggestCarryMonths", () => {
  it("should return 3 for hot market with baseline 3", () => {
    expect(suggestCarryMonths("hot", 3)).toBe(3); // ceil(3 * 0.75) = 3
  });

  it("should return 3 for warm market (baseline)", () => {
    expect(suggestCarryMonths("warm", 3)).toBe(3);
  });

  it("should return 4 for balanced market", () => {
    expect(suggestCarryMonths("balanced", 3)).toBe(4); // ceil(3 * 1.25) = 4
  });

  it("should return 5 for cool market", () => {
    expect(suggestCarryMonths("cool", 3)).toBe(5); // ceil(3 * 1.5) = 5
  });

  it("should return 6 for cold market", () => {
    expect(suggestCarryMonths("cold", 3)).toBe(6); // ceil(3 * 2.0) = 6
  });

  it("should use default baseline of 3", () => {
    expect(suggestCarryMonths("warm")).toBe(3);
  });
});

describe("shouldFavorQuickExit", () => {
  const policy = DEFAULT_MARKET_VELOCITY_POLICY;

  it("should return true for hot market with high liquidity", () => {
    const input: MarketVelocityInput = {
      domZipDays: 10,
      moiZipMonths: 1.5,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 30,
    };

    const result = computeMarketVelocity(input, policy);

    expect(shouldFavorQuickExit(result)).toBe(true);
  });

  it("should return true for warm market with high liquidity", () => {
    const input: MarketVelocityInput = {
      domZipDays: 25,
      moiZipMonths: 3,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 30,
    };

    const result = computeMarketVelocity(input, policy);

    expect(shouldFavorQuickExit(result)).toBe(true);
  });

  it("should return false for cold market", () => {
    const input: MarketVelocityInput = {
      domZipDays: 120,
      moiZipMonths: 12,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 10,
    };

    const result = computeMarketVelocity(input, policy);

    expect(shouldFavorQuickExit(result)).toBe(false);
  });

  it("should return false for balanced market (not hot/warm)", () => {
    const input: MarketVelocityInput = {
      domZipDays: 45, // Balanced range
      moiZipMonths: 5, // Balanced range
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 20,
    };

    const result = computeMarketVelocity(input, policy);

    // Balanced market returns false regardless of liquidity
    expect(result.marketVelocity.velocity_band).toBe("balanced");
    expect(shouldFavorQuickExit(result)).toBe(false);
  });
});

describe("recommendDispositionStrategy", () => {
  const policy = DEFAULT_MARKET_VELOCITY_POLICY;

  it("should recommend assignment for hot market with high liquidity", () => {
    const input: MarketVelocityInput = {
      domZipDays: 10,
      moiZipMonths: 1.5,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 30,
    };

    const result = computeMarketVelocity(input, policy);

    expect(recommendDispositionStrategy(result)).toBe("assignment");
  });

  it("should recommend double_close for warm market", () => {
    const input: MarketVelocityInput = {
      domZipDays: 25,
      moiZipMonths: 3,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 20,
    };

    const result = computeMarketVelocity(input, policy);

    expect(recommendDispositionStrategy(result)).toBe("double_close");
  });

  it("should recommend double_close for balanced market", () => {
    const input: MarketVelocityInput = {
      domZipDays: 45,
      moiZipMonths: 5,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 20,
    };

    const result = computeMarketVelocity(input, policy);

    expect(recommendDispositionStrategy(result)).toBe("double_close");
  });

  it("should recommend hold_for_appreciation for cold market with low liquidity", () => {
    const input: MarketVelocityInput = {
      domZipDays: 150,
      moiZipMonths: 15,
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 5,
    };

    const result = computeMarketVelocity(input, policy);

    expect(recommendDispositionStrategy(result)).toBe("hold_for_appreciation");
  });

  it("should recommend double_close for cool market with high liquidity (>=50)", () => {
    // This tests the intentional behavior: even in slower markets,
    // high liquidity signals buyer demand exists, so double_close is viable.
    // We use a custom policy that weights cash buyer share more heavily to
    // demonstrate this edge case where liquidity overrides band-based logic.
    const customPolicy: MarketVelocityPolicy = {
      ...DEFAULT_MARKET_VELOCITY_POLICY,
      liquidityDomWeight: 0.1,
      liquidityMoiWeight: 0.1,
      liquidityCashBuyerWeight: 0.8, // Cash buyer dominates liquidity score
    };

    const input: MarketVelocityInput = {
      domZipDays: 70, // Cool range (>60, <=90)
      moiZipMonths: 7, // Cool range (>6, <=9)
      absorptionRate: null,
      saleToListPct: null,
      cashBuyerSharePct: 70, // High cash buyer share to boost liquidity
    };

    const result = computeMarketVelocity(input, customPolicy);

    // Verify we're in cool band with liquidity >= 50
    expect(result.marketVelocity.velocity_band).toBe("cool");
    expect(result.marketVelocity.liquidity_score).toBeGreaterThanOrEqual(50);

    // Due to the OR condition (liquidity >= 50), double_close is recommended
    // This documents intentional behavior: liquidity indicates buyers exist
    expect(recommendDispositionStrategy(result)).toBe("double_close");
  });
});
