/**
 * Portfolio Engine Unit Tests
 *
 * Comprehensive test suite for the underwriting engine utilities.
 * Tests cover verdict derivation, metrics computation, formatting,
 * and edge cases per the forensic-auditor skill.
 *
 * TEST CATEGORIES:
 * 1. deriveVerdict - All verdict rules and edge cases
 * 2. computeMetrics - Portfolio aggregation math
 * 3. groupByVerdict - Verdict grouping logic
 * 4. formatters - Currency, percent, time formatting
 * 5. Edge cases - Empty data, NaN, boundaries
 * 6. Determinism - Same inputs always produce same outputs
 *
 * @module __tests__/portfolio-utils.test
 * @version 1.0.0 (Slice 17 - Unit Tests)
 */

import { describe, it, expect, test } from "vitest";
import {
  deriveVerdict,
  computeMetrics,
  groupByVerdict,
  formatCurrency,
  formatPercent,
  formatTimeAgo,
  clampScore,
  extractNumber,
  DEFAULT_METRICS,
  type DealSummary,
  type VerdictType,
} from "../lib/engine/portfolio-utils";

// ═══════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

function createDeal(overrides: Partial<DealSummary> = {}): DealSummary {
  return {
    id: "test-deal-1",
    address: "123 Test St",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_run_at: "2024-01-01T00:00:00Z",
    closeability_index: 75,
    urgency_score: 50,
    risk_adjusted_spread: 25000,
    buyer_demand_index: 65,
    verdict: "HOLD",
    has_analysis: true,
    arv: 350000,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DERIVE VERDICT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("deriveVerdict", () => {
  describe("Rule 1: High urgency + Low closeability = PASS", () => {
    it("returns PASS when urgency >= 90 and closeability < 60", () => {
      expect(deriveVerdict(59, 90, 50000)).toBe("PASS");
      expect(deriveVerdict(50, 95, 40000)).toBe("PASS");
      expect(deriveVerdict(0, 100, 100000)).toBe("PASS");
    });

    it("does NOT apply when closeability >= 60 even with high urgency", () => {
      expect(deriveVerdict(60, 90, 50000)).not.toBe("PASS");
      expect(deriveVerdict(80, 95, 40000)).not.toBe("PASS");
    });

    it("does NOT apply when urgency < 90 even with low closeability", () => {
      // With urgency 89, closeability 50, spread 50000 -> should evaluate other rules
      // closeability 50 is >= 40, so should be HOLD
      expect(deriveVerdict(50, 89, 50000)).toBe("HOLD");
    });
  });

  describe("Rule 2: High closeability + Good spread = GO", () => {
    it("returns GO when closeability >= 80 and spread >= 30000", () => {
      expect(deriveVerdict(80, 50, 30000)).toBe("GO");
      expect(deriveVerdict(85, 60, 35000)).toBe("GO");
      expect(deriveVerdict(100, 0, 100000)).toBe("GO");
    });

    it("does NOT return GO when closeability < 80", () => {
      expect(deriveVerdict(79, 50, 50000)).not.toBe("GO");
    });

    it("does NOT return GO when spread < 30000", () => {
      expect(deriveVerdict(85, 50, 29999)).not.toBe("GO");
    });

    it("boundary: exactly 80 closeability and 30000 spread = GO", () => {
      expect(deriveVerdict(80, 50, 30000)).toBe("GO");
    });
  });

  describe("Rule 3: Medium closeability + Decent spread = PROCEED_WITH_CAUTION", () => {
    it("returns PROCEED_WITH_CAUTION when closeability >= 60 and spread >= 15000", () => {
      expect(deriveVerdict(60, 50, 15000)).toBe("PROCEED_WITH_CAUTION");
      expect(deriveVerdict(75, 40, 20000)).toBe("PROCEED_WITH_CAUTION");
      expect(deriveVerdict(79, 30, 29999)).toBe("PROCEED_WITH_CAUTION");
    });

    it("does NOT apply when already qualifies for GO", () => {
      // closeability 85 >= 80, spread 35000 >= 30000 -> GO takes precedence
      expect(deriveVerdict(85, 40, 35000)).toBe("GO");
    });

    it("boundary: exactly 60 closeability and 15000 spread", () => {
      expect(deriveVerdict(60, 50, 15000)).toBe("PROCEED_WITH_CAUTION");
    });
  });

  describe("Rule 4: Low-medium closeability = HOLD", () => {
    it("returns HOLD when closeability >= 40 (and no higher rule applies)", () => {
      expect(deriveVerdict(40, 50, 5000)).toBe("HOLD");
      expect(deriveVerdict(45, 60, 10000)).toBe("HOLD");
      expect(deriveVerdict(59, 50, 14999)).toBe("HOLD");
    });

    it("boundary: exactly 40 closeability", () => {
      expect(deriveVerdict(40, 50, 1000)).toBe("HOLD");
    });
  });

  describe("Rule 5: Default = PASS", () => {
    it("returns PASS when closeability < 40", () => {
      expect(deriveVerdict(39, 50, 50000)).toBe("PASS");
      expect(deriveVerdict(0, 0, 100000)).toBe("PASS");
      expect(deriveVerdict(30, 30, 30000)).toBe("PASS");
    });
  });

  describe("Edge cases", () => {
    it("handles zero values", () => {
      expect(deriveVerdict(0, 0, 0)).toBe("PASS");
    });

    it("handles maximum values", () => {
      expect(deriveVerdict(100, 100, 1000000)).toBe("GO");
    });

    it("handles negative values gracefully", () => {
      // Negative closeability < 40, so should be PASS
      expect(deriveVerdict(-10, 50, 50000)).toBe("PASS");
    });

    it("handles very large spread values", () => {
      expect(deriveVerdict(80, 50, Number.MAX_SAFE_INTEGER)).toBe("GO");
    });
  });

  describe("Determinism", () => {
    it("produces same output for same inputs on repeated calls", () => {
      const inputs: [number, number, number][] = [
        [75, 50, 25000],
        [85, 60, 35000],
        [50, 95, 40000],
        [40, 50, 5000],
      ];

      inputs.forEach(([c, u, s]) => {
        const result1 = deriveVerdict(c, u, s);
        const result2 = deriveVerdict(c, u, s);
        const result3 = deriveVerdict(c, u, s);
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE METRICS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("computeMetrics", () => {
  describe("Empty input", () => {
    it("returns DEFAULT_METRICS for empty array", () => {
      const result = computeMetrics([]);
      expect(result).toEqual(DEFAULT_METRICS);
    });
  });

  describe("Single deal", () => {
    it("computes correct metrics for single analyzed deal", () => {
      const deal = createDeal({
        verdict: "GO",
        status: "active",
        has_analysis: true,
        closeability_index: 80,
        urgency_score: 50,
        risk_adjusted_spread: 30000,
        arv: 350000,
      });

      const result = computeMetrics([deal]);

      expect(result.totalDeals).toBe(1);
      expect(result.analyzedDeals).toBe(1);
      expect(result.pendingDeals).toBe(0);
      expect(result.totalPipelineValue).toBe(350000);
      expect(result.totalSpreadOpportunity).toBe(30000);
      expect(result.avgCloseability).toBe(80);
      expect(result.avgUrgency).toBe(50);
      expect(result.byVerdict.GO).toBe(1);
      expect(result.byStatus.active).toBe(1);
    });

    it("handles deal without analysis", () => {
      const deal = createDeal({
        has_analysis: false,
        closeability_index: 0,
        urgency_score: 0,
        arv: null,
      });

      const result = computeMetrics([deal]);

      expect(result.totalDeals).toBe(1);
      expect(result.analyzedDeals).toBe(0);
      expect(result.pendingDeals).toBe(1);
      expect(result.avgCloseability).toBe(0); // No analyzed deals
      expect(result.avgUrgency).toBe(0);
    });
  });

  describe("Multiple deals", () => {
    it("computes correct totals and averages", () => {
      const deals = [
        createDeal({
          id: "1",
          verdict: "GO",
          status: "active",
          has_analysis: true,
          closeability_index: 80,
          urgency_score: 40,
          risk_adjusted_spread: 30000,
          arv: 350000,
        }),
        createDeal({
          id: "2",
          verdict: "HOLD",
          status: "under_contract",
          has_analysis: true,
          closeability_index: 60,
          urgency_score: 60,
          risk_adjusted_spread: 20000,
          arv: 250000,
        }),
        createDeal({
          id: "3",
          verdict: "PASS",
          status: "active",
          has_analysis: true,
          closeability_index: 30,
          urgency_score: 80,
          risk_adjusted_spread: 5000,
          arv: 150000,
        }),
      ];

      const result = computeMetrics(deals);

      expect(result.totalDeals).toBe(3);
      expect(result.analyzedDeals).toBe(3);
      expect(result.totalPipelineValue).toBe(750000); // 350k + 250k + 150k
      expect(result.totalSpreadOpportunity).toBe(55000); // 30k + 20k + 5k
      expect(result.avgCloseability).toBe(57); // Math.round((80 + 60 + 30) / 3)
      expect(result.avgUrgency).toBe(60); // Math.round((40 + 60 + 80) / 3)
      expect(result.byVerdict.GO).toBe(1);
      expect(result.byVerdict.HOLD).toBe(1);
      expect(result.byVerdict.PASS).toBe(1);
      expect(result.byStatus.active).toBe(2);
      expect(result.byStatus.under_contract).toBe(1);
    });

    it("handles mix of analyzed and pending deals", () => {
      const deals = [
        createDeal({ id: "1", has_analysis: true, closeability_index: 80 }),
        createDeal({ id: "2", has_analysis: false, closeability_index: 0 }),
        createDeal({ id: "3", has_analysis: true, closeability_index: 60 }),
      ];

      const result = computeMetrics(deals);

      expect(result.totalDeals).toBe(3);
      expect(result.analyzedDeals).toBe(2);
      expect(result.pendingDeals).toBe(1);
      // Average only counts analyzed deals
      expect(result.avgCloseability).toBe(70); // (80 + 60) / 2
    });
  });

  describe("Edge cases", () => {
    it("handles null ARV values", () => {
      const deals = [
        createDeal({ id: "1", arv: 350000 }),
        createDeal({ id: "2", arv: null }),
        createDeal({ id: "3", arv: 250000 }),
      ];

      const result = computeMetrics(deals);
      expect(result.totalPipelineValue).toBe(600000); // null treated as 0
    });

    it("handles all deals pending (no analysis)", () => {
      const deals = [
        createDeal({ id: "1", has_analysis: false }),
        createDeal({ id: "2", has_analysis: false }),
      ];

      const result = computeMetrics(deals);
      expect(result.avgCloseability).toBe(0);
      expect(result.avgUrgency).toBe(0);
    });

    it("handles zero spread values", () => {
      const deals = [
        createDeal({ id: "1", risk_adjusted_spread: 0 }),
        createDeal({ id: "2", risk_adjusted_spread: 0 }),
      ];

      const result = computeMetrics(deals);
      expect(result.totalSpreadOpportunity).toBe(0);
    });
  });

  describe("Determinism", () => {
    it("produces same output for same inputs", () => {
      const deals = [
        createDeal({ id: "1", closeability_index: 80, arv: 350000 }),
        createDeal({ id: "2", closeability_index: 60, arv: 250000 }),
      ];

      const result1 = computeMetrics(deals);
      const result2 = computeMetrics(deals);
      const result3 = computeMetrics(deals);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GROUP BY VERDICT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("groupByVerdict", () => {
  it("returns all 4 verdict groups even when empty", () => {
    const result = groupByVerdict([]);

    expect(result).toHaveLength(4);
    expect(result[0].verdict).toBe("GO");
    expect(result[1].verdict).toBe("PROCEED_WITH_CAUTION");
    expect(result[2].verdict).toBe("HOLD");
    expect(result[3].verdict).toBe("PASS");

    result.forEach((group) => {
      expect(group.count).toBe(0);
      expect(group.deals).toHaveLength(0);
      expect(group.totalSpread).toBe(0);
      expect(group.avgCloseability).toBe(0);
    });
  });

  it("groups deals correctly by verdict", () => {
    const deals = [
      createDeal({ id: "1", verdict: "GO", closeability_index: 85, risk_adjusted_spread: 35000 }),
      createDeal({ id: "2", verdict: "GO", closeability_index: 90, risk_adjusted_spread: 40000 }),
      createDeal({ id: "3", verdict: "HOLD", closeability_index: 50, risk_adjusted_spread: 10000 }),
    ];

    const result = groupByVerdict(deals);

    // GO group
    expect(result[0].count).toBe(2);
    expect(result[0].deals).toHaveLength(2);
    expect(result[0].totalSpread).toBe(75000);
    expect(result[0].avgCloseability).toBe(88); // Math.round((85 + 90) / 2)

    // PROCEED_WITH_CAUTION group
    expect(result[1].count).toBe(0);

    // HOLD group
    expect(result[2].count).toBe(1);
    expect(result[2].totalSpread).toBe(10000);
    expect(result[2].avgCloseability).toBe(50);

    // PASS group
    expect(result[3].count).toBe(0);
  });

  it("maintains order: GO, PROCEED_WITH_CAUTION, HOLD, PASS", () => {
    const deals = [
      createDeal({ id: "1", verdict: "PASS" }),
      createDeal({ id: "2", verdict: "GO" }),
      createDeal({ id: "3", verdict: "HOLD" }),
    ];

    const result = groupByVerdict(deals);
    const verdicts = result.map((g) => g.verdict);

    expect(verdicts).toEqual(["GO", "PROCEED_WITH_CAUTION", "HOLD", "PASS"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("formatCurrency", () => {
  describe("millions", () => {
    it("formats values >= 1M with M suffix", () => {
      expect(formatCurrency(1000000)).toBe("$1.0M");
      expect(formatCurrency(1500000)).toBe("$1.5M");
      expect(formatCurrency(2500000)).toBe("$2.5M");
      expect(formatCurrency(10000000)).toBe("$10.0M");
    });
  });

  describe("thousands", () => {
    it("formats values >= 1K with K suffix", () => {
      expect(formatCurrency(1000)).toBe("$1K");
      expect(formatCurrency(1500)).toBe("$2K"); // Rounds to nearest K
      expect(formatCurrency(25000)).toBe("$25K");
      expect(formatCurrency(999999)).toBe("$1000K");
    });
  });

  describe("small values", () => {
    it("formats values < 1K with full number", () => {
      expect(formatCurrency(500)).toBe("$500");
      expect(formatCurrency(999)).toBe("$999");
      expect(formatCurrency(0)).toBe("$0");
    });
  });

  describe("edge cases", () => {
    it("handles negative values", () => {
      expect(formatCurrency(-1000)).toBe("$-1K");
    });

    it("handles decimal values", () => {
      expect(formatCurrency(1500.5)).toBe("$2K");
    });
  });
});

describe("formatPercent", () => {
  it("formats whole numbers", () => {
    expect(formatPercent(75)).toBe("75%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
  });

  it("rounds decimal values", () => {
    expect(formatPercent(75.4)).toBe("75%");
    expect(formatPercent(75.5)).toBe("76%");
    expect(formatPercent(75.9)).toBe("76%");
  });

  it("handles values outside 0-100", () => {
    expect(formatPercent(-5)).toBe("-5%");
    expect(formatPercent(150)).toBe("150%");
  });
});

describe("formatTimeAgo", () => {
  // Note: These tests use fixed dates relative to "now"
  // In real tests, you'd mock Date.now() for determinism

  it("returns 'Just now' for very recent times", () => {
    const now = new Date();
    const result = formatTimeAgo(now.toISOString());
    expect(result).toBe("Just now");
  });

  it("returns hours for times < 24h ago", () => {
    const date = new Date();
    date.setHours(date.getHours() - 5);
    const result = formatTimeAgo(date.toISOString());
    expect(result).toBe("5h ago");
  });

  it("returns days for times < 7 days ago", () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    const result = formatTimeAgo(date.toISOString());
    expect(result).toBe("3d ago");
  });

  it("returns weeks for times < 30 days ago", () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    const result = formatTimeAgo(date.toISOString());
    expect(result).toBe("2w ago");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("clampScore", () => {
  it("returns value unchanged when within range", () => {
    expect(clampScore(50)).toBe(50);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(-100)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clampScore(110)).toBe(100);
    expect(clampScore(1000)).toBe(100);
  });

  it("handles decimal values", () => {
    expect(clampScore(50.5)).toBe(50.5);
    expect(clampScore(-0.1)).toBe(0);
    expect(clampScore(100.1)).toBe(100);
  });
});

describe("extractNumber", () => {
  it("extracts value from first matching key", () => {
    const data = { closeability_index: 80, closeability: 75 };
    expect(extractNumber(data, ["closeability_index", "closeability"])).toBe(80);
  });

  it("falls back to second key if first is missing", () => {
    const data = { closeability: 75 };
    expect(extractNumber(data, ["closeability_index", "closeability"])).toBe(75);
  });

  it("returns fallback if no keys match", () => {
    const data = { other_field: 50 };
    expect(extractNumber(data, ["closeability_index", "closeability"], 0)).toBe(0);
    expect(extractNumber(data, ["closeability_index"], 42)).toBe(42);
  });

  it("handles null and undefined data", () => {
    expect(extractNumber(null, ["key"], 0)).toBe(0);
    expect(extractNumber(undefined, ["key"], 10)).toBe(10);
  });

  it("handles non-numeric values", () => {
    const data = { key: "not a number" };
    expect(extractNumber(data, ["key"], 0)).toBe(0);
  });

  it("converts string numbers", () => {
    const data = { key: "42" };
    expect(extractNumber(data, ["key"], 0)).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION / SCENARIO TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Integration scenarios", () => {
  describe("Full portfolio workflow", () => {
    it("processes a realistic portfolio correctly", () => {
      const deals: DealSummary[] = [
        // GO deal: high closeability, good spread
        createDeal({
          id: "go-1",
          verdict: "GO",
          status: "active",
          has_analysis: true,
          closeability_index: 85,
          urgency_score: 40,
          risk_adjusted_spread: 45000,
          arv: 425000,
        }),
        // PROCEED_WITH_CAUTION deal
        createDeal({
          id: "pwc-1",
          verdict: "PROCEED_WITH_CAUTION",
          status: "active",
          has_analysis: true,
          closeability_index: 65,
          urgency_score: 55,
          risk_adjusted_spread: 22000,
          arv: 285000,
        }),
        // HOLD deal
        createDeal({
          id: "hold-1",
          verdict: "HOLD",
          status: "under_contract",
          has_analysis: true,
          closeability_index: 45,
          urgency_score: 30,
          risk_adjusted_spread: 12000,
          arv: 195000,
        }),
        // PASS deal: high urgency, low closeability
        createDeal({
          id: "pass-1",
          verdict: "PASS",
          status: "active",
          has_analysis: true,
          closeability_index: 35,
          urgency_score: 92,
          risk_adjusted_spread: 8000,
          arv: 165000,
        }),
        // Pending deal (no analysis)
        createDeal({
          id: "pending-1",
          verdict: "HOLD", // Default when no analysis
          status: "active",
          has_analysis: false,
          closeability_index: 0,
          urgency_score: 0,
          risk_adjusted_spread: 0,
          arv: null,
        }),
      ];

      const metrics = computeMetrics(deals);
      const groups = groupByVerdict(deals);

      // Verify totals
      expect(metrics.totalDeals).toBe(5);
      expect(metrics.analyzedDeals).toBe(4);
      expect(metrics.pendingDeals).toBe(1);

      // Verify pipeline value (only non-null ARVs)
      expect(metrics.totalPipelineValue).toBe(1070000); // 425k + 285k + 195k + 165k

      // Verify spread opportunity
      expect(metrics.totalSpreadOpportunity).toBe(87000); // 45k + 22k + 12k + 8k + 0

      // Verify averages (only analyzed deals)
      // (85 + 65 + 45 + 35) / 4 = 57.5 -> 58
      expect(metrics.avgCloseability).toBe(58);
      // (40 + 55 + 30 + 92) / 4 = 54.25 -> 54
      expect(metrics.avgUrgency).toBe(54);

      // Verify verdict counts
      expect(metrics.byVerdict.GO).toBe(1);
      expect(metrics.byVerdict.PROCEED_WITH_CAUTION).toBe(1);
      expect(metrics.byVerdict.HOLD).toBe(2); // Including pending
      expect(metrics.byVerdict.PASS).toBe(1);

      // Verify status counts
      expect(metrics.byStatus.active).toBe(4);
      expect(metrics.byStatus.under_contract).toBe(1);

      // Verify groups
      expect(groups[0].count).toBe(1); // GO
      expect(groups[0].avgCloseability).toBe(85);
      expect(groups[1].count).toBe(1); // PWC
      expect(groups[2].count).toBe(2); // HOLD
      expect(groups[3].count).toBe(1); // PASS
    });
  });

  describe("Verdict derivation matches expected behavior", () => {
    const testCases: { input: [number, number, number]; expected: VerdictType; label: string }[] = [
      { input: [85, 40, 35000], expected: "GO", label: "high closeability, good spread" },
      { input: [80, 50, 30000], expected: "GO", label: "boundary GO" },
      { input: [79, 50, 35000], expected: "PROCEED_WITH_CAUTION", label: "just under GO threshold" },
      { input: [65, 45, 18000], expected: "PROCEED_WITH_CAUTION", label: "medium metrics" },
      { input: [60, 50, 15000], expected: "PROCEED_WITH_CAUTION", label: "boundary PWC" },
      { input: [55, 50, 14000], expected: "HOLD", label: "below spread threshold" },
      { input: [45, 30, 5000], expected: "HOLD", label: "low-medium closeability" },
      { input: [40, 50, 1000], expected: "HOLD", label: "boundary HOLD" },
      { input: [35, 50, 50000], expected: "PASS", label: "low closeability despite good spread" },
      { input: [50, 95, 40000], expected: "PASS", label: "high urgency override" },
      { input: [59, 90, 100000], expected: "PASS", label: "urgent + low closeability" },
    ];

    test.each(testCases)("$label: $input -> $expected", ({ input, expected }) => {
      const [c, u, s] = input;
      expect(deriveVerdict(c, u, s)).toBe(expected);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRESS / BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Stress tests", () => {
  it("handles large number of deals", () => {
    const deals: DealSummary[] = Array.from({ length: 1000 }, (_, i) =>
      createDeal({
        id: `deal-${i}`,
        closeability_index: (i % 100),
        urgency_score: (i % 100),
        risk_adjusted_spread: i * 100,
        arv: (i + 1) * 10000,
        verdict: ["GO", "PROCEED_WITH_CAUTION", "HOLD", "PASS"][i % 4] as VerdictType,
      })
    );

    const metrics = computeMetrics(deals);
    const groups = groupByVerdict(deals);

    expect(metrics.totalDeals).toBe(1000);
    expect(groups.reduce((sum, g) => sum + g.count, 0)).toBe(1000);
  });

  it("handles NaN-like edge cases gracefully", () => {
    const deal = createDeal({
      closeability_index: Number.NaN,
      urgency_score: Number.POSITIVE_INFINITY,
      risk_adjusted_spread: Number.NEGATIVE_INFINITY,
    });

    // These shouldn't crash
    expect(() => computeMetrics([deal])).not.toThrow();
    expect(() => groupByVerdict([deal])).not.toThrow();
  });
});
