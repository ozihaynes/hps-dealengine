/**
 * Price Geometry Computation Tests — V2.5 Wholesaler Dashboard
 *
 * Tests for ZOPA calculation, entry point derivation, and trace emission.
 */
import { describe, it, expect } from "vitest";
import {
  computePriceGeometry,
  validatePriceGeometryInput,
  DEFAULT_PRICE_GEOMETRY_POLICY,
  type PriceGeometryInput,
  type PriceGeometryPolicy,
} from "../slices/priceGeometry";

/**
 * Helper to create a standard input with defaults
 */
function makeInput(overrides: Partial<PriceGeometryInput> = {}): PriceGeometryInput {
  return {
    respectFloor: 150000,
    dominantFloor: "investor",
    floorInvestor: 150000,
    floorPayoff: 140000,
    buyerCeiling: 200000,
    sellerStrike: null,
    arv: 250000,
    posture: "base",
    ...overrides,
  };
}

describe("computePriceGeometry", () => {
  // ═══════════════════════════════════════════════════════════════
  // ZOPA CALCULATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("ZOPA calculation", () => {
    it("calculates ZOPA as ceiling minus floor when no seller strike", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBe(50000); // 200k - 150k
      expect(priceGeometry.zopa_exists).toBe(true);
    });

    it("calculates ZOPA as ceiling minus seller strike when strike > floor", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        sellerStrike: 175000,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBe(25000); // 200k - 175k
      expect(priceGeometry.zopa_exists).toBe(true);
    });

    it("uses respect floor when seller strike < floor", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        sellerStrike: 140000, // Below floor
      });
      const { priceGeometry } = computePriceGeometry(input);

      // Effective floor = max(140k, 150k) = 150k
      expect(priceGeometry.zopa).toBe(50000); // 200k - 150k
    });

    it("returns null ZOPA when ceiling < effective floor", () => {
      const input = makeInput({
        respectFloor: 200000,
        buyerCeiling: 180000, // Below floor
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBeNull();
      expect(priceGeometry.zopa_exists).toBe(false);
    });

    it("returns ZOPA exists false when ZOPA below threshold", () => {
      const input = makeInput({
        respectFloor: 197000,
        buyerCeiling: 200000, // Only 3k ZOPA, below 5k threshold
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBe(3000);
      expect(priceGeometry.zopa_exists).toBe(false); // Below $5k threshold
    });

    it("calculates ZOPA percentage of ARV", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        arv: 250000,
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_pct_of_arv).toBe(20); // 50k / 250k = 20%
    });

    it("returns null ZOPA percentage when ARV is zero", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        arv: 0,
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_pct_of_arv).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ZOPA BAND CLASSIFICATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("ZOPA band classification", () => {
    it("classifies wide ZOPA (>= 10% of ARV)", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        arv: 250000, // 50k ZOPA = 20% of ARV
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_band).toBe("wide");
    });

    it("classifies moderate ZOPA (5-10% of ARV)", () => {
      const input = makeInput({
        respectFloor: 175000,
        buyerCeiling: 200000,
        arv: 250000, // 25k ZOPA = 10% of ARV - boundary
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_band).toBe("wide"); // 10% is >= 10%

      const input2 = makeInput({
        respectFloor: 180000,
        buyerCeiling: 200000,
        arv: 250000, // 20k ZOPA = 8% of ARV
      });
      const { priceGeometry: pg2 } = computePriceGeometry(input2);
      expect(pg2.zopa_band).toBe("moderate");
    });

    it("classifies narrow ZOPA (< 5% of ARV)", () => {
      const input = makeInput({
        respectFloor: 190000,
        buyerCeiling: 200000,
        arv: 250000, // 10k ZOPA = 4% of ARV
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_band).toBe("narrow");
    });

    it("classifies none when no ZOPA", () => {
      const input = makeInput({
        respectFloor: 200000,
        buyerCeiling: 180000, // Negative ZOPA
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_band).toBe("none");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ENTRY POINT CALCULATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("entry point calculation", () => {
    it("calculates conservative entry point (25% into ZOPA)", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "conservative",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      // Floor + 25% of ZOPA = 150k + (50k * 0.25) = 162.5k
      expect(priceGeometry.entry_point).toBe(162500);
      expect(priceGeometry.entry_point_pct_of_zopa).toBe(25);
      expect(priceGeometry.entry_posture).toBe("conservative");
    });

    it("calculates base entry point (50% into ZOPA)", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "base",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      // Floor + 50% of ZOPA = 150k + (50k * 0.5) = 175k
      expect(priceGeometry.entry_point).toBe(175000);
      expect(priceGeometry.entry_point_pct_of_zopa).toBe(50);
      expect(priceGeometry.entry_posture).toBe("balanced"); // "base" maps to "balanced"
    });

    it("calculates aggressive entry point (75% into ZOPA)", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "aggressive",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      // Floor + 75% of ZOPA = 150k + (50k * 0.75) = 187.5k
      expect(priceGeometry.entry_point).toBe(187500);
      expect(priceGeometry.entry_point_pct_of_zopa).toBe(75);
      expect(priceGeometry.entry_posture).toBe("aggressive");
    });

    it("falls back to floor when no ZOPA exists", () => {
      const input = makeInput({
        respectFloor: 200000,
        buyerCeiling: 180000, // No ZOPA
        posture: "base",
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.entry_point).toBe(200000); // Falls back to floor
    });

    it("falls back to floor when ZOPA below threshold", () => {
      const input = makeInput({
        respectFloor: 197000,
        buyerCeiling: 200000, // Only 3k ZOPA
        posture: "base",
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.entry_point).toBe(197000); // Falls back to floor
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CUSTOM POLICY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("custom policy handling", () => {
    it("uses custom entry point percentages", () => {
      const customPolicy: PriceGeometryPolicy = {
        ...DEFAULT_PRICE_GEOMETRY_POLICY,
        entryPointPctBase: 0.6, // 60% instead of 50%
      };
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "base",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input, customPolicy);

      // Floor + 60% of ZOPA = 150k + (50k * 0.6) = 180k
      expect(priceGeometry.entry_point).toBe(180000);
    });

    it("uses custom ZOPA threshold", () => {
      const customPolicy: PriceGeometryPolicy = {
        ...DEFAULT_PRICE_GEOMETRY_POLICY,
        minZopaThreshold: 10000, // $10k instead of $5k
      };
      const input = makeInput({
        respectFloor: 193000,
        buyerCeiling: 200000, // 7k ZOPA
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input, customPolicy);

      expect(priceGeometry.zopa).toBe(7000);
      expect(priceGeometry.zopa_exists).toBe(false); // Below $10k threshold
    });

    it("handles zero entry point percentages", () => {
      const customPolicy: PriceGeometryPolicy = {
        ...DEFAULT_PRICE_GEOMETRY_POLICY,
        entryPointPctBase: 0, // 0% - at floor
      };
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "base",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input, customPolicy);

      expect(priceGeometry.entry_point).toBe(150000); // At floor
    });

    it("handles 100% entry point percentage", () => {
      const customPolicy: PriceGeometryPolicy = {
        ...DEFAULT_PRICE_GEOMETRY_POLICY,
        entryPointPctAggressive: 1.0, // 100% - at ceiling
      };
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "aggressive",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input, customPolicy);

      expect(priceGeometry.entry_point).toBe(200000); // At ceiling
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("trace entry emission", () => {
    it("emits trace entry with correct rule name", () => {
      const input = makeInput();
      const { traceEntry } = computePriceGeometry(input);

      expect(traceEntry.rule).toBe("PRICE_GEOMETRY");
    });

    it("emits trace entry with input references", () => {
      const input = makeInput();
      const { traceEntry } = computePriceGeometry(input);

      expect(traceEntry.used).toContain("outputs.respect_floor");
      expect(traceEntry.used).toContain("outputs.buyer_ceiling");
      expect(traceEntry.used).toContain("outputs.arv");
      expect(traceEntry.used).toContain("policy.posture");
    });

    it("includes inputs in trace details", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        posture: "conservative",
      });
      const { traceEntry } = computePriceGeometry(input);

      const details = traceEntry.details as Record<string, unknown>;
      const inputs = details.inputs as Record<string, unknown>;

      expect(inputs.respect_floor).toBe(150000);
      expect(inputs.buyer_ceiling).toBe(200000);
      expect(inputs.posture).toBe("conservative");
    });

    it("includes computation details in trace", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200000,
        sellerStrike: 175000,
      });
      const { traceEntry } = computePriceGeometry(input);

      const details = traceEntry.details as Record<string, unknown>;
      const computation = details.computation as Record<string, unknown>;

      expect(computation.effective_floor).toBe(175000); // max(strike, floor)
      expect(computation.zopa_exists).toBe(true);
    });

    it("includes outputs in trace details", () => {
      const input = makeInput();
      const { traceEntry } = computePriceGeometry(input);

      const details = traceEntry.details as Record<string, unknown>;
      const outputs = details.outputs as Record<string, unknown>;

      expect(outputs).toHaveProperty("zopa");
      expect(outputs).toHaveProperty("entry_point");
      expect(outputs).toHaveProperty("zopa_band");
    });

    it("includes policy values in trace", () => {
      const input = makeInput();
      const { traceEntry } = computePriceGeometry(input);

      const details = traceEntry.details as Record<string, unknown>;
      const policy = details.policy as Record<string, unknown>;

      expect(policy.min_zopa_threshold).toBe(5000);
      expect(policy.entry_point_pct_base).toBe(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FLOOR/CEILING PASS-THROUGH TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("floor and ceiling pass-through", () => {
    it("passes through all floor values", () => {
      const input = makeInput({
        respectFloor: 150000,
        dominantFloor: "payoff",
        floorInvestor: 145000,
        floorPayoff: 150000,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.respect_floor).toBe(150000);
      expect(priceGeometry.dominant_floor).toBe("payoff");
      expect(priceGeometry.floor_investor).toBe(145000);
      expect(priceGeometry.floor_payoff).toBe(150000);
    });

    it("passes through buyer ceiling", () => {
      const input = makeInput({ buyerCeiling: 225000 });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.buyer_ceiling).toBe(225000);
    });

    it("passes through seller strike", () => {
      const input = makeInput({ sellerStrike: 180000 });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.seller_strike).toBe(180000);
    });

    it("handles null floor components", () => {
      const input = makeInput({
        floorInvestor: null,
        floorPayoff: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.floor_investor).toBeNull();
      expect(priceGeometry.floor_payoff).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles zero floor", () => {
      const input = makeInput({
        respectFloor: 0,
        buyerCeiling: 100000,
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBe(100000);
      expect(priceGeometry.entry_point).toBe(50000); // 50% of 100k
    });

    it("handles equal floor and ceiling", () => {
      const input = makeInput({
        respectFloor: 175000,
        buyerCeiling: 175000,
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBeNull();
      expect(priceGeometry.zopa_exists).toBe(false);
      expect(priceGeometry.zopa_band).toBe("none");
    });

    it("handles very large values", () => {
      const input = makeInput({
        respectFloor: 10000000, // $10M
        buyerCeiling: 15000000, // $15M
        arv: 20000000, // $20M
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa).toBe(5000000); // $5M ZOPA
      expect(priceGeometry.zopa_pct_of_arv).toBe(25); // 25% of ARV
    });

    it("handles decimal ARV percentages", () => {
      const input = makeInput({
        respectFloor: 147500,
        buyerCeiling: 150000, // 2500 ZOPA
        arv: 200000,
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      expect(priceGeometry.zopa_pct_of_arv).toBe(1.25); // 2500/200000 = 1.25%
    });

    it("rounds entry point to 2 decimal places", () => {
      const input = makeInput({
        respectFloor: 150000,
        buyerCeiling: 200001, // Creates odd division
        posture: "base",
        sellerStrike: null,
      });
      const { priceGeometry } = computePriceGeometry(input);

      // Entry should be rounded
      expect(priceGeometry.entry_point).toBe(
        Number((150000 + 50001 * 0.5).toFixed(2))
      );
    });
  });
});

describe("validatePriceGeometryInput", () => {
  it("returns empty array for valid input", () => {
    const input = makeInput();
    const errors = validatePriceGeometryInput(input);

    expect(errors).toHaveLength(0);
  });

  it("returns error for negative respectFloor", () => {
    const input = makeInput({ respectFloor: -100 });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toContain("respectFloor cannot be negative");
  });

  it("returns error for negative buyerCeiling", () => {
    const input = makeInput({ buyerCeiling: -100 });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toContain("buyerCeiling cannot be negative");
  });

  it("returns error for negative arv", () => {
    const input = makeInput({ arv: -100 });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toContain("arv cannot be negative");
  });

  it("returns error for negative sellerStrike", () => {
    const input = makeInput({ sellerStrike: -100 });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toContain("sellerStrike cannot be negative");
  });

  it("returns error for negative floorInvestor", () => {
    const input = makeInput({ floorInvestor: -100 });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toContain("floorInvestor cannot be negative");
  });

  it("returns error for negative floorPayoff", () => {
    const input = makeInput({ floorPayoff: -100 });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toContain("floorPayoff cannot be negative");
  });

  it("allows null values without error", () => {
    const input = makeInput({
      sellerStrike: null,
      floorInvestor: null,
      floorPayoff: null,
    });
    const errors = validatePriceGeometryInput(input);

    expect(errors).toHaveLength(0);
  });

  it("returns multiple errors for multiple issues", () => {
    const input = makeInput({
      respectFloor: -100,
      buyerCeiling: -200,
      arv: -300,
    });
    const errors = validatePriceGeometryInput(input);

    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
