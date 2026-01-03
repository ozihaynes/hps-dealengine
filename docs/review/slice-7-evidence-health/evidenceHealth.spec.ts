/**
 * Unit Tests for Evidence Health Calculator
 *
 * @module __tests__/evidenceHealth.spec
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  computeEvidenceHealth,
  validateEvidenceHealthInput,
  validateEvidenceHealthPolicy,
  isEvidenceSufficient,
  getEvidenceNeedingAttention,
  getDaysUntilSoonestExpiration,
  DEFAULT_EVIDENCE_HEALTH_POLICY,
  type EvidenceHealthInput,
  type EvidenceHealthPolicy,
} from "../slices/evidenceHealth";

describe("computeEvidenceHealth", () => {
  let policy: EvidenceHealthPolicy;
  const referenceDate = "2026-01-03";

  // Helper to create all fresh evidence
  const allFreshInput = (): EvidenceHealthInput => ({
    payoffLetter: { obtainedDate: "2025-12-20" }, // 14 days old (< 30)
    titleCommitment: { obtainedDate: "2025-12-01" }, // 33 days old (< 60)
    insuranceQuote: { obtainedDate: "2025-12-25" }, // 9 days old (< 30)
    fourPointInspection: { obtainedDate: "2025-11-01" }, // 63 days old (< 90)
    repairEstimate: { obtainedDate: "2025-12-01" }, // 33 days old (< 60)
    referenceDate,
  });

  // Helper to create all missing evidence
  const allMissingInput = (): EvidenceHealthInput => ({
    payoffLetter: { obtainedDate: null },
    titleCommitment: { obtainedDate: null },
    insuranceQuote: { obtainedDate: null },
    fourPointInspection: { obtainedDate: null },
    repairEstimate: { obtainedDate: null },
    referenceDate,
  });

  beforeEach(() => {
    policy = { ...DEFAULT_EVIDENCE_HEALTH_POLICY };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL EVIDENCE FRESH
  // ═══════════════════════════════════════════════════════════════════════════

  describe("All Evidence Fresh", () => {
    it("should score 100 when all 5 evidence items are fresh", () => {
      const input = allFreshInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.health_score).toBe(100);
      expect(evidenceHealth.health_band).toBe("excellent");
      expect(evidenceHealth.fresh_count).toBe(5);
      expect(evidenceHealth.stale_count).toBe(0);
      expect(evidenceHealth.missing_count).toBe(0);
      expect(evidenceHealth.any_critical_missing).toBe(false);
      expect(evidenceHealth.any_critical_stale).toBe(false);
    });

    it("should return correct item details for fresh evidence", () => {
      const input = allFreshInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem).toBeDefined();
      expect(payoffItem!.status).toBe("fresh");
      expect(payoffItem!.is_critical).toBe(true);
      expect(payoffItem!.freshness_threshold_days).toBe(30);
      expect(payoffItem!.age_days).toBe(14);
      expect(payoffItem!.days_until_stale).toBe(16); // 30 - 14
    });

    it("should recommend ready for underwriting when all fresh", () => {
      const input = allFreshInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toBe(
        "All evidence current — ready for underwriting"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL EVIDENCE MISSING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("All Evidence Missing", () => {
    it("should score 0 when all 5 evidence items are missing", () => {
      const input = allMissingInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      // 5 missing * 20 penalty = -100
      // 3 critical missing * 10 additional penalty = -30
      // Start at 0, can't go below 0
      expect(evidenceHealth.health_score).toBe(0);
      expect(evidenceHealth.health_band).toBe("poor");
      expect(evidenceHealth.fresh_count).toBe(0);
      expect(evidenceHealth.stale_count).toBe(0);
      expect(evidenceHealth.missing_count).toBe(5);
    });

    it("should flag all 3 critical items as missing", () => {
      const input = allMissingInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.any_critical_missing).toBe(true);
      expect(evidenceHealth.missing_critical).toHaveLength(3);
      expect(evidenceHealth.missing_critical).toContain("payoff_letter");
      expect(evidenceHealth.missing_critical).toContain("title_commitment");
      expect(evidenceHealth.missing_critical).toContain("insurance_quote");
    });

    it("should recommend obtaining missing critical evidence", () => {
      const input = allMissingInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toContain("critical");
      expect(evidenceHealth.recommended_action).toContain("Payoff Letter");
    });

    it("should return null values for missing items", () => {
      const input = allMissingInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem!.status).toBe("missing");
      expect(payoffItem!.age_days).toBeNull();
      expect(payoffItem!.days_until_stale).toBeNull();
      expect(payoffItem!.obtained_date).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STALE EVIDENCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Stale Evidence", () => {
    it("should mark payoff letter stale when > 30 days old", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2025-11-15" }, // 49 days old
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem!.status).toBe("stale");
      expect(payoffItem!.age_days).toBe(49);
      expect(payoffItem!.days_until_stale).toBe(-19); // Negative = already stale
    });

    it("should mark title commitment stale when > 60 days old", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        titleCommitment: { obtainedDate: "2025-10-01" }, // 94 days old
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const titleItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "title_commitment"
      );
      expect(titleItem!.status).toBe("stale");
      expect(titleItem!.age_days).toBe(94);
    });

    it("should mark four-point inspection stale when > 90 days old", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: "2025-09-01" }, // 124 days old
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const inspectionItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "four_point_inspection"
      );
      expect(inspectionItem!.status).toBe("stale");
      expect(inspectionItem!.age_days).toBe(124);
    });

    it("should apply stale penalty to health score", () => {
      // 4 fresh, 1 stale (non-critical)
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: "2025-09-01" }, // stale
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      // 4 fresh * 20 = 80
      // 1 stale * -10 = -10
      // Total = 70
      expect(evidenceHealth.health_score).toBe(70);
      expect(evidenceHealth.health_band).toBe("good");
      expect(evidenceHealth.stale_count).toBe(1);
    });

    it("should track stale critical evidence", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2025-11-01" }, // 63 days old (stale)
        titleCommitment: { obtainedDate: "2025-10-01" }, // 94 days old (stale)
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.any_critical_stale).toBe(true);
      expect(evidenceHealth.stale_critical).toHaveLength(2);
      expect(evidenceHealth.stale_critical).toContain("payoff_letter");
      expect(evidenceHealth.stale_critical).toContain("title_commitment");
    });

    it("should recommend refreshing stale critical evidence", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2025-11-01" }, // stale
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toContain("Refresh");
      expect(evidenceHealth.recommended_action).toContain("Payoff Letter");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOUNDARY CONDITIONS (THRESHOLD EDGE CASES)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Boundary Conditions", () => {
    it("should consider exactly at threshold as FRESH (30 days = fresh)", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2025-12-04" }, // Exactly 30 days
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem!.status).toBe("fresh");
      expect(payoffItem!.age_days).toBe(30);
      expect(payoffItem!.days_until_stale).toBe(0);
    });

    it("should consider 1 day over threshold as STALE (31 days = stale)", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2025-12-03" }, // 31 days old
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem!.status).toBe("stale");
      expect(payoffItem!.age_days).toBe(31);
      expect(payoffItem!.days_until_stale).toBe(-1);
    });

    it("should treat future dates as 0 days old (fresh)", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2026-01-10" }, // Future date
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem!.status).toBe("fresh");
      expect(payoffItem!.age_days).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH SCORE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Health Score Calculation", () => {
    it("should calculate score correctly with mix of fresh, stale, missing", () => {
      const input: EvidenceHealthInput = {
        payoffLetter: { obtainedDate: "2025-12-20" }, // fresh (critical)
        titleCommitment: { obtainedDate: "2025-10-01" }, // stale (critical)
        insuranceQuote: { obtainedDate: null }, // missing (critical)
        fourPointInspection: { obtainedDate: "2025-12-01" }, // fresh (non-critical)
        repairEstimate: { obtainedDate: "2025-11-01" }, // stale (non-critical)
        referenceDate,
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      // 2 fresh * 20 = 40
      // 2 stale * -10 = -20
      // 1 missing * -20 = -20
      // 1 missing critical * -10 = -10
      // Total = 40 - 20 - 20 - 10 = -10 -> clamped to 0
      expect(evidenceHealth.health_score).toBe(0);
      expect(evidenceHealth.fresh_count).toBe(2);
      expect(evidenceHealth.stale_count).toBe(2);
      expect(evidenceHealth.missing_count).toBe(1);
    });

    it("should apply additional penalty for missing critical", () => {
      // Compare: missing critical vs missing non-critical
      const inputMissingCritical: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: null }, // missing critical
      };
      const inputMissingNonCritical: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: null }, // missing non-critical
      };

      const resultCritical = computeEvidenceHealth(inputMissingCritical, policy);
      const resultNonCritical = computeEvidenceHealth(
        inputMissingNonCritical,
        policy
      );

      // Missing critical gets additional 10 penalty
      expect(resultCritical.evidenceHealth.health_score).toBe(
        resultNonCritical.evidenceHealth.health_score - 10
      );
    });

    it("should clamp score to 0 minimum", () => {
      const input = allMissingInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.health_score).toBe(0);
      expect(evidenceHealth.health_score).toBeGreaterThanOrEqual(0);
    });

    it("should clamp score to 100 maximum", () => {
      // Custom policy that gives more than 100 points
      const generousPolicy: EvidenceHealthPolicy = {
        ...policy,
        pointsPerFreshItem: 30, // 5 * 30 = 150 -> should clamp to 100
      };

      const input = allFreshInput();
      const { evidenceHealth } = computeEvidenceHealth(input, generousPolicy);

      expect(evidenceHealth.health_score).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH BANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Health Bands", () => {
    it("should assign excellent band for score >= 80", () => {
      // 4 fresh, 1 stale non-critical = 80 - 10 = 70... need more
      // 5 fresh = 100
      const input = allFreshInput();
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.health_band).toBe("excellent");
    });

    it("should assign good band for score >= 60 and < 80", () => {
      // 4 fresh, 1 stale = 80 - 10 = 70
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: "2025-09-01" }, // stale
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.health_score).toBe(70);
      expect(evidenceHealth.health_band).toBe("good");
    });

    it("should assign fair band for score >= 40 and < 60", () => {
      // 3 fresh, 2 stale = 60 - 20 = 40... actually 3*20=60, 2*(-10)=-20 = 40
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: "2025-11-01" }, // stale critical
        repairEstimate: { obtainedDate: "2025-10-01" }, // stale non-critical
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.health_score).toBe(40);
      expect(evidenceHealth.health_band).toBe("fair");
    });

    it("should assign poor band for score < 40", () => {
      // 2 fresh, 3 missing = 40 - 60 - 30 (critical penalty) = -50 -> 0
      const input: EvidenceHealthInput = {
        payoffLetter: { obtainedDate: null }, // missing critical
        titleCommitment: { obtainedDate: null }, // missing critical
        insuranceQuote: { obtainedDate: null }, // missing critical
        fourPointInspection: { obtainedDate: "2025-12-01" }, // fresh
        repairEstimate: { obtainedDate: "2025-12-01" }, // fresh
        referenceDate,
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.health_band).toBe("poor");
    });

    it("should respect custom band thresholds", () => {
      const customPolicy: EvidenceHealthPolicy = {
        ...policy,
        excellentThreshold: 95,
        goodThreshold: 75,
        fairThreshold: 50,
      };

      // 4 fresh, 1 stale = 80 - 10 = 70 -> now "fair" with custom thresholds
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: "2025-09-01" }, // stale
      };
      const { evidenceHealth } = computeEvidenceHealth(input, customPolicy);

      expect(evidenceHealth.health_score).toBe(70);
      expect(evidenceHealth.health_band).toBe("fair"); // 70 < 75
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOMMENDED ACTIONS (PRIORITY ORDER)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Recommended Actions", () => {
    it("should prioritize missing critical over stale critical", () => {
      const input: EvidenceHealthInput = {
        payoffLetter: { obtainedDate: null }, // missing critical
        titleCommitment: { obtainedDate: "2025-10-01" }, // stale critical
        insuranceQuote: { obtainedDate: "2025-12-25" }, // fresh critical
        fourPointInspection: { obtainedDate: "2025-12-01" }, // fresh
        repairEstimate: { obtainedDate: "2025-12-01" }, // fresh
        referenceDate,
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toContain("Obtain");
      expect(evidenceHealth.recommended_action).not.toContain("Refresh");
    });

    it("should prioritize stale critical over missing non-critical", () => {
      const input: EvidenceHealthInput = {
        payoffLetter: { obtainedDate: "2025-11-01" }, // stale critical
        titleCommitment: { obtainedDate: "2025-12-01" }, // fresh critical
        insuranceQuote: { obtainedDate: "2025-12-25" }, // fresh critical
        fourPointInspection: { obtainedDate: null }, // missing non-critical
        repairEstimate: { obtainedDate: "2025-12-01" }, // fresh
        referenceDate,
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toContain("Refresh");
      expect(evidenceHealth.recommended_action).toContain("Payoff Letter");
    });

    it("should mention count for missing non-critical only", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: null }, // missing non-critical
        repairEstimate: { obtainedDate: null }, // missing non-critical
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toContain("Collect 2 missing");
    });

    it("should mention count for stale non-critical only", () => {
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: "2025-09-01" }, // stale
        repairEstimate: { obtainedDate: "2025-10-01" }, // stale
      };
      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      expect(evidenceHealth.recommended_action).toContain("Refresh 2 stale");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Trace Entry", () => {
    it("should include rule name EVIDENCE_HEALTH", () => {
      const input = allFreshInput();
      const { traceEntry } = computeEvidenceHealth(input, policy);

      expect(traceEntry.rule).toBe("EVIDENCE_HEALTH");
    });

    it("should include all used fields", () => {
      const input = allFreshInput();
      const { traceEntry } = computeEvidenceHealth(input, policy);

      expect(traceEntry.used).toContain("inputs.payoff_letter");
      expect(traceEntry.used).toContain("inputs.title_commitment");
      expect(traceEntry.used).toContain("policy.freshness_thresholds");
    });

    it("should include per-item evaluation in details", () => {
      const input = allFreshInput();
      const { traceEntry } = computeEvidenceHealth(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      expect(details.per_item_evaluation).toBeDefined();
      expect(Array.isArray(details.per_item_evaluation)).toBe(true);
      expect((details.per_item_evaluation as unknown[]).length).toBe(5);
    });

    it("should include score calculation breakdown", () => {
      const input = allFreshInput();
      const { traceEntry } = computeEvidenceHealth(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const scoreCalc = details.score_calculation as Record<string, unknown>;
      expect(scoreCalc.points_from_fresh).toBeDefined();
      expect(scoreCalc.penalty_from_stale).toBeDefined();
      expect(scoreCalc.final_score).toBeDefined();
    });

    it("should include criticality flags in policy trace", () => {
      const input = allFreshInput();
      const { traceEntry } = computeEvidenceHealth(input, policy);

      const details = traceEntry.details as Record<string, unknown>;
      const tracePolicy = details.policy as Record<string, unknown>;
      const criticalityFlags = tracePolicy.criticality_flags as Record<
        string,
        boolean
      >;

      expect(criticalityFlags).toBeDefined();
      expect(criticalityFlags.payoff_letter).toBe(true);
      expect(criticalityFlags.title_commitment).toBe(true);
      expect(criticalityFlags.insurance_quote).toBe(true);
      expect(criticalityFlags.four_point_inspection).toBe(false);
      expect(criticalityFlags.repair_estimate).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM POLICY OVERRIDES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Custom Policy Overrides", () => {
    it("should respect custom freshness thresholds", () => {
      const customPolicy: EvidenceHealthPolicy = {
        ...policy,
        payoffLetterFreshnessDays: 7, // Much stricter
      };

      // 14 days old should now be stale with 7-day threshold
      const input = allFreshInput();
      const { evidenceHealth } = computeEvidenceHealth(input, customPolicy);

      const payoffItem = evidenceHealth.items.find(
        (i) => i.evidence_type === "payoff_letter"
      );
      expect(payoffItem!.status).toBe("stale");
    });

    it("should respect custom criticality flags", () => {
      const customPolicy: EvidenceHealthPolicy = {
        ...policy,
        payoffLetterCritical: false, // Make it non-critical
        fourPointInspectionCritical: true, // Make it critical
      };

      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        payoffLetter: { obtainedDate: null }, // Now non-critical missing
        fourPointInspection: { obtainedDate: null }, // Now critical missing
      };
      const { evidenceHealth } = computeEvidenceHealth(input, customPolicy);

      expect(evidenceHealth.missing_critical).toContain("four_point_inspection");
      expect(evidenceHealth.missing_critical).not.toContain("payoff_letter");
    });

    it("should respect custom scoring weights", () => {
      const customPolicy: EvidenceHealthPolicy = {
        ...policy,
        pointsPerFreshItem: 25,
        penaltyPerStaleItem: 5,
        penaltyPerMissingItem: 15,
        penaltyPerMissingCritical: 5,
      };

      // 4 fresh, 1 missing (non-critical)
      const input: EvidenceHealthInput = {
        ...allFreshInput(),
        fourPointInspection: { obtainedDate: null },
      };
      const { evidenceHealth } = computeEvidenceHealth(input, customPolicy);

      // 4 * 25 = 100, -15 for missing = 85
      expect(evidenceHealth.health_score).toBe(85);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT REFERENCE DATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Reference Date Handling", () => {
    it("should default to current date if not specified", () => {
      const input: EvidenceHealthInput = {
        payoffLetter: { obtainedDate: new Date().toISOString().split("T")[0] },
        titleCommitment: { obtainedDate: new Date().toISOString().split("T")[0] },
        insuranceQuote: { obtainedDate: new Date().toISOString().split("T")[0] },
        fourPointInspection: { obtainedDate: new Date().toISOString().split("T")[0] },
        repairEstimate: { obtainedDate: new Date().toISOString().split("T")[0] },
        // No referenceDate specified
      };

      const { evidenceHealth } = computeEvidenceHealth(input, policy);

      // All should be 0 days old = fresh
      expect(evidenceHealth.fresh_count).toBe(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe("validateEvidenceHealthInput", () => {
  it("should return no errors for valid input", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
      referenceDate: "2026-01-03",
    };

    const errors = validateEvidenceHealthInput(input);
    expect(errors).toHaveLength(0);
  });

  it("should detect invalid date format", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "not-a-date" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
    };

    const errors = validateEvidenceHealthInput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("payoffLetter");
    expect(errors[0]).toContain("not a valid date");
  });

  it("should detect multiple invalid dates", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "invalid1" },
      titleCommitment: { obtainedDate: "invalid2" },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
    };

    const errors = validateEvidenceHealthInput(input);
    expect(errors).toHaveLength(2);
  });

  it("should detect invalid reference date", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
      referenceDate: "not-a-date",
    };

    const errors = validateEvidenceHealthInput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("referenceDate");
  });

  it("should accept null dates without error", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null },
      titleCommitment: { obtainedDate: null },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: null },
      repairEstimate: { obtainedDate: null },
    };

    const errors = validateEvidenceHealthInput(input);
    expect(errors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POLICY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe("validateEvidenceHealthPolicy", () => {
  it("should return no warnings for default policy", () => {
    const warnings = validateEvidenceHealthPolicy(DEFAULT_EVIDENCE_HEALTH_POLICY);
    expect(warnings).toHaveLength(0);
  });

  it("should warn about non-positive freshness thresholds", () => {
    const badPolicy: EvidenceHealthPolicy = {
      ...DEFAULT_EVIDENCE_HEALTH_POLICY,
      payoffLetterFreshnessDays: 0,
      titleCommitmentFreshnessDays: -5,
    };

    const warnings = validateEvidenceHealthPolicy(badPolicy);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    expect(warnings.some((w) => w.includes("payoffLetterFreshnessDays"))).toBe(
      true
    );
    expect(warnings.some((w) => w.includes("titleCommitmentFreshnessDays"))).toBe(
      true
    );
  });

  it("should warn about negative score weights", () => {
    const badPolicy: EvidenceHealthPolicy = {
      ...DEFAULT_EVIDENCE_HEALTH_POLICY,
      pointsPerFreshItem: -10,
      penaltyPerStaleItem: -5,
    };

    const warnings = validateEvidenceHealthPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("pointsPerFreshItem"))).toBe(true);
    expect(warnings.some((w) => w.includes("penaltyPerStaleItem"))).toBe(true);
  });

  it("should warn about band thresholds not in descending order", () => {
    const badPolicy: EvidenceHealthPolicy = {
      ...DEFAULT_EVIDENCE_HEALTH_POLICY,
      excellentThreshold: 50, // Should be highest
      goodThreshold: 70, // Higher than excellent!
      fairThreshold: 40,
    };

    const warnings = validateEvidenceHealthPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("descending order"))).toBe(true);
  });

  it("should warn when max possible score cannot reach 100", () => {
    const badPolicy: EvidenceHealthPolicy = {
      ...DEFAULT_EVIDENCE_HEALTH_POLICY,
      pointsPerFreshItem: 15, // 5 * 15 = 75 < 100
    };

    const warnings = validateEvidenceHealthPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("too low"))).toBe(true);
    expect(warnings.some((w) => w.includes("75"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe("isEvidenceSufficient", () => {
  const referenceDate = "2026-01-03";

  it("should return true when all fresh and score >= 60", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: "2025-12-25" },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    expect(isEvidenceSufficient(evidenceHealth)).toBe(true);
  });

  it("should return false when any critical is missing", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null }, // Missing critical
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: "2025-12-25" },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    expect(isEvidenceSufficient(evidenceHealth)).toBe(false);
  });

  it("should return false when score below threshold", () => {
    // 3 critical fresh + 2 non-critical missing = 60 - 40 = 20
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: "2025-12-25" },
      fourPointInspection: { obtainedDate: null }, // missing
      repairEstimate: { obtainedDate: null }, // missing
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    // Score = 60 - 40 = 20 < 60
    expect(isEvidenceSufficient(evidenceHealth)).toBe(false);
  });

  it("should respect custom minScore threshold", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: "2025-12-25" },
      fourPointInspection: { obtainedDate: "2025-09-01" }, // stale
      repairEstimate: { obtainedDate: "2025-12-01" },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    // Score = 80 - 10 = 70
    expect(isEvidenceSufficient(evidenceHealth, 80)).toBe(false);
    expect(isEvidenceSufficient(evidenceHealth, 70)).toBe(true);
  });
});

describe("getEvidenceNeedingAttention", () => {
  const referenceDate = "2026-01-03";

  it("should return empty array when all fresh", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" },
      titleCommitment: { obtainedDate: "2025-12-01" },
      insuranceQuote: { obtainedDate: "2025-12-25" },
      fourPointInspection: { obtainedDate: "2025-11-01" },
      repairEstimate: { obtainedDate: "2025-12-01" },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const needsAttention = getEvidenceNeedingAttention(evidenceHealth);
    expect(needsAttention).toHaveLength(0);
  });

  it("should sort critical items before non-critical", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-20" }, // fresh
      titleCommitment: { obtainedDate: null }, // missing critical
      insuranceQuote: { obtainedDate: "2025-12-25" }, // fresh
      fourPointInspection: { obtainedDate: null }, // missing non-critical
      repairEstimate: { obtainedDate: "2025-12-01" }, // fresh
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const needsAttention = getEvidenceNeedingAttention(evidenceHealth);
    expect(needsAttention).toHaveLength(2);
    expect(needsAttention[0].evidence_type).toBe("title_commitment"); // critical first
    expect(needsAttention[1].evidence_type).toBe("four_point_inspection");
  });

  it("should sort missing items before stale within same criticality", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-11-01" }, // stale critical
      titleCommitment: { obtainedDate: null }, // missing critical
      insuranceQuote: { obtainedDate: "2025-12-25" }, // fresh
      fourPointInspection: { obtainedDate: "2025-11-01" }, // fresh (< 90)
      repairEstimate: { obtainedDate: "2025-12-01" }, // fresh
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const needsAttention = getEvidenceNeedingAttention(evidenceHealth);
    expect(needsAttention).toHaveLength(2);
    expect(needsAttention[0].status).toBe("missing"); // missing before stale
    expect(needsAttention[1].status).toBe("stale");
  });
});

describe("getDaysUntilSoonestExpiration", () => {
  const referenceDate = "2026-01-03";

  it("should return soonest expiration days", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-28" }, // 6 days old, 24 until stale
      titleCommitment: { obtainedDate: "2025-12-01" }, // 33 days old, 27 until stale
      insuranceQuote: { obtainedDate: "2025-12-29" }, // 5 days old, 25 until stale
      fourPointInspection: { obtainedDate: "2025-11-01" }, // 63 days old, 27 until stale
      repairEstimate: { obtainedDate: "2025-12-20" }, // 14 days old, 46 until stale
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const daysUntil = getDaysUntilSoonestExpiration(evidenceHealth);
    expect(daysUntil).toBe(24); // payoff letter expires soonest
  });

  it("should return null when all evidence is missing", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null },
      titleCommitment: { obtainedDate: null },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: null },
      repairEstimate: { obtainedDate: null },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const daysUntil = getDaysUntilSoonestExpiration(evidenceHealth);
    expect(daysUntil).toBeNull();
  });

  it("should return null when all fresh evidence is already stale", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-11-01" }, // stale
      titleCommitment: { obtainedDate: "2025-10-01" }, // stale
      insuranceQuote: { obtainedDate: "2025-11-01" }, // stale
      fourPointInspection: { obtainedDate: "2025-09-01" }, // stale
      repairEstimate: { obtainedDate: "2025-10-01" }, // stale
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const daysUntil = getDaysUntilSoonestExpiration(evidenceHealth);
    expect(daysUntil).toBeNull(); // No fresh items
  });

  it("should handle mix of fresh, stale, and missing", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: "2025-12-29" }, // 5 days old, 25 until stale
      titleCommitment: { obtainedDate: null }, // missing
      insuranceQuote: { obtainedDate: "2025-11-01" }, // stale
      fourPointInspection: { obtainedDate: "2025-12-01" }, // 33 days old, 57 until stale
      repairEstimate: { obtainedDate: null }, // missing
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    const daysUntil = getDaysUntilSoonestExpiration(evidenceHealth);
    expect(daysUntil).toBe(25); // Only considers fresh items
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ITEM DETAILS
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence Item Details", () => {
  const referenceDate = "2026-01-03";

  it("should return all 5 items in PRD order", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null },
      titleCommitment: { obtainedDate: null },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: null },
      repairEstimate: { obtainedDate: null },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    expect(evidenceHealth.items).toHaveLength(5);
    expect(evidenceHealth.items[0].evidence_type).toBe("payoff_letter");
    expect(evidenceHealth.items[1].evidence_type).toBe("title_commitment");
    expect(evidenceHealth.items[2].evidence_type).toBe("insurance_quote");
    expect(evidenceHealth.items[3].evidence_type).toBe("four_point_inspection");
    expect(evidenceHealth.items[4].evidence_type).toBe("repair_estimate");
  });

  it("should include human-readable labels", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null },
      titleCommitment: { obtainedDate: null },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: null },
      repairEstimate: { obtainedDate: null },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    expect(evidenceHealth.items[0].label).toBe("Payoff Letter");
    expect(evidenceHealth.items[1].label).toBe("Title Commitment");
    expect(evidenceHealth.items[2].label).toBe("Insurance Quote");
    expect(evidenceHealth.items[3].label).toBe("Four-Point Inspection");
    expect(evidenceHealth.items[4].label).toBe("Repair Estimate");
  });

  it("should mark first 3 as critical by default", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null },
      titleCommitment: { obtainedDate: null },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: null },
      repairEstimate: { obtainedDate: null },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    expect(evidenceHealth.items[0].is_critical).toBe(true);
    expect(evidenceHealth.items[1].is_critical).toBe(true);
    expect(evidenceHealth.items[2].is_critical).toBe(true);
    expect(evidenceHealth.items[3].is_critical).toBe(false);
    expect(evidenceHealth.items[4].is_critical).toBe(false);
  });

  it("should set correct freshness thresholds per type", () => {
    const input: EvidenceHealthInput = {
      payoffLetter: { obtainedDate: null },
      titleCommitment: { obtainedDate: null },
      insuranceQuote: { obtainedDate: null },
      fourPointInspection: { obtainedDate: null },
      repairEstimate: { obtainedDate: null },
      referenceDate,
    };
    const { evidenceHealth } = computeEvidenceHealth(input);

    expect(evidenceHealth.items[0].freshness_threshold_days).toBe(30); // payoff
    expect(evidenceHealth.items[1].freshness_threshold_days).toBe(60); // title
    expect(evidenceHealth.items[2].freshness_threshold_days).toBe(30); // insurance
    expect(evidenceHealth.items[3].freshness_threshold_days).toBe(90); // four-point
    expect(evidenceHealth.items[4].freshness_threshold_days).toBe(60); // repair
  });
});
