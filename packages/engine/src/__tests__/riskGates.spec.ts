/**
 * Risk Gates 8-Taxonomy Tests — V2.5 Wholesaler Dashboard
 *
 * Comprehensive test suite for the risk gates computation module.
 * Tests severity ranking, blocking logic, score calculations, and helper functions.
 *
 * @module __tests__/riskGates.spec
 */

import { describe, it, expect } from "vitest";
import type { RiskGatesInput, RiskGateInput, RiskGateKey, RiskGateSeverity } from "@hps-internal/contracts";
import {
  computeRiskGates,
  validateRiskGatesInput,
  validateRiskGatesPolicy,
  createAllPassInput,
  createAllUnknownInput,
  getGatesRequiringAttention,
  isGateBlocking,
  countGatesAtSeverity,
  hasAnyCritical,
  allGatesPass,
  isAtLeastAsSevere,
  SEVERITY_RANK,
  DEFAULT_RISK_GATES_POLICY,
  type RiskGatesPolicy,
} from "../slices/riskGates";

// ═══════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const passGate: RiskGateInput = { status: "pass", severity: null };
const unknownGate: RiskGateInput = { status: "unknown", severity: null };

function createFailGate(severity: RiskGateSeverity, reason?: string): RiskGateInput {
  return { status: "fail", severity, reason };
}

function createInputWithSingleFail(
  gateKey: RiskGateKey,
  severity: RiskGateSeverity,
  reason?: string
): RiskGatesInput {
  const input = createAllPassInput();
  input[gateKey] = createFailGate(severity, reason);
  return input;
}

function createInputWithSingleUnknown(gateKey: RiskGateKey): RiskGatesInput {
  const input = createAllPassInput();
  input[gateKey] = unknownGate;
  return input;
}

// Default policy for tests
const policy = DEFAULT_RISK_GATES_POLICY;

// ═══════════════════════════════════════════════════════════════════════════
// SEVERITY RANK TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("SEVERITY_RANK constant", () => {
  it("should assign lower rank to more severe levels", () => {
    expect(SEVERITY_RANK.critical).toBeLessThan(SEVERITY_RANK.major);
    expect(SEVERITY_RANK.major).toBeLessThan(SEVERITY_RANK.minor);
  });

  it("should have critical at rank 1", () => {
    expect(SEVERITY_RANK.critical).toBe(1);
  });

  it("should have major at rank 2", () => {
    expect(SEVERITY_RANK.major).toBe(2);
  });

  it("should have minor at rank 3", () => {
    expect(SEVERITY_RANK.minor).toBe(3);
  });
});

describe("isAtLeastAsSevere()", () => {
  it("critical is at least as severe as critical", () => {
    expect(isAtLeastAsSevere("critical", "critical")).toBe(true);
  });

  it("critical is at least as severe as major", () => {
    expect(isAtLeastAsSevere("critical", "major")).toBe(true);
  });

  it("critical is at least as severe as minor", () => {
    expect(isAtLeastAsSevere("critical", "minor")).toBe(true);
  });

  it("major is NOT at least as severe as critical", () => {
    expect(isAtLeastAsSevere("major", "critical")).toBe(false);
  });

  it("major is at least as severe as major", () => {
    expect(isAtLeastAsSevere("major", "major")).toBe(true);
  });

  it("major is at least as severe as minor", () => {
    expect(isAtLeastAsSevere("major", "minor")).toBe(true);
  });

  it("minor is NOT at least as severe as critical", () => {
    expect(isAtLeastAsSevere("minor", "critical")).toBe(false);
  });

  it("minor is NOT at least as severe as major", () => {
    expect(isAtLeastAsSevere("minor", "major")).toBe(false);
  });

  it("minor is at least as severe as minor", () => {
    expect(isAtLeastAsSevere("minor", "minor")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALL PASS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("All Gates Pass", () => {
  it("should return score of 100 when all gates pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.risk_score).toBe(100);
  });

  it("should return 'low' risk band when all gates pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.risk_band).toBe("low");
  });

  it("should have no blocking gates when all pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.any_blocking).toBe(false);
    expect(riskGates.blocking_gates).toHaveLength(0);
  });

  it("should have correct counts when all pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.pass_count).toBe(8);
    expect(riskGates.fail_count).toBe(0);
    expect(riskGates.unknown_count).toBe(0);
  });

  it("should have null max_severity when all pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.max_severity).toBeNull();
  });

  it("should have no attention gates when all pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.attention_gates).toHaveLength(0);
  });

  it("should recommend 'ready to proceed' when all pass", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.recommended_action).toContain("ready to proceed");
  });

  it("should return all 8 gates in results", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.gates).toHaveLength(8);
    const gateKeys = riskGates.gates.map((g) => g.gate);
    expect(gateKeys).toContain("insurability");
    expect(gateKeys).toContain("title");
    expect(gateKeys).toContain("flood");
    expect(gateKeys).toContain("bankruptcy");
    expect(gateKeys).toContain("liens");
    expect(gateKeys).toContain("condition");
    expect(gateKeys).toContain("market");
    expect(gateKeys).toContain("compliance");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALL UNKNOWN TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("All Gates Unknown", () => {
  it("should apply unknown penalties for all gates", () => {
    const input = createAllUnknownInput();
    const { riskGates } = computeRiskGates(input, policy);

    // 100 - (8 * 10) = 20
    expect(riskGates.risk_score).toBe(20);
  });

  it("should return 'high' risk band when all unknown", () => {
    const input = createAllUnknownInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.risk_band).toBe("high");
  });

  it("should block gates where unknownBlocks is true", () => {
    const input = createAllUnknownInput();
    const { riskGates } = computeRiskGates(input, policy);

    // insurability, title, bankruptcy, liens block on unknown
    expect(riskGates.any_blocking).toBe(true);
    expect(riskGates.blocking_gates).toContain("insurability");
    expect(riskGates.blocking_gates).toContain("title");
    expect(riskGates.blocking_gates).toContain("bankruptcy");
    expect(riskGates.blocking_gates).toContain("liens");
    expect(riskGates.blocking_gates).toHaveLength(4);
  });

  it("should not block gates where unknownBlocks is false", () => {
    const input = createAllUnknownInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.blocking_gates).not.toContain("flood");
    expect(riskGates.blocking_gates).not.toContain("condition");
    expect(riskGates.blocking_gates).not.toContain("market");
    expect(riskGates.blocking_gates).not.toContain("compliance");
  });

  it("should have correct counts when all unknown", () => {
    const input = createAllUnknownInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.pass_count).toBe(0);
    expect(riskGates.fail_count).toBe(0);
    expect(riskGates.unknown_count).toBe(8);
  });

  it("should have all gates in attention list when all unknown", () => {
    const input = createAllUnknownInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.attention_gates).toHaveLength(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE GATE FAILURE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Single Gate Failures", () => {
  describe("Critical Failures", () => {
    it("should apply critical penalty (-25)", () => {
      const input = createInputWithSingleFail("title", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.risk_score).toBe(75); // 100 - 25
    });

    it("should block on critical failure (above major threshold)", () => {
      const input = createInputWithSingleFail("title", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.any_blocking).toBe(true);
      expect(riskGates.blocking_gates).toContain("title");
    });

    it("should set max_severity to critical", () => {
      const input = createInputWithSingleFail("title", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.max_severity).toBe("critical");
    });

    it("should have critical_count of 1", () => {
      const input = createInputWithSingleFail("title", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.critical_count).toBe(1);
      expect(riskGates.major_count).toBe(0);
      expect(riskGates.minor_count).toBe(0);
    });
  });

  describe("Major Failures", () => {
    it("should apply major penalty (-15)", () => {
      const input = createInputWithSingleFail("flood", "major");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.risk_score).toBe(85); // 100 - 15
    });

    it("should block on major failure (at major threshold)", () => {
      const input = createInputWithSingleFail("flood", "major");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.any_blocking).toBe(true);
      expect(riskGates.blocking_gates).toContain("flood");
    });

    it("should set max_severity to major", () => {
      const input = createInputWithSingleFail("flood", "major");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.max_severity).toBe("major");
    });

    it("should have major_count of 1", () => {
      const input = createInputWithSingleFail("flood", "major");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.critical_count).toBe(0);
      expect(riskGates.major_count).toBe(1);
      expect(riskGates.minor_count).toBe(0);
    });
  });

  describe("Minor Failures", () => {
    it("should apply minor penalty (-5)", () => {
      const input = createInputWithSingleFail("condition", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.risk_score).toBe(95); // 100 - 5
    });

    it("should NOT block on minor failure (below major threshold)", () => {
      const input = createInputWithSingleFail("condition", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.any_blocking).toBe(false);
      expect(riskGates.blocking_gates).not.toContain("condition");
    });

    it("should set max_severity to minor", () => {
      const input = createInputWithSingleFail("condition", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.max_severity).toBe("minor");
    });

    it("should have minor_count of 1", () => {
      const input = createInputWithSingleFail("condition", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.critical_count).toBe(0);
      expect(riskGates.major_count).toBe(0);
      expect(riskGates.minor_count).toBe(1);
    });

    it("should still include in attention_gates even if not blocking", () => {
      const input = createInputWithSingleFail("condition", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.attention_gates).toContain("condition");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKING LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Blocking Logic", () => {
  describe("Pass Never Blocks", () => {
    it("should never block a passing gate", () => {
      const input = createAllPassInput();
      const { riskGates } = computeRiskGates(input, policy);

      for (const gate of riskGates.gates) {
        expect(gate.is_blocking).toBe(false);
      }
    });
  });

  describe("Unknown Blocking Based on Policy", () => {
    it("should block unknown insurability (unknownBlocks=true)", () => {
      const input = createInputWithSingleUnknown("insurability");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).toContain("insurability");
    });

    it("should block unknown title (unknownBlocks=true)", () => {
      const input = createInputWithSingleUnknown("title");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).toContain("title");
    });

    it("should block unknown bankruptcy (unknownBlocks=true)", () => {
      const input = createInputWithSingleUnknown("bankruptcy");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).toContain("bankruptcy");
    });

    it("should block unknown liens (unknownBlocks=true)", () => {
      const input = createInputWithSingleUnknown("liens");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).toContain("liens");
    });

    it("should NOT block unknown flood (unknownBlocks=false)", () => {
      const input = createInputWithSingleUnknown("flood");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).not.toContain("flood");
      expect(riskGates.any_blocking).toBe(false);
    });

    it("should NOT block unknown condition (unknownBlocks=false)", () => {
      const input = createInputWithSingleUnknown("condition");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).not.toContain("condition");
      expect(riskGates.any_blocking).toBe(false);
    });

    it("should NOT block unknown market (unknownBlocks=false)", () => {
      const input = createInputWithSingleUnknown("market");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).not.toContain("market");
      expect(riskGates.any_blocking).toBe(false);
    });

    it("should NOT block unknown compliance (unknownBlocks=false)", () => {
      const input = createInputWithSingleUnknown("compliance");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).not.toContain("compliance");
      expect(riskGates.any_blocking).toBe(false);
    });
  });

  describe("Fail Blocking Based on Severity", () => {
    it("should block critical failures (threshold=major)", () => {
      const input = createInputWithSingleFail("market", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).toContain("market");
    });

    it("should block major failures (threshold=major)", () => {
      const input = createInputWithSingleFail("market", "major");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).toContain("market");
    });

    it("should NOT block minor failures (threshold=major)", () => {
      const input = createInputWithSingleFail("market", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(riskGates.blocking_gates).not.toContain("market");
    });
  });

  describe("Custom Blocking Threshold", () => {
    it("should block critical when threshold=critical", () => {
      const customPolicy: RiskGatesPolicy = {
        ...policy,
        blockingSeverityThreshold: "critical",
      };
      const input = createInputWithSingleFail("market", "critical");
      const { riskGates } = computeRiskGates(input, customPolicy);

      expect(riskGates.blocking_gates).toContain("market");
    });

    it("should NOT block major when threshold=critical", () => {
      const customPolicy: RiskGatesPolicy = {
        ...policy,
        blockingSeverityThreshold: "critical",
      };
      const input = createInputWithSingleFail("market", "major");
      const { riskGates } = computeRiskGates(input, customPolicy);

      expect(riskGates.blocking_gates).not.toContain("market");
    });

    it("should block minor when threshold=minor", () => {
      const customPolicy: RiskGatesPolicy = {
        ...policy,
        blockingSeverityThreshold: "minor",
      };
      const input = createInputWithSingleFail("market", "minor");
      const { riskGates } = computeRiskGates(input, customPolicy);

      expect(riskGates.blocking_gates).toContain("market");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Score Calculation", () => {
  it("should calculate correct score with mixed failures", () => {
    const input = createAllPassInput();
    input.title = createFailGate("critical"); // -25
    input.flood = createFailGate("major");    // -15
    input.condition = createFailGate("minor"); // -5
    // Total: 100 - 25 - 15 - 5 = 55

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_score).toBe(55);
  });

  it("should calculate correct score with unknown gates", () => {
    const input = createAllPassInput();
    input.title = unknownGate;      // -10
    input.flood = unknownGate;      // -10
    input.condition = unknownGate;  // -10
    // Total: 100 - 30 = 70

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_score).toBe(70);
  });

  it("should clamp score to minimum 0", () => {
    const input: RiskGatesInput = {
      insurability: createFailGate("critical"),
      title: createFailGate("critical"),
      flood: createFailGate("critical"),
      bankruptcy: createFailGate("critical"),
      liens: createFailGate("critical"),
      condition: createFailGate("critical"),
      market: createFailGate("critical"),
      compliance: createFailGate("critical"),
    };
    // 100 - (8 * 25) = 100 - 200 = -100 → clamped to 0

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_score).toBe(0);
  });

  it("should clamp score to maximum 100", () => {
    const customPolicy: RiskGatesPolicy = {
      ...policy,
      baseScore: 150, // Higher than max
    };
    const input = createAllPassInput();

    const { riskGates } = computeRiskGates(input, customPolicy);
    expect(riskGates.risk_score).toBe(100);
  });

  it("should use custom penalty values", () => {
    const customPolicy: RiskGatesPolicy = {
      ...policy,
      penaltyPerCritical: 50,
      penaltyPerMajor: 30,
      penaltyPerMinor: 10,
    };
    const input = createInputWithSingleFail("title", "critical");

    const { riskGates } = computeRiskGates(input, customPolicy);
    expect(riskGates.risk_score).toBe(50); // 100 - 50
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RISK BAND TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Risk Bands", () => {
  it("should return 'low' for score >= 80", () => {
    const input = createInputWithSingleFail("condition", "minor"); // 95
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.risk_band).toBe("low");
  });

  it("should return 'moderate' for score >= 60 and < 80", () => {
    const input = createAllPassInput();
    input.title = createFailGate("major"); // -15
    input.flood = createFailGate("major"); // -15
    // Score: 70

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_band).toBe("moderate");
  });

  it("should return 'elevated' for score >= 40 and < 60", () => {
    const input = createAllPassInput();
    input.title = createFailGate("critical"); // -25
    input.flood = createFailGate("major");    // -15
    input.condition = createFailGate("minor"); // -5
    // Score: 55

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_band).toBe("elevated");
  });

  it("should return 'high' for score >= 20 and < 40", () => {
    const input = createAllPassInput();
    input.insurability = createFailGate("critical"); // -25
    input.title = createFailGate("critical");        // -25
    input.flood = createFailGate("major");           // -15
    // Score: 35

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_band).toBe("high");
  });

  it("should return 'critical' for score < 20", () => {
    const input = createAllPassInput();
    input.insurability = createFailGate("critical"); // -25
    input.title = createFailGate("critical");        // -25
    input.flood = createFailGate("critical");        // -25
    input.bankruptcy = createFailGate("critical");   // -25
    // Score: 0

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.risk_band).toBe("critical");
  });

  it("should use custom band thresholds", () => {
    const customPolicy: RiskGatesPolicy = {
      ...policy,
      lowThreshold: 90,
      moderateThreshold: 70,
      elevatedThreshold: 50,
      highThreshold: 30,
    };
    const input = createInputWithSingleFail("condition", "minor"); // 95

    const { riskGates } = computeRiskGates(input, customPolicy);
    expect(riskGates.risk_band).toBe("low");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TRACE ENTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Trace Entry", () => {
  it("should include rule name RISK_GATES", () => {
    const input = createAllPassInput();
    const { traceEntry } = computeRiskGates(input, policy);

    expect(traceEntry.rule).toBe("RISK_GATES");
  });

  it("should include all gate inputs in used fields", () => {
    const input = createAllPassInput();
    const { traceEntry } = computeRiskGates(input, policy);

    expect(traceEntry.used).toContain("inputs.insurability");
    expect(traceEntry.used).toContain("inputs.title");
    expect(traceEntry.used).toContain("inputs.flood");
    expect(traceEntry.used).toContain("inputs.bankruptcy");
    expect(traceEntry.used).toContain("inputs.liens");
    expect(traceEntry.used).toContain("inputs.condition");
    expect(traceEntry.used).toContain("inputs.market");
    expect(traceEntry.used).toContain("inputs.compliance");
  });

  it("should include per_gate_evaluation with blocking branches", () => {
    const input = createInputWithSingleFail("title", "major");
    const { traceEntry } = computeRiskGates(input, policy);

    const details = traceEntry.details as Record<string, unknown>;
    const perGate = details.per_gate_evaluation as Array<Record<string, unknown>>;

    const titleTrace = perGate.find((g) => g.gate === "title");
    expect(titleTrace).toBeDefined();
    expect(titleTrace!.blocking_branch).toContain("fail_major_blocks");
    expect(titleTrace!.is_blocking).toBe(true);
  });

  it("should include score_calculation breakdown", () => {
    const input = createInputWithSingleFail("title", "critical");
    const { traceEntry } = computeRiskGates(input, policy);

    const details = traceEntry.details as Record<string, unknown>;
    const scoreCalc = details.score_calculation as Record<string, unknown>;

    expect(scoreCalc.base_score).toBe(100);
    expect(scoreCalc.penalty_from_critical).toBe(25);
    expect(scoreCalc.final_score).toBe(75);
  });

  it("should include policy configuration", () => {
    const input = createAllPassInput();
    const { traceEntry } = computeRiskGates(input, policy);

    const details = traceEntry.details as Record<string, unknown>;
    const policyTrace = details.policy as Record<string, unknown>;

    expect(policyTrace.blocking_severity_threshold).toBe("major");
    expect(policyTrace.penalty_per_critical).toBe(25);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Input Validation", () => {
  it("should return no errors for valid input", () => {
    const input = createAllPassInput();
    const errors = validateRiskGatesInput(input);

    expect(errors).toHaveLength(0);
  });

  it("should error when fail status has no severity", () => {
    const input = createAllPassInput();
    input.title = { status: "fail", severity: null };

    const errors = validateRiskGatesInput(input);
    expect(errors).toContain("title: fail status requires severity");
  });

  it("should error when pass status has severity", () => {
    const input = createAllPassInput();
    input.title = { status: "pass", severity: "major" } as RiskGateInput;

    const errors = validateRiskGatesInput(input);
    expect(errors).toContain("title: pass status should not have severity");
  });

  it("should error when unknown status has severity", () => {
    const input = createAllPassInput();
    input.title = { status: "unknown", severity: "minor" } as RiskGateInput;

    const errors = validateRiskGatesInput(input);
    expect(errors).toContain("title: unknown status should not have severity");
  });

  it("should collect multiple errors", () => {
    const input = createAllPassInput();
    input.title = { status: "fail", severity: null };
    input.flood = { status: "pass", severity: "major" } as RiskGateInput;

    const errors = validateRiskGatesInput(input);
    expect(errors).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POLICY VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Policy Validation", () => {
  it("should return no warnings for default policy", () => {
    const warnings = validateRiskGatesPolicy(policy);

    expect(warnings).toHaveLength(0);
  });

  it("should warn on negative penalty values", () => {
    const badPolicy: RiskGatesPolicy = {
      ...policy,
      penaltyPerCritical: -5,
    };

    const warnings = validateRiskGatesPolicy(badPolicy);
    expect(warnings).toContain("penaltyPerCritical cannot be negative");
  });

  it("should warn on incorrect band threshold ordering", () => {
    const badPolicy: RiskGatesPolicy = {
      ...policy,
      lowThreshold: 50,
      moderateThreshold: 60, // Should be less than low
    };

    const warnings = validateRiskGatesPolicy(badPolicy);
    expect(warnings.some((w) => w.includes("descending order"))).toBe(true);
  });

  it("should warn when penalty ordering is wrong", () => {
    const badPolicy: RiskGatesPolicy = {
      ...policy,
      penaltyPerCritical: 5,
      penaltyPerMajor: 10, // Should be less than critical
    };

    const warnings = validateRiskGatesPolicy(badPolicy);
    expect(warnings).toContain("penaltyPerCritical should be >= penaltyPerMajor");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Helper Functions", () => {
  describe("createAllPassInput()", () => {
    it("should create input with all gates passing", () => {
      const input = createAllPassInput();

      expect(input.insurability.status).toBe("pass");
      expect(input.title.status).toBe("pass");
      expect(input.flood.status).toBe("pass");
      expect(input.bankruptcy.status).toBe("pass");
      expect(input.liens.status).toBe("pass");
      expect(input.condition.status).toBe("pass");
      expect(input.market.status).toBe("pass");
      expect(input.compliance.status).toBe("pass");
    });

    it("should have null severity for all gates", () => {
      const input = createAllPassInput();

      expect(input.insurability.severity).toBeNull();
      expect(input.title.severity).toBeNull();
    });
  });

  describe("createAllUnknownInput()", () => {
    it("should create input with all gates unknown", () => {
      const input = createAllUnknownInput();

      expect(input.insurability.status).toBe("unknown");
      expect(input.title.status).toBe("unknown");
      expect(input.flood.status).toBe("unknown");
      expect(input.bankruptcy.status).toBe("unknown");
      expect(input.liens.status).toBe("unknown");
      expect(input.condition.status).toBe("unknown");
      expect(input.market.status).toBe("unknown");
      expect(input.compliance.status).toBe("unknown");
    });
  });

  describe("getGatesRequiringAttention()", () => {
    it("should return empty array when all pass", () => {
      const input = createAllPassInput();
      const { riskGates } = computeRiskGates(input, policy);

      const attention = getGatesRequiringAttention(riskGates);
      expect(attention).toHaveLength(0);
    });

    it("should return failed gates", () => {
      const input = createInputWithSingleFail("title", "major");
      const { riskGates } = computeRiskGates(input, policy);

      const attention = getGatesRequiringAttention(riskGates);
      expect(attention).toHaveLength(1);
      expect(attention[0].gate).toBe("title");
    });

    it("should return unknown gates", () => {
      const input = createInputWithSingleUnknown("flood");
      const { riskGates } = computeRiskGates(input, policy);

      const attention = getGatesRequiringAttention(riskGates);
      expect(attention).toHaveLength(1);
      expect(attention[0].gate).toBe("flood");
    });

    it("should sort blocking gates first", () => {
      const input = createAllPassInput();
      input.title = createFailGate("major");     // blocking
      input.condition = createFailGate("minor"); // not blocking

      const { riskGates } = computeRiskGates(input, policy);
      const attention = getGatesRequiringAttention(riskGates);

      expect(attention[0].gate).toBe("title");
      expect(attention[1].gate).toBe("condition");
    });

    it("should sort by severity within blocking", () => {
      const input = createAllPassInput();
      input.title = createFailGate("major");
      input.flood = createFailGate("critical");

      const { riskGates } = computeRiskGates(input, policy);
      const attention = getGatesRequiringAttention(riskGates);

      expect(attention[0].gate).toBe("flood"); // critical first
      expect(attention[1].gate).toBe("title"); // then major
    });
  });

  describe("isGateBlocking()", () => {
    it("should return true for blocking gate", () => {
      const input = createInputWithSingleFail("title", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(isGateBlocking(riskGates, "title")).toBe(true);
    });

    it("should return false for non-blocking gate", () => {
      const input = createInputWithSingleFail("condition", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(isGateBlocking(riskGates, "condition")).toBe(false);
    });

    it("should return false for passing gate", () => {
      const input = createAllPassInput();
      const { riskGates } = computeRiskGates(input, policy);

      expect(isGateBlocking(riskGates, "title")).toBe(false);
    });
  });

  describe("countGatesAtSeverity()", () => {
    it("should count gates at critical severity", () => {
      const input = createAllPassInput();
      input.title = createFailGate("critical");
      input.flood = createFailGate("critical");

      const { riskGates } = computeRiskGates(input, policy);
      expect(countGatesAtSeverity(riskGates, "critical")).toBe(2);
    });

    it("should count gates at major severity", () => {
      const input = createAllPassInput();
      input.title = createFailGate("major");
      input.flood = createFailGate("critical");

      const { riskGates } = computeRiskGates(input, policy);
      expect(countGatesAtSeverity(riskGates, "major")).toBe(1);
    });

    it("should return 0 when no gates at severity", () => {
      const input = createAllPassInput();
      const { riskGates } = computeRiskGates(input, policy);

      expect(countGatesAtSeverity(riskGates, "critical")).toBe(0);
    });
  });

  describe("hasAnyCritical()", () => {
    it("should return true when critical gate exists", () => {
      const input = createInputWithSingleFail("title", "critical");
      const { riskGates } = computeRiskGates(input, policy);

      expect(hasAnyCritical(riskGates)).toBe(true);
    });

    it("should return false when no critical gates", () => {
      const input = createInputWithSingleFail("title", "major");
      const { riskGates } = computeRiskGates(input, policy);

      expect(hasAnyCritical(riskGates)).toBe(false);
    });

    it("should return false when all pass", () => {
      const input = createAllPassInput();
      const { riskGates } = computeRiskGates(input, policy);

      expect(hasAnyCritical(riskGates)).toBe(false);
    });
  });

  describe("allGatesPass()", () => {
    it("should return true when all gates pass", () => {
      const input = createAllPassInput();
      const { riskGates } = computeRiskGates(input, policy);

      expect(allGatesPass(riskGates)).toBe(true);
    });

    it("should return false when any gate fails", () => {
      const input = createInputWithSingleFail("title", "minor");
      const { riskGates } = computeRiskGates(input, policy);

      expect(allGatesPass(riskGates)).toBe(false);
    });

    it("should return false when any gate is unknown", () => {
      const input = createInputWithSingleUnknown("title");
      const { riskGates } = computeRiskGates(input, policy);

      expect(allGatesPass(riskGates)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDED ACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Recommended Actions", () => {
  it("should recommend resolving critical blockers when present", () => {
    const input = createInputWithSingleFail("title", "critical");
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.recommended_action).toContain("critical");
    expect(riskGates.recommended_action).toContain("Title");
  });

  it("should recommend addressing blocking gates", () => {
    const input = createInputWithSingleFail("flood", "major");
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.recommended_action).toContain("blocking");
    expect(riskGates.recommended_action).toContain("Flood");
  });

  it("should recommend completing assessment when unknown gates", () => {
    const input = createInputWithSingleUnknown("market"); // non-blocking unknown
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.recommended_action).toContain("assessment");
    expect(riskGates.recommended_action).toContain("1");
  });

  it("should recommend review when non-blocking issues exist", () => {
    const input = createInputWithSingleFail("condition", "minor");
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.recommended_action).toContain("Review");
    expect(riskGates.recommended_action).toContain("1");
  });

  it("should recommend 'ready to proceed' when all clear", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    expect(riskGates.recommended_action).toContain("ready to proceed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GATE LABELS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Gate Labels", () => {
  it("should have correct human-readable labels", () => {
    const input = createAllPassInput();
    const { riskGates } = computeRiskGates(input, policy);

    const labels = new Map(riskGates.gates.map((g) => [g.gate, g.label]));

    expect(labels.get("insurability")).toBe("Insurability");
    expect(labels.get("title")).toBe("Title");
    expect(labels.get("flood")).toBe("Flood");
    expect(labels.get("bankruptcy")).toBe("Bankruptcy");
    expect(labels.get("liens")).toBe("Liens");
    expect(labels.get("condition")).toBe("Condition");
    expect(labels.get("market")).toBe("Market");
    expect(labels.get("compliance")).toBe("Compliance");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MAX SEVERITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Max Severity Tracking", () => {
  it("should track max severity as critical when mixed", () => {
    const input = createAllPassInput();
    input.title = createFailGate("critical");
    input.flood = createFailGate("major");
    input.condition = createFailGate("minor");

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.max_severity).toBe("critical");
  });

  it("should track max severity as major when no critical", () => {
    const input = createAllPassInput();
    input.flood = createFailGate("major");
    input.condition = createFailGate("minor");

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.max_severity).toBe("major");
  });

  it("should track max severity as minor when only minor", () => {
    const input = createAllPassInput();
    input.condition = createFailGate("minor");

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.max_severity).toBe("minor");
  });

  it("should return null max severity when only unknowns", () => {
    const input = createAllUnknownInput();

    const { riskGates } = computeRiskGates(input, policy);
    expect(riskGates.max_severity).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REASON PASSTHROUGH TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Reason Passthrough", () => {
  it("should include reason in gate result", () => {
    const input = createInputWithSingleFail("title", "major", "Lien found on property");
    const { riskGates } = computeRiskGates(input, policy);

    const titleGate = riskGates.gates.find((g) => g.gate === "title");
    expect(titleGate?.reason).toBe("Lien found on property");
  });

  it("should return null reason when not provided", () => {
    const input = createInputWithSingleFail("title", "major");
    const { riskGates } = computeRiskGates(input, policy);

    const titleGate = riskGates.gates.find((g) => g.gate === "title");
    expect(titleGate?.reason).toBeNull();
  });
});
