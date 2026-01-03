/**
 * Unit Tests for Comp Quality Scorer
 *
 * @module __tests__/compQuality.spec
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  computeCompQuality,
  validateCompQualityInput,
  calculateIdealCompCharacteristics,
  areCompsSufficient,
  DEFAULT_COMP_QUALITY_POLICY,
  type CompQualityInput,
  type CompQualityPolicy,
  type CompForScoring,
} from "../slices/compQuality";

describe("computeCompQuality", () => {
  let policy: CompQualityPolicy;

  // Helper to create ideal comps (close, recent, similar sqft)
  const idealComp = (
    overrides: Partial<CompForScoring> = {}
  ): CompForScoring => ({
    distance_miles: 0.3,
    age_days: 30,
    sqft: 1800,
    ...overrides,
  });

  beforeEach(() => {
    policy = { ...DEFAULT_COMP_QUALITY_POLICY };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFECT COMPS (NO PENALTIES)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Perfect Comps (No Penalties)", () => {
    it("should score 100 for perfect comps with 5+ count bonus", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp(),
          idealComp({ distance_miles: 0.4, age_days: 45 }),
          idealComp({ distance_miles: 0.2, age_days: 60 }),
          idealComp({ distance_miles: 0.5, age_days: 75 }),
          idealComp({ distance_miles: 0.3, age_days: 90 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // All comps within ideal thresholds = 100 each
      // 5 comps bonus = +10
      // Clamped to 100
      expect(compQuality.quality_score).toBe(100);
      expect(compQuality.quality_band).toBe("excellent");
    });

    it("should score 100 for 3 perfect comps (no penalty, no bonus)", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp(),
          idealComp({ distance_miles: 0.4 }),
          idealComp({ distance_miles: 0.5 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(100);
      expect(compQuality.quality_band).toBe("excellent");
    });

    it("should return correct comp count", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.comp_count).toBe(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTANCE PENALTIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Distance Penalties", () => {
    it("should apply distance penalty for comps over 0.5mi", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 1.5 }), // 1.0mi over -> 2 steps -> -10
          idealComp({ distance_miles: 1.5 }),
          idealComp({ distance_miles: 1.5 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100 - 10 = 90
      // Average: 90
      expect(compQuality.quality_score).toBe(90);
    });

    it("should cap distance penalty at max", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 10 }), // Way over -> max -30
          idealComp({ distance_miles: 10 }),
          idealComp({ distance_miles: 10 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100 - 30 = 70
      expect(compQuality.quality_score).toBe(70);
    });

    it("should calculate correct average distance", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 0.5 }),
          idealComp({ distance_miles: 1.0 }),
          idealComp({ distance_miles: 1.5 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.avg_distance_miles).toBe(1.0);
    });

    it("should calculate correct max distance", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 0.5 }),
          idealComp({ distance_miles: 1.0 }),
          idealComp({ distance_miles: 2.5 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.max_distance_miles).toBe(2.5);
    });

    it("should not penalize comps at exactly ideal distance", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 0.5 }), // Exactly at threshold
          idealComp({ distance_miles: 0.5 }),
          idealComp({ distance_miles: 0.5 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AGE PENALTIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Age Penalties", () => {
    it("should apply age penalty for comps over 90 days", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 150 }), // 60 days over -> 2 steps -> -10
          idealComp({ age_days: 150 }),
          idealComp({ age_days: 150 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100 - 10 = 90
      expect(compQuality.quality_score).toBe(90);
    });

    it("should cap age penalty at max", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 365 }), // Way over -> max -30
          idealComp({ age_days: 365 }),
          idealComp({ age_days: 365 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100 - 30 = 70
      expect(compQuality.quality_score).toBe(70);
    });

    it("should calculate correct average age", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 30 }),
          idealComp({ age_days: 60 }),
          idealComp({ age_days: 90 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.avg_age_days).toBe(60);
    });

    it("should calculate correct max age", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 30 }),
          idealComp({ age_days: 60 }),
          idealComp({ age_days: 180 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.max_age_days).toBe(180);
    });

    it("should not penalize comps at exactly ideal age", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 90 }), // Exactly at threshold
          idealComp({ age_days: 90 }),
          idealComp({ age_days: 90 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SQFT VARIANCE PENALTIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Sqft Variance Penalties", () => {
    it("should apply sqft penalty for variance over 10%", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ sqft: 2340 }), // 30% variance -> 2 steps -> -20
          idealComp({ sqft: 2340 }),
          idealComp({ sqft: 2340 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100 - 20 = 80
      expect(compQuality.quality_score).toBe(80);
    });

    it("should cap sqft penalty at max", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ sqft: 3600 }), // 100% variance -> max -20
          idealComp({ sqft: 3600 }),
          idealComp({ sqft: 3600 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100 - 20 = 80
      expect(compQuality.quality_score).toBe(80);
    });

    it("should calculate sqft variance as percentage", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ sqft: 1980 }), // 10% larger
          idealComp({ sqft: 1620 }), // 10% smaller
          idealComp({ sqft: 1800 }), // Same
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Average variance = (10 + 10 + 0) / 3 = 6.67%
      expect(compQuality.sqft_variance_pct).toBeCloseTo(6.67, 1);
    });

    it("should handle smaller comps the same as larger", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ sqft: 1260 }), // 30% smaller -> same penalty as 30% larger
          idealComp({ sqft: 1260 }),
          idealComp({ sqft: 1260 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // 30% variance -> 2 steps over 10% -> -20
      expect(compQuality.quality_score).toBe(80);
    });

    it("should not penalize comps within ideal variance", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ sqft: 1890 }), // 5% variance
          idealComp({ sqft: 1710 }), // 5% variance
          idealComp({ sqft: 1800 }), // 0% variance
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMP COUNT ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Comp Count Adjustments", () => {
    it("should apply -20 penalty for fewer than 3 comps", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100
      // Count penalty: -20
      // Final: 80
      expect(compQuality.quality_score).toBe(80);
    });

    it("should apply +10 bonus for 5+ comps", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp(),
          idealComp(),
          idealComp(),
          idealComp(),
          idealComp(),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100
      // Count bonus: +10
      // Clamped to 100
      expect(compQuality.quality_score).toBe(100);
    });

    it("should apply +10 bonus for 6 comps", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp(),
          idealComp(),
          idealComp(),
          idealComp(),
          idealComp(),
          idealComp(),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(100);
    });

    it("should not apply adjustment for 3-4 comps", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp: 100
      // No adjustment
      expect(compQuality.quality_score).toBe(100);
    });

    it("should return 0 score for no comps", () => {
      const input: CompQualityInput = {
        comps: [],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(0);
      expect(compQuality.quality_band).toBe("poor");
      expect(compQuality.comp_count).toBe(0);
    });

    it("should apply severe penalty for single comp", () => {
      const input: CompQualityInput = {
        comps: [idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Score: 100 - 20 (low count) = 80
      expect(compQuality.quality_score).toBe(80);
      expect(compQuality.comp_count).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUALITY BANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Quality Bands", () => {
    it("should assign 'excellent' for score >= 80", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_band).toBe("excellent");
    });

    it("should assign 'excellent' for score exactly 80", () => {
      // Create comps that score exactly 80
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp()], // 100 - 20 = 80
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.quality_score).toBe(80);
      expect(compQuality.quality_band).toBe("excellent");
    });

    it("should assign 'good' for score 60-79", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 2.0, age_days: 150 }),
          idealComp({ distance_miles: 2.0, age_days: 150 }),
          idealComp({ distance_miles: 2.0, age_days: 150 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each: 100 - 15 (dist) - 10 (age) = 75
      expect(compQuality.quality_band).toBe("good");
    });

    it("should assign 'fair' for score 40-59", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 3.0, age_days: 200, sqft: 2340 }),
          idealComp({ distance_miles: 3.0, age_days: 200, sqft: 2340 }),
          idealComp({ distance_miles: 3.0, age_days: 200, sqft: 2340 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each: 100 - 25 (dist) - 15 (age) - 20 (sqft) = 40
      expect(compQuality.quality_band).toBe("fair");
    });

    it("should assign 'poor' for score < 40", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 10, age_days: 365, sqft: 3600 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Max penalties: 30 + 30 + 20 = 80
      // Score: 100 - 80 = 20
      // Count penalty: -20
      // Final: 0
      expect(compQuality.quality_band).toBe("poor");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED PENALTIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Combined Penalties", () => {
    it("should apply all penalties cumulatively", () => {
      const input: CompQualityInput = {
        comps: [
          { distance_miles: 1.5, age_days: 150, sqft: 2160 }, // 20% variance
          { distance_miles: 1.5, age_days: 150, sqft: 2160 },
          { distance_miles: 1.5, age_days: 150, sqft: 2160 },
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each comp:
      // Distance: 1.0mi over -> 2 steps -> -10
      // Age: 60 days over -> 2 steps -> -10
      // Sqft: 20% variance -> 1 step -> -10
      // Total: 100 - 30 = 70
      expect(compQuality.quality_score).toBe(70);
    });

    it("should handle mixed quality comps", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp(), // Score: 100
          idealComp({ distance_miles: 2.0 }), // Score: 100 - 15 = 85
          idealComp({ age_days: 180 }), // Score: 100 - 15 = 85
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Average: (100 + 85 + 85) / 3 = 90
      expect(compQuality.quality_score).toBe(90);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACE FRAME EMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Trace Frame Emission", () => {
    it("should emit COMP_QUALITY trace entry", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { traceEntry } = computeCompQuality(input, policy);

      expect(traceEntry.rule).toBe("COMP_QUALITY");
    });

    it("should include per-comp scoring details in trace", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 1.0 }),
          idealComp({ distance_miles: 0.5 }),
        ],
        subjectSqft: 1800,
      };

      const { traceEntry } = computeCompQuality(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const perCompScoring = details.per_comp_scoring as Array<{
        distance_penalty: number;
      }>;

      expect(perCompScoring).toHaveLength(2);
      expect(perCompScoring[0].distance_penalty).toBe(5);
      expect(perCompScoring[1].distance_penalty).toBe(0);
    });

    it("should include policy values in trace", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { traceEntry } = computeCompQuality(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const tracePolicy = details.policy as Record<string, number>;

      expect(tracePolicy.distance_ideal_miles).toBe(0.5);
      expect(tracePolicy.age_ideal_days).toBe(90);
    });

    it("should include aggregates in trace", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 0.5, age_days: 30 }),
          idealComp({ distance_miles: 1.0, age_days: 60 }),
          idealComp({ distance_miles: 1.5, age_days: 90 }),
        ],
        subjectSqft: 1800,
      };

      const { traceEntry } = computeCompQuality(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const aggregates = details.aggregates as Record<string, number>;

      expect(aggregates.avg_distance_miles).toBe(1);
      expect(aggregates.avg_age_days).toBe(60);
    });

    it("should include score breakdown in trace", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { traceEntry } = computeCompQuality(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const breakdown = details.score_breakdown as Record<string, number>;

      expect(breakdown.proximity_score).toBe(100);
      expect(breakdown.recency_score).toBe(100);
      expect(breakdown.similarity_score).toBe(100);
    });

    it("should include used fields list", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { traceEntry } = computeCompQuality(input, policy);

      expect(traceEntry.used).toContain("inputs.comps");
      expect(traceEntry.used).toContain("inputs.subject_sqft");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORE BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Score Breakdown", () => {
    it("should include score breakdown in result", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.score_breakdown).toBeDefined();
      expect(compQuality.score_breakdown?.recency_score).toBe(100);
      expect(compQuality.score_breakdown?.proximity_score).toBe(100);
      expect(compQuality.score_breakdown?.similarity_score).toBe(100);
    });

    it("should calculate proximity score based on distance penalties", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 1.5 }), // -10 penalty
          idealComp({ distance_miles: 1.5 }),
          idealComp({ distance_miles: 1.5 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Average penalty: 10, so proximity score = 100 - 10 = 90
      expect(compQuality.score_breakdown?.proximity_score).toBe(90);
    });

    it("should calculate recency score based on age penalties", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 150 }), // -10 penalty
          idealComp({ age_days: 150 }),
          idealComp({ age_days: 150 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Average penalty: 10, so recency score = 100 - 10 = 90
      expect(compQuality.score_breakdown?.recency_score).toBe(90);
    });

    it("should calculate similarity score based on sqft penalties", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ sqft: 2340 }), // 30% variance -> -20 penalty
          idealComp({ sqft: 2340 }),
          idealComp({ sqft: 2340 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Average penalty: 20, so similarity score = 100 - 20 = 80
      expect(compQuality.score_breakdown?.similarity_score).toBe(80);
    });

    it("should have score breakdown values as independent 0-100 scores, not additive fractions", () => {
      const input: CompQualityInput = {
        comps: [
          // Each comp has mixed penalties
          { distance_miles: 1.5, age_days: 150, sqft: 2160 }, // 20% variance
          { distance_miles: 1.0, age_days: 120, sqft: 1980 }, // 10% variance
          { distance_miles: 0.5, age_days: 90, sqft: 1800 }, // ideal
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Each breakdown score should be 0-100 independently
      expect(compQuality.score_breakdown?.proximity_score).toBeGreaterThanOrEqual(
        0
      );
      expect(compQuality.score_breakdown?.proximity_score).toBeLessThanOrEqual(
        100
      );
      expect(compQuality.score_breakdown?.recency_score).toBeGreaterThanOrEqual(
        0
      );
      expect(compQuality.score_breakdown?.recency_score).toBeLessThanOrEqual(100);
      expect(
        compQuality.score_breakdown?.similarity_score
      ).toBeGreaterThanOrEqual(0);
      expect(compQuality.score_breakdown?.similarity_score).toBeLessThanOrEqual(
        100
      );

      // The sum of breakdown scores is NOT expected to equal the total score
      // This documents the intentional design: each sub-score is a per-dimension quality grade
      const breakdownSum =
        (compQuality.score_breakdown?.proximity_score ?? 0) +
        (compQuality.score_breakdown?.recency_score ?? 0) +
        (compQuality.score_breakdown?.similarity_score ?? 0);

      // Breakdown sum will be ~200+ while quality_score is ~60-90
      expect(breakdownSum).toBeGreaterThan(compQuality.quality_score);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIDENCE THRESHOLD
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Confidence Threshold", () => {
    it("should set meets_confidence_threshold true for high scores", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.meets_confidence_threshold).toBe(true);
    });

    it("should set meets_confidence_threshold false for low scores", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 10, age_days: 365, sqft: 3600 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.meets_confidence_threshold).toBe(false);
    });

    it("should respect custom confidence threshold", () => {
      const customPolicy = { ...policy, confidenceAThreshold: 95 };
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, customPolicy);

      // Score is 100, threshold is 95
      expect(compQuality.meets_confidence_threshold).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM POLICY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Custom Policy", () => {
    it("should respect custom distance threshold", () => {
      const customPolicy: CompQualityPolicy = {
        ...policy,
        distanceIdealMiles: 2.0, // More lenient
      };

      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 1.5 }), // 1.0mi over default (0.5), within custom (2.0)
          idealComp({ distance_miles: 1.5 }),
          idealComp({ distance_miles: 1.5 }),
        ],
        subjectSqft: 1800,
      };

      const resultDefault = computeCompQuality(input, policy);
      const resultCustom = computeCompQuality(input, customPolicy);

      // Default: 1.5 - 0.5 = 1.0mi over -> 2 steps -> -10 penalty -> score 90
      // Custom: 1.5 - 2.0 = within threshold -> no penalty -> score 100
      expect(resultDefault.compQuality.quality_score).toBe(90);
      expect(resultCustom.compQuality.quality_score).toBe(100);
    });

    it("should respect custom age threshold", () => {
      const customPolicy: CompQualityPolicy = {
        ...policy,
        ageIdealDays: 180, // More lenient
      };

      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 150 }), // Within new threshold
          idealComp({ age_days: 150 }),
          idealComp({ age_days: 150 }),
        ],
        subjectSqft: 1800,
      };

      const resultDefault = computeCompQuality(input, policy);
      const resultCustom = computeCompQuality(input, customPolicy);

      // Custom should score higher
      expect(resultCustom.compQuality.quality_score).toBeGreaterThan(
        resultDefault.compQuality.quality_score
      );
    });

    it("should respect custom quality band thresholds", () => {
      const customPolicy: CompQualityPolicy = {
        ...policy,
        excellentThreshold: 95, // Stricter
      };

      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 1.5 }), // 1.0mi over -> -10 penalty -> score 90
          idealComp({ distance_miles: 1.5 }),
          idealComp({ distance_miles: 1.5 }),
        ],
        subjectSqft: 1800,
      };

      const resultDefault = computeCompQuality(input, policy);
      const resultCustom = computeCompQuality(input, customPolicy);

      // Both have same score (90) but different bands due to thresholds
      expect(resultDefault.compQuality.quality_score).toBe(90);
      expect(resultCustom.compQuality.quality_score).toBe(90);
      expect(resultDefault.compQuality.quality_band).toBe("excellent"); // 90 >= 80
      expect(resultCustom.compQuality.quality_band).toBe("good"); // 90 < 95
    });

    it("should respect custom penalty values", () => {
      const customPolicy: CompQualityPolicy = {
        ...policy,
        distancePenaltyPer05Mi: 10, // Double the penalty
      };

      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 1.0 }), // 0.5mi over = -10 with custom
          idealComp({ distance_miles: 1.0 }),
          idealComp({ distance_miles: 1.0 }),
        ],
        subjectSqft: 1800,
      };

      const resultDefault = computeCompQuality(input, policy);
      const resultCustom = computeCompQuality(input, customPolicy);

      expect(resultCustom.compQuality.quality_score).toBeLessThan(
        resultDefault.compQuality.quality_score
      );
    });

    it("should respect custom comp count thresholds", () => {
      const customPolicy: CompQualityPolicy = {
        ...policy,
        minCompsRequired: 5, // Stricter
      };

      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const resultDefault = computeCompQuality(input, policy);
      const resultCustom = computeCompQuality(input, customPolicy);

      // Custom applies penalty, default doesn't
      expect(resultCustom.compQuality.quality_score).toBeLessThan(
        resultDefault.compQuality.quality_score
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Edge Cases", () => {
    it("should handle zero subject sqft", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 0,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // Should not crash, sqft variance treated as 0
      expect(compQuality.sqft_variance_pct).toBe(0);
    });

    it("should handle zero distance comps", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ distance_miles: 0 }),
          idealComp({ distance_miles: 0 }),
          idealComp({ distance_miles: 0 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.avg_distance_miles).toBe(0);
      expect(compQuality.quality_score).toBe(100);
    });

    it("should handle zero age comps", () => {
      const input: CompQualityInput = {
        comps: [
          idealComp({ age_days: 0 }),
          idealComp({ age_days: 0 }),
          idealComp({ age_days: 0 }),
        ],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.avg_age_days).toBe(0);
      expect(compQuality.quality_score).toBe(100);
    });

    it("should return scoring_method as fannie_mae", () => {
      const input: CompQualityInput = {
        comps: [idealComp(), idealComp(), idealComp()],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.scoring_method).toBe("fannie_mae");
    });

    it("should handle very large comp counts", () => {
      const input: CompQualityInput = {
        comps: Array(20).fill(idealComp()),
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      // 20 comps, bonus applied, clamped to 100
      expect(compQuality.quality_score).toBe(100);
      expect(compQuality.comp_count).toBe(20);
    });

    it("should handle null max values for no comps", () => {
      const input: CompQualityInput = {
        comps: [],
        subjectSqft: 1800,
      };

      const { compQuality } = computeCompQuality(input, policy);

      expect(compQuality.max_distance_miles).toBeNull();
      expect(compQuality.max_age_days).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("validateCompQualityInput", () => {
  it("should return error for negative subjectSqft", () => {
    const errors = validateCompQualityInput({
      comps: [],
      subjectSqft: -1,
    });
    expect(errors).toContain("subjectSqft cannot be negative");
  });

  it("should return error for negative distance_miles in comp", () => {
    const errors = validateCompQualityInput({
      comps: [{ distance_miles: -1, age_days: 30, sqft: 1800 }],
      subjectSqft: 1800,
    });
    expect(errors).toContain("Comp 0: distance_miles cannot be negative");
  });

  it("should return error for negative age_days in comp", () => {
    const errors = validateCompQualityInput({
      comps: [{ distance_miles: 0.5, age_days: -1, sqft: 1800 }],
      subjectSqft: 1800,
    });
    expect(errors).toContain("Comp 0: age_days cannot be negative");
  });

  it("should return error for negative sqft in comp", () => {
    const errors = validateCompQualityInput({
      comps: [{ distance_miles: 0.5, age_days: 30, sqft: -1 }],
      subjectSqft: 1800,
    });
    expect(errors).toContain("Comp 0: sqft cannot be negative");
  });

  it("should return empty array for valid inputs", () => {
    const errors = validateCompQualityInput({
      comps: [
        { distance_miles: 0.5, age_days: 30, sqft: 1800 },
        { distance_miles: 1.0, age_days: 60, sqft: 2000 },
      ],
      subjectSqft: 1800,
    });
    expect(errors).toHaveLength(0);
  });

  it("should report errors for multiple invalid comps", () => {
    const errors = validateCompQualityInput({
      comps: [
        { distance_miles: -1, age_days: 30, sqft: 1800 },
        { distance_miles: 0.5, age_days: -1, sqft: 1800 },
      ],
      subjectSqft: 1800,
    });
    expect(errors).toHaveLength(2);
    expect(errors).toContain("Comp 0: distance_miles cannot be negative");
    expect(errors).toContain("Comp 1: age_days cannot be negative");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("calculateIdealCompCharacteristics", () => {
  const policy = DEFAULT_COMP_QUALITY_POLICY;

  it("should calculate ideal characteristics for 100 score", () => {
    const result = calculateIdealCompCharacteristics(100, policy);

    // For 100 score, should be at or below ideal thresholds
    expect(result.maxDistanceMiles).toBe(0.5);
    expect(result.maxAgeDays).toBe(90);
    expect(result.maxSqftVariancePct).toBe(10);
  });

  it("should calculate characteristics for 80 score", () => {
    const result = calculateIdealCompCharacteristics(80, policy);

    // Allowable penalty = 20, distributed across 3 dimensions = ~6.67 each
    // Distance: floor(6.67/5) = 1 step = 0.5mi extra -> 1.0mi max
    // Age: floor(6.67/5) = 1 step = 30 days extra -> 120 days max
    // Sqft: floor(6.67/10) = 0 steps = no extra -> stays at 10%
    expect(result.maxDistanceMiles).toBe(1);
    expect(result.maxAgeDays).toBe(120);
    expect(result.maxSqftVariancePct).toBe(10); // floor(6.67/10) = 0, stays at ideal
  });

  it("should calculate characteristics for 60 score", () => {
    const result = calculateIdealCompCharacteristics(60, policy);

    // Allowable penalty = 40
    expect(result.maxDistanceMiles).toBeGreaterThan(
      calculateIdealCompCharacteristics(80, policy).maxDistanceMiles
    );
  });

  it("should use default policy when not provided", () => {
    const result = calculateIdealCompCharacteristics(100);

    expect(result.maxDistanceMiles).toBe(0.5);
    expect(result.maxAgeDays).toBe(90);
  });
});

describe("areCompsSufficient", () => {
  it("should return true for sufficient comps", () => {
    const compQuality = {
      comp_count: 5,
      avg_distance_miles: 0.3,
      avg_age_days: 45,
      sqft_variance_pct: 5,
      quality_score: 95,
      quality_band: "excellent" as const,
      scoring_method: "fannie_mae" as const,
    };

    expect(areCompsSufficient(compQuality)).toBe(true);
  });

  it("should return false for insufficient count", () => {
    const compQuality = {
      comp_count: 2,
      avg_distance_miles: 0.3,
      avg_age_days: 45,
      sqft_variance_pct: 5,
      quality_score: 95,
      quality_band: "excellent" as const,
      scoring_method: "fannie_mae" as const,
    };

    expect(areCompsSufficient(compQuality)).toBe(false);
  });

  it("should return false for insufficient score", () => {
    const compQuality = {
      comp_count: 5,
      avg_distance_miles: 2,
      avg_age_days: 200,
      sqft_variance_pct: 30,
      quality_score: 50,
      quality_band: "fair" as const,
      scoring_method: "fannie_mae" as const,
    };

    expect(areCompsSufficient(compQuality)).toBe(false);
  });

  it("should respect custom thresholds", () => {
    const compQuality = {
      comp_count: 4,
      avg_distance_miles: 0.5,
      avg_age_days: 60,
      sqft_variance_pct: 8,
      quality_score: 85,
      quality_band: "excellent" as const,
      scoring_method: "fannie_mae" as const,
    };

    // Default: needs 3 comps and 70 score
    expect(areCompsSufficient(compQuality)).toBe(true);

    // Custom: needs 5 comps and 90 score
    expect(areCompsSufficient(compQuality, 90, 5)).toBe(false);
  });

  it("should use precomputed meets_confidence_threshold when usePrecomputed=true", () => {
    // Score is 65 (below default 70 threshold) but meets_confidence_threshold is true
    const compQuality = {
      comp_count: 5,
      avg_distance_miles: 1.5,
      avg_age_days: 150,
      sqft_variance_pct: 20,
      quality_score: 65,
      quality_band: "good" as const,
      scoring_method: "fannie_mae" as const,
      meets_confidence_threshold: true,
    };

    // Without usePrecomputed: fails because score < 70
    expect(areCompsSufficient(compQuality, 70, 3, false)).toBe(false);

    // With usePrecomputed: passes because meets_confidence_threshold is true
    expect(areCompsSufficient(compQuality, 70, 3, true)).toBe(true);
  });

  it("should return false when usePrecomputed=true but meets_confidence_threshold is undefined", () => {
    const compQuality = {
      comp_count: 5,
      avg_distance_miles: 0.3,
      avg_age_days: 45,
      sqft_variance_pct: 5,
      quality_score: 95,
      quality_band: "excellent" as const,
      scoring_method: "fannie_mae" as const,
      // meets_confidence_threshold is undefined
    };

    // Without usePrecomputed: passes because score >= 70
    expect(areCompsSufficient(compQuality, 70, 3, false)).toBe(true);

    // With usePrecomputed: fails because meets_confidence_threshold is undefined (treated as false)
    expect(areCompsSufficient(compQuality, 70, 3, true)).toBe(false);
  });

  it("should return false when usePrecomputed=true and meets_confidence_threshold is false", () => {
    const compQuality = {
      comp_count: 5,
      avg_distance_miles: 0.3,
      avg_age_days: 45,
      sqft_variance_pct: 5,
      quality_score: 95,
      quality_band: "excellent" as const,
      scoring_method: "fannie_mae" as const,
      meets_confidence_threshold: false,
    };

    // Without usePrecomputed: passes because score >= 70
    expect(areCompsSufficient(compQuality, 70, 3, false)).toBe(true);

    // With usePrecomputed: fails because meets_confidence_threshold is false
    expect(areCompsSufficient(compQuality, 70, 3, true)).toBe(false);
  });
});
