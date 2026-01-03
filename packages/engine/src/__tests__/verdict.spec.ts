/**
 * Deal Verdict Derivation Tests — V2.5 Wholesaler Dashboard
 *
 * Tests for PURSUE/NEEDS_EVIDENCE/PASS derivation, trace emission, and policy handling.
 */
import { describe, it, expect } from "vitest";
import {
  deriveDealVerdict,
  validateDealVerdictInput,
  DEFAULT_DEAL_VERDICT_POLICY,
  type DealVerdictInput,
  type DealVerdictPolicy,
  type RiskSummaryInput,
  type EvidenceSummaryInput,
} from "../slices/verdict";
import type { PriceGeometry } from "@hps-internal/contracts";

/**
 * Helper to create a valid PriceGeometry for testing
 */
function makeValidPriceGeometry(
  overrides: Partial<PriceGeometry> = {}
): PriceGeometry {
  return {
    respect_floor: 150000,
    dominant_floor: "investor",
    floor_investor: 150000,
    floor_payoff: 140000,
    buyer_ceiling: 200000,
    seller_strike: null,
    zopa: 50000,
    zopa_pct_of_arv: 20,
    zopa_exists: true,
    zopa_band: "wide",
    entry_point: 175000,
    entry_point_pct_of_zopa: 50,
    entry_posture: "balanced",
    ...overrides,
  };
}

/**
 * Helper to create a valid input with defaults
 */
function makeInput(overrides: Partial<DealVerdictInput> = {}): DealVerdictInput {
  return {
    workflowState: "ReadyForOffer",
    riskSummary: { overall: "GO", any_blocking: false },
    evidenceSummary: { any_blocking: false, missing_critical: [] },
    spreadCash: 25000,
    confidenceGrade: "A",
    priceGeometry: makeValidPriceGeometry(),
    ...overrides,
  };
}

describe("deriveDealVerdict", () => {
  // ═══════════════════════════════════════════════════════════════
  // PASS VERDICT TESTS (DEAL-KILLERS)
  // ═══════════════════════════════════════════════════════════════

  describe("PASS verdicts (deal-killers)", () => {
    it("returns pass when risk gate STOP and blockOnAnyRiskStop is true", () => {
      const input = makeInput({
        riskSummary: { overall: "WATCH", any_blocking: true },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(verdict.blocking_factors).toContain("Risk gate STOP detected");
    });

    it("returns pass when overall risk is STOP", () => {
      const input = makeInput({
        riskSummary: { overall: "STOP", any_blocking: false },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(verdict.blocking_factors).toContain("Overall risk status is STOP");
    });

    it("returns pass when deal-killer gate (title) is STOP", () => {
      const input = makeInput({
        riskSummary: {
          overall: "WATCH",
          any_blocking: false,
          gates: {
            title: { status: "STOP", reason: "Clouded title" },
            flood: { status: "GO" },
          },
        },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(
        verdict.blocking_factors.some((f) => f.includes("title"))
      ).toBe(true);
    });

    it("returns pass when deal-killer gate (bankruptcy) is STOP", () => {
      const input = makeInput({
        riskSummary: {
          overall: "GO",
          any_blocking: false,
          gates: {
            bankruptcy: { status: "STOP", reason: "Active bankruptcy" },
          },
        },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(
        verdict.blocking_factors.some((f) => f.includes("bankruptcy"))
      ).toBe(true);
    });

    it("returns pass when no ZOPA exists", () => {
      const input = makeInput({
        priceGeometry: makeValidPriceGeometry({
          zopa: null,
          zopa_exists: false,
          zopa_pct_of_arv: null,
        }),
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(
        verdict.blocking_factors.some((f) => f.includes("No ZOPA"))
      ).toBe(true);
    });

    it("returns pass when spread below minimum evidence threshold", () => {
      const input = makeInput({
        spreadCash: 3000, // Below $5k minimum
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(
        verdict.blocking_factors.some((f) => f.includes("Spread"))
      ).toBe(true);
    });

    it("returns pass when ZOPA percentage below threshold", () => {
      const input = makeInput({
        priceGeometry: makeValidPriceGeometry({
          zopa: 5000,
          zopa_pct_of_arv: 2.0, // Below 3% threshold
          zopa_exists: true,
        }),
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(
        verdict.blocking_factors.some(
          (f) => f.includes("ZOPA") && f.includes("below minimum")
        )
      ).toBe(true);
    });

    it("sets high confidence for pass verdicts", () => {
      const input = makeInput({
        riskSummary: { overall: "STOP", any_blocking: true },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(verdict.confidence_pct).toBe(95);
    });

    it("sets risk_acceptable to false for pass verdicts", () => {
      const input = makeInput({
        riskSummary: { overall: "STOP", any_blocking: true },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.risk_acceptable).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // NEEDS_EVIDENCE VERDICT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("NEEDS_EVIDENCE verdicts", () => {
    it("returns needs_evidence when workflow state is NeedsInfo", () => {
      const input = makeInput({
        workflowState: "NeedsInfo",
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("NeedsInfo");
    });

    it("returns needs_evidence when confidence grade is C", () => {
      const input = makeInput({
        confidenceGrade: "C",
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("Confidence grade C is at or below threshold");
    });

    it("returns needs_evidence when missing critical evidence", () => {
      const input = makeInput({
        evidenceSummary: {
          any_blocking: false,
          missing_critical: ["payoff_letter", "title_commitment"],
        },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("Missing critical evidence");
    });

    it("returns needs_evidence when evidence is blocking", () => {
      const input = makeInput({
        evidenceSummary: { any_blocking: true, missing_critical: [] },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("Evidence freshness is blocking");
    });

    it("returns needs_evidence when workflow state is NeedsReview", () => {
      const input = makeInput({
        workflowState: "NeedsReview",
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("NeedsReview");
    });

    it("returns needs_evidence when spread below pursue threshold but above pass threshold", () => {
      const input = makeInput({
        spreadCash: 10000, // Between $5k and $15k
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("Spread");
    });

    it("sets evidence_complete to false when missing critical evidence", () => {
      const input = makeInput({
        evidenceSummary: {
          any_blocking: false,
          missing_critical: ["payoff_letter"],
        },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.evidence_complete).toBe(false);
    });

    it("calculates confidence based on number of reasons", () => {
      const inputFewReasons = makeInput({
        workflowState: "NeedsInfo",
      });

      const inputManyReasons = makeInput({
        workflowState: "NeedsInfo",
        confidenceGrade: "C",
        evidenceSummary: {
          any_blocking: true,
          missing_critical: ["payoff_letter"],
        },
      });

      const { verdict: verdictFew } = deriveDealVerdict(inputFewReasons);
      const { verdict: verdictMany } = deriveDealVerdict(inputManyReasons);

      // More reasons = lower confidence
      expect(verdictFew.confidence_pct).toBeGreaterThan(verdictMany.confidence_pct);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PURSUE VERDICT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("PURSUE verdicts", () => {
    it("returns pursue when all conditions met", () => {
      const input = makeInput();

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pursue");
      expect(verdict.blocking_factors).toHaveLength(0);
      expect(verdict.confidence_pct).toBeGreaterThanOrEqual(90);
    });

    it("returns pursue with Grade B and good spread", () => {
      const input = makeInput({
        confidenceGrade: "B",
        spreadCash: 30000,
        priceGeometry: makeValidPriceGeometry({
          zopa_pct_of_arv: 8, // Not wide ZOPA, so no +5 bonus
        }),
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pursue");
      expect(verdict.confidence_pct).toBe(80); // Base for Grade B without wide ZOPA bonus
    });

    it("includes spread and ZOPA in pursue rationale", () => {
      const input = makeInput({
        spreadCash: 25000,
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.rationale).toContain("$25,000");
      expect(verdict.rationale).toContain("ZOPA");
    });

    it("sets all status flags to true for pursue", () => {
      const input = makeInput();

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.spread_adequate).toBe(true);
      expect(verdict.evidence_complete).toBe(true);
      expect(verdict.risk_acceptable).toBe(true);
    });

    it("increases confidence for wide ZOPA", () => {
      const inputNormalZopa = makeInput({
        priceGeometry: makeValidPriceGeometry({
          zopa_pct_of_arv: 8,
        }),
      });

      const inputWideZopa = makeInput({
        priceGeometry: makeValidPriceGeometry({
          zopa_pct_of_arv: 15,
        }),
      });

      const { verdict: verdictNormal } = deriveDealVerdict(inputNormalZopa);
      const { verdict: verdictWide } = deriveDealVerdict(inputWideZopa);

      expect(verdictWide.confidence_pct).toBeGreaterThan(
        verdictNormal.confidence_pct
      );
    });

    it("sets primary_reason_code to ALL_CLEAR for pursue", () => {
      const input = makeInput();

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("ALL_CLEAR");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("trace entry emission", () => {
    it("emits trace entry with correct rule name", () => {
      const input = makeInput();

      const { traceEntry } = deriveDealVerdict(input);

      expect(traceEntry.rule).toBe("DEAL_VERDICT");
    });

    it("emits trace entry with input references", () => {
      const input = makeInput();

      const { traceEntry } = deriveDealVerdict(input);

      expect(traceEntry.used).toContain("outputs.workflow_state");
      expect(traceEntry.used).toContain("outputs.risk_summary");
      expect(traceEntry.used).toContain("outputs.spread_cash");
      expect(traceEntry.used).toContain("outputs.price_geometry");
    });

    it("includes inputs in trace details", () => {
      const input = makeInput({
        spreadCash: 25000,
        confidenceGrade: "A",
      });

      const { traceEntry } = deriveDealVerdict(input);
      const details = traceEntry.details as Record<string, unknown>;
      const inputs = details.inputs as Record<string, unknown>;

      expect(inputs.spread_cash).toBe(25000);
      expect(inputs.confidence_grade).toBe("A");
    });

    it("includes evaluation reasons in trace", () => {
      const input = makeInput({
        workflowState: "NeedsInfo",
        evidenceSummary: {
          any_blocking: false,
          missing_critical: ["payoff_letter"],
        },
      });

      const { traceEntry } = deriveDealVerdict(input);
      const details = traceEntry.details as Record<string, unknown>;
      const evaluation = details.evaluation as Record<string, unknown>;

      expect(
        (evaluation.needs_evidence_reasons as string[]).length
      ).toBeGreaterThan(0);
      expect(evaluation.pursue_eligible).toBe(false);
    });

    it("includes result in trace details", () => {
      const input = makeInput();

      const { traceEntry } = deriveDealVerdict(input);
      const details = traceEntry.details as Record<string, unknown>;
      const result = details.result as Record<string, unknown>;

      expect(result.recommendation).toBe("pursue");
      expect(result.primary_reason_code).toBe("ALL_CLEAR");
    });

    it("includes policy values in trace", () => {
      const input = makeInput();

      const { traceEntry } = deriveDealVerdict(input);
      const details = traceEntry.details as Record<string, unknown>;
      const policy = details.policy as Record<string, unknown>;

      expect(policy.min_spread_for_pursue).toBe(15000);
      expect(policy.min_spread_for_evidence).toBe(5000);
      expect(policy.min_zopa_pct_for_pursue).toBe(3.0);
    });

    it("includes status flags in trace", () => {
      const input = makeInput();

      const { traceEntry } = deriveDealVerdict(input);
      const details = traceEntry.details as Record<string, unknown>;
      const statusFlags = details.status_flags as Record<string, unknown>;

      expect(statusFlags.spread_adequate).toBe(true);
      expect(statusFlags.evidence_complete).toBe(true);
      expect(statusFlags.risk_acceptable).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CUSTOM POLICY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("custom policy handling", () => {
    it("respects custom minSpreadForPursue", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        minSpreadForPursue: 50000,
      };

      const input = makeInput({
        spreadCash: 30000, // Below custom $50k threshold
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      expect(verdict.recommendation).toBe("needs_evidence");
    });

    it("respects blockOnAnyRiskStop = false", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        blockOnAnyRiskStop: false,
      };

      const input = makeInput({
        riskSummary: { overall: "WATCH", any_blocking: true },
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      // Should not pass just because of any_blocking when policy says not to block
      expect(verdict.blocking_factors).not.toContain("Risk gate STOP detected");
    });

    it("respects custom deal-killer gates", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        dealKillerGates: ["flood"], // Only flood is deal-killer
      };

      const input = makeInput({
        riskSummary: {
          overall: "GO",
          any_blocking: false,
          gates: {
            title: { status: "STOP", reason: "Clouded" },
            flood: { status: "GO" },
          },
        },
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      // Title STOP should not be a deal-killer with custom policy
      expect(
        verdict.blocking_factors.some((f) => f.includes("title"))
      ).toBe(false);
      expect(verdict.recommendation).toBe("pursue");
    });

    it("respects custom minZopaPctForPursue", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        minZopaPctForPursue: 10.0, // Require 10% ZOPA
      };

      const input = makeInput({
        priceGeometry: makeValidPriceGeometry({
          zopa_pct_of_arv: 5.0, // 5% ZOPA - below custom 10%
          zopa_exists: true,
        }),
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      expect(verdict.recommendation).toBe("pass");
    });

    it("respects custom lowConfidenceGrade (exact match)", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        lowConfidenceGrade: "B", // Threshold is B
      };

      const input = makeInput({
        confidenceGrade: "B", // Exactly at threshold
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("at or below threshold");
    });

    it("triggers needs_evidence for Grade C when threshold is B", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        lowConfidenceGrade: "B", // Threshold is B
      };

      const input = makeInput({
        confidenceGrade: "C", // Worse than B
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      // Grade C should trigger needs_evidence when threshold is B
      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("Confidence grade C");
    });

    it("does not trigger needs_evidence for Grade A when threshold is B", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        lowConfidenceGrade: "B", // Threshold is B
      };

      const input = makeInput({
        confidenceGrade: "A", // Better than B
      });

      const { verdict } = deriveDealVerdict(input, customPolicy);

      // Grade A should NOT trigger needs_evidence
      expect(verdict.recommendation).toBe("pursue");
    });

    it("triggers needs_evidence for all grades when threshold is A", () => {
      const customPolicy: DealVerdictPolicy = {
        ...DEFAULT_DEAL_VERDICT_POLICY,
        lowConfidenceGrade: "A", // Strictest threshold
      };

      // Grade A
      const inputA = makeInput({ confidenceGrade: "A" });
      const { verdict: verdictA } = deriveDealVerdict(inputA, customPolicy);
      expect(verdictA.recommendation).toBe("needs_evidence");

      // Grade B
      const inputB = makeInput({ confidenceGrade: "B" });
      const { verdict: verdictB } = deriveDealVerdict(inputB, customPolicy);
      expect(verdictB.recommendation).toBe("needs_evidence");

      // Grade C
      const inputC = makeInput({ confidenceGrade: "C" });
      const { verdict: verdictC } = deriveDealVerdict(inputC, customPolicy);
      expect(verdictC.recommendation).toBe("needs_evidence");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY TESTS (PASS > NEEDS_EVIDENCE > PURSUE)
  // ═══════════════════════════════════════════════════════════════

  describe("verdict priority ordering", () => {
    it("prioritizes pass over needs_evidence", () => {
      const input = makeInput({
        workflowState: "NeedsInfo", // Would trigger needs_evidence
        riskSummary: { overall: "STOP", any_blocking: true }, // Would trigger pass
        evidenceSummary: {
          any_blocking: true,
          missing_critical: ["payoff"],
        },
        confidenceGrade: "C",
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass"); // Pass takes priority
    });

    it("returns needs_evidence when no pass conditions but has evidence issues", () => {
      const input = makeInput({
        workflowState: "NeedsReview",
        riskSummary: { overall: "GO", any_blocking: false },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
    });

    it("returns pursue only when no pass or needs_evidence conditions", () => {
      const input = makeInput();

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pursue");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles null inputs gracefully", () => {
      const input: DealVerdictInput = {
        workflowState: null,
        riskSummary: null,
        evidenceSummary: null,
        spreadCash: null,
        confidenceGrade: null,
        priceGeometry: null,
      };

      const { verdict } = deriveDealVerdict(input);

      // Should still return a verdict
      expect(["pursue", "needs_evidence", "pass"]).toContain(
        verdict.recommendation
      );
    });

    it("handles empty gates object", () => {
      const input = makeInput({
        riskSummary: { overall: "GO", any_blocking: false, gates: {} },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pursue");
    });

    it("handles undefined missing_critical array", () => {
      const input = makeInput({
        evidenceSummary: { any_blocking: false },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pursue");
    });

    it("handles zero spread", () => {
      const input = makeInput({
        spreadCash: 0,
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
    });

    it("handles exactly threshold spread values", () => {
      // Exactly at evidence threshold
      const inputAtEvidence = makeInput({
        spreadCash: 5000, // Exactly $5k
      });

      const { verdict: verdictEvidence } = deriveDealVerdict(inputAtEvidence);
      expect(verdictEvidence.recommendation).toBe("needs_evidence"); // At threshold = needs_evidence

      // Exactly at pursue threshold
      const inputAtPursue = makeInput({
        spreadCash: 15000, // Exactly $15k
      });

      const { verdict: verdictPursue } = deriveDealVerdict(inputAtPursue);
      expect(verdictPursue.recommendation).toBe("pursue"); // At threshold = pursue
    });

    it("handles multiple pass reasons", () => {
      const input = makeInput({
        riskSummary: { overall: "STOP", any_blocking: true },
        priceGeometry: makeValidPriceGeometry({
          zopa_exists: false,
        }),
        spreadCash: 1000,
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("pass");
      expect(verdict.blocking_factors.length).toBeGreaterThan(1);
      expect(verdict.rationale).toContain("+");
    });

    it("handles multiple needs_evidence reasons", () => {
      const input = makeInput({
        workflowState: "NeedsInfo",
        confidenceGrade: "C",
        evidenceSummary: {
          any_blocking: true,
          missing_critical: ["payoff_letter"],
        },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.recommendation).toBe("needs_evidence");
      expect(verdict.rationale).toContain("+");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PRIMARY REASON CODE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe("primary reason code", () => {
    it("sets RISK_BLOCK for risk-related pass", () => {
      const input = makeInput({
        riskSummary: { overall: "STOP", any_blocking: true },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("RISK_BLOCK");
    });

    it("sets NO_ZOPA for ZOPA-related pass", () => {
      const input = makeInput({
        priceGeometry: makeValidPriceGeometry({
          zopa_exists: false,
        }),
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("NO_ZOPA");
    });

    it("sets LOW_SPREAD for spread-related pass", () => {
      const input = makeInput({
        spreadCash: 1000,
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("LOW_SPREAD");
    });

    it("sets WORKFLOW_INCOMPLETE for workflow needs_evidence", () => {
      const input = makeInput({
        workflowState: "NeedsInfo",
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("WORKFLOW_INCOMPLETE");
    });

    it("sets MISSING_EVIDENCE for evidence needs_evidence", () => {
      const input = makeInput({
        evidenceSummary: {
          any_blocking: false,
          missing_critical: ["payoff_letter"],
        },
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("MISSING_EVIDENCE");
    });

    it("sets LOW_CONFIDENCE for confidence needs_evidence", () => {
      const input = makeInput({
        confidenceGrade: "C",
      });

      const { verdict } = deriveDealVerdict(input);

      expect(verdict.primary_reason_code).toBe("LOW_CONFIDENCE");
    });
  });
});

describe("validateDealVerdictInput", () => {
  it("returns empty array for valid input", () => {
    const input = makeInput();
    const errors = validateDealVerdictInput(input);

    expect(errors).toHaveLength(0);
  });

  it("returns error for negative spreadCash", () => {
    const input = makeInput({ spreadCash: -100 });
    const errors = validateDealVerdictInput(input);

    expect(errors).toContain("spreadCash cannot be negative");
  });

  it("returns error for invalid confidenceGrade", () => {
    const input = makeInput({ confidenceGrade: "D" as "A" });
    const errors = validateDealVerdictInput(input);

    expect(errors).toContain("confidenceGrade must be A, B, or C");
  });

  it("returns error for invalid workflowState", () => {
    const input = makeInput({
      workflowState: "Invalid" as "ReadyForOffer",
    });
    const errors = validateDealVerdictInput(input);

    expect(errors).toContain(
      "workflowState must be NeedsInfo, NeedsReview, or ReadyForOffer"
    );
  });

  it("returns error for invalid risk overall", () => {
    const input = makeInput({
      riskSummary: { overall: "INVALID" as "GO" },
    });
    const errors = validateDealVerdictInput(input);

    expect(errors).toContain(
      "riskSummary.overall must be GO, WATCH, STOP, or UNKNOWN"
    );
  });

  it("allows null values without error", () => {
    const input: DealVerdictInput = {
      workflowState: null,
      riskSummary: null,
      evidenceSummary: null,
      spreadCash: null,
      confidenceGrade: null,
      priceGeometry: null,
    };
    const errors = validateDealVerdictInput(input);

    expect(errors).toHaveLength(0);
  });

  it("returns multiple errors for multiple issues", () => {
    const input = makeInput({
      spreadCash: -100,
      confidenceGrade: "D" as "A",
    });
    const errors = validateDealVerdictInput(input);

    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
