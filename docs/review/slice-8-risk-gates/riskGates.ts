/**
 * Risk Gates 8-Taxonomy Calculator — V2.5 Wholesaler Dashboard
 *
 * Computes blocking status for 8 PRD-defined risk gates:
 * 1. Insurability - Property can be insured at acceptable rates
 * 2. Title - Clean title, no encumbrances
 * 3. Flood - Flood zone status and insurance requirements
 * 4. Bankruptcy - No active bankruptcy proceedings
 * 5. Liens - No outstanding liens or judgments
 * 6. Condition - Property condition acceptable for investment
 * 7. Market - Market conditions support investment thesis
 * 8. Compliance - All regulatory requirements met
 *
 * Produces a risk score (0-100), identifies blocking gates, and
 * generates recommended actions.
 *
 * @module slices/riskGates
 * @trace RISK_GATES
 */

import type {
  RiskGateKey,
  RiskGateSeverity,
  RiskGateResult,
  RiskGatesResult,
  RiskGateInput,
  RiskGatesInput,
  RiskBand,
} from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// SEVERITY RANKING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Numeric severity ranks for comparison.
 * LOWER = MORE SEVERE (critical is worst).
 *
 * This pattern prevents string comparison bugs:
 * - "critical" < "major" < "minor" alphabetically is WRONG
 * - SEVERITY_RANK["critical"] < SEVERITY_RANK["major"] is CORRECT
 */
export const SEVERITY_RANK: Record<RiskGateSeverity, number> = {
  critical: 1,
  major: 2,
  minor: 3,
};

/**
 * Checks if severity A is at least as severe as severity B.
 * Uses numeric rank comparison (lower = more severe).
 *
 * Examples:
 * - isAtLeastAsSevere("critical", "major") → true (1 <= 2)
 * - isAtLeastAsSevere("major", "critical") → false (2 <= 1)
 * - isAtLeastAsSevere("major", "major") → true (2 <= 2)
 * - isAtLeastAsSevere("minor", "major") → false (3 <= 2)
 *
 * @param severityA - The severity to test
 * @param severityB - The threshold severity
 * @returns True if A is at least as severe (or more severe) than B
 */
export function isAtLeastAsSevere(
  severityA: RiskGateSeverity,
  severityB: RiskGateSeverity
): boolean {
  // Lower rank number = more severe
  // "at least as severe" means rankA <= rankB
  return SEVERITY_RANK[severityA] <= SEVERITY_RANK[severityB];
}

// ═══════════════════════════════════════════════════════════════════════════
// POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Policy tokens for risk gates computation.
 * Defines blocking behavior and scoring weights.
 */
export interface RiskGatesPolicy {
  // ─────────────────────────────────────────────────────────────
  // BLOCKING CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  /** Minimum severity that blocks deal progression */
  blockingSeverityThreshold: RiskGateSeverity;

  /** Whether unknown status blocks (per gate) */
  unknownBlocks: Record<RiskGateKey, boolean>;

  // ─────────────────────────────────────────────────────────────
  // SCORE WEIGHTS
  // ─────────────────────────────────────────────────────────────
  /** Base score (before penalties) */
  baseScore: number;
  /** Penalty per critical failure */
  penaltyPerCritical: number;
  /** Penalty per major failure */
  penaltyPerMajor: number;
  /** Penalty per minor failure */
  penaltyPerMinor: number;
  /** Penalty per unknown status */
  penaltyPerUnknown: number;

  // ─────────────────────────────────────────────────────────────
  // RISK BAND THRESHOLDS
  // ─────────────────────────────────────────────────────────────
  /** Minimum score for "low" band */
  lowThreshold: number;
  /** Minimum score for "moderate" band */
  moderateThreshold: number;
  /** Minimum score for "elevated" band */
  elevatedThreshold: number;
  /** Minimum score for "high" band */
  highThreshold: number;
  // Below highThreshold = "critical"
}

/**
 * Default policy values based on PRD requirements.
 *
 * Blocking Logic:
 * - Gates with severity >= major (critical or major) block by default
 * - Unknown status blocks for critical gates (insurability, title, bankruptcy, liens)
 *
 * Score Calculation:
 * - Start at 100
 * - Subtract 25 for each critical failure
 * - Subtract 15 for each major failure
 * - Subtract 5 for each minor failure
 * - Subtract 10 for each unknown status
 * - Clamp to 0-100
 */
export const DEFAULT_RISK_GATES_POLICY: RiskGatesPolicy = {
  // Blocking: major and above block
  blockingSeverityThreshold: "major",

  // Unknown blocks for critical gates only
  unknownBlocks: {
    insurability: true,
    title: true,
    flood: false,
    bankruptcy: true,
    liens: true,
    condition: false,
    market: false,
    compliance: false,
  },

  // Score weights
  baseScore: 100,
  penaltyPerCritical: 25,
  penaltyPerMajor: 15,
  penaltyPerMinor: 5,
  penaltyPerUnknown: 10,

  // Risk band thresholds
  lowThreshold: 80,
  moderateThreshold: 60,
  elevatedThreshold: 40,
  highThreshold: 20,
};

// ═══════════════════════════════════════════════════════════════════════════
// GATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for each risk gate.
 */
interface RiskGateConfig {
  key: RiskGateKey;
  label: string;
}

/**
 * Ordered list of risk gates with their labels.
 * Order matches PRD specification.
 */
const RISK_GATE_CONFIGS: RiskGateConfig[] = [
  { key: "insurability", label: "Insurability" },
  { key: "title", label: "Title" },
  { key: "flood", label: "Flood" },
  { key: "bankruptcy", label: "Bankruptcy" },
  { key: "liens", label: "Liens" },
  { key: "condition", label: "Condition" },
  { key: "market", label: "Market" },
  { key: "compliance", label: "Compliance" },
];

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of risk gates computation with trace data.
 */
export interface RiskGatesComputationResult {
  /** Computed risk gates result */
  riskGates: RiskGatesResult;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Determines if a gate should block deal progression.
 *
 * THREE EXPLICIT BRANCHES (traced for debugging):
 * 1. status === "pass" → never blocks
 * 2. status === "unknown" → blocks if unknownBlocks[gateKey] is true
 * 3. status === "fail" → blocks if severity >= blockingSeverityThreshold
 *
 * @param input - Gate input with status and severity
 * @param gateKey - The gate being evaluated
 * @param policy - Policy with blocking configuration
 * @returns Object with blocking decision and the branch taken
 */
function shouldGateBlock(
  input: RiskGateInput,
  gateKey: RiskGateKey,
  policy: RiskGatesPolicy
): { isBlocking: boolean; branch: string } {
  // Branch 1: Pass never blocks
  if (input.status === "pass") {
    return { isBlocking: false, branch: "pass_never_blocks" };
  }

  // Branch 2: Unknown blocks based on policy
  if (input.status === "unknown") {
    const blocks = policy.unknownBlocks[gateKey];
    return {
      isBlocking: blocks,
      branch: blocks ? "unknown_blocks_per_policy" : "unknown_allowed_per_policy",
    };
  }

  // Branch 3: Fail blocks based on severity threshold
  // status === "fail" at this point
  if (input.severity === null) {
    // Fail without severity = treat as blocking (defensive)
    return { isBlocking: true, branch: "fail_missing_severity_blocks" };
  }

  const blocks = isAtLeastAsSevere(input.severity, policy.blockingSeverityThreshold);
  return {
    isBlocking: blocks,
    branch: blocks
      ? `fail_${input.severity}_blocks_threshold_${policy.blockingSeverityThreshold}`
      : `fail_${input.severity}_below_threshold_${policy.blockingSeverityThreshold}`,
  };
}

/**
 * Calculates score contribution for a gate.
 */
function calculateScoreContribution(
  input: RiskGateInput,
  policy: RiskGatesPolicy
): number {
  if (input.status === "pass") {
    return 0; // No penalty for pass
  }

  if (input.status === "unknown") {
    return -policy.penaltyPerUnknown;
  }

  // status === "fail"
  if (input.severity === null) {
    return -policy.penaltyPerCritical; // Treat missing severity as critical
  }

  switch (input.severity) {
    case "critical":
      return -policy.penaltyPerCritical;
    case "major":
      return -policy.penaltyPerMajor;
    case "minor":
      return -policy.penaltyPerMinor;
    default:
      return 0;
  }
}

/**
 * Determines risk band based on score.
 */
function determineRiskBand(score: number, policy: RiskGatesPolicy): RiskBand {
  if (score >= policy.lowThreshold) return "low";
  if (score >= policy.moderateThreshold) return "moderate";
  if (score >= policy.elevatedThreshold) return "elevated";
  if (score >= policy.highThreshold) return "high";
  return "critical";
}

/**
 * Finds the maximum severity among failed gates.
 * Returns null if no gates have failed.
 */
function findMaxSeverity(
  gateResults: RiskGateResult[]
): RiskGateSeverity | null {
  const failedSeverities = gateResults
    .filter((g) => g.status === "fail" && g.severity !== null)
    .map((g) => g.severity as RiskGateSeverity);

  if (failedSeverities.length === 0) return null;

  // Find minimum rank (most severe)
  let maxSeverity: RiskGateSeverity = failedSeverities[0];
  for (const sev of failedSeverities) {
    if (SEVERITY_RANK[sev] < SEVERITY_RANK[maxSeverity]) {
      maxSeverity = sev;
    }
  }

  return maxSeverity;
}

/**
 * Generates recommended action based on gate assessment.
 */
function generateRecommendedAction(
  blockingGates: RiskGateKey[],
  attentionGates: RiskGateKey[],
  maxSeverity: RiskGateSeverity | null,
  unknownCount: number
): string {
  // Priority 1: Critical failures blocking
  const criticalBlocking = blockingGates.filter((key) => {
    const config = RISK_GATE_CONFIGS.find((c) => c.key === key);
    return config !== undefined;
  });

  if (criticalBlocking.length > 0 && maxSeverity === "critical") {
    const labels = criticalBlocking.map(
      (key) => RISK_GATE_CONFIGS.find((c) => c.key === key)?.label ?? key
    );
    return `Resolve critical blockers: ${labels.join(", ")}`;
  }

  // Priority 2: Any blocking gates
  if (blockingGates.length > 0) {
    const labels = blockingGates.map(
      (key) => RISK_GATE_CONFIGS.find((c) => c.key === key)?.label ?? key
    );
    return `Address blocking gates: ${labels.join(", ")}`;
  }

  // Priority 3: Unknown gates needing assessment
  if (unknownCount > 0) {
    return `Complete assessment for ${unknownCount} gate(s)`;
  }

  // Priority 4: Non-blocking attention items
  if (attentionGates.length > 0) {
    return `Review ${attentionGates.length} gate(s) with issues`;
  }

  // All clear
  return "All gates pass — ready to proceed";
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes risk gates assessment for 8 PRD-defined gates.
 *
 * Blocking Logic:
 * - Pass never blocks
 * - Unknown blocks if unknownBlocks[gateKey] is true
 * - Fail blocks if severity >= blockingSeverityThreshold (using rank comparison)
 *
 * Score Calculation:
 * - Start at baseScore (default 100)
 * - Subtract penaltyPerCritical for each critical failure
 * - Subtract penaltyPerMajor for each major failure
 * - Subtract penaltyPerMinor for each minor failure
 * - Subtract penaltyPerUnknown for each unknown status
 * - Clamp to 0-100
 *
 * @param input - Gate inputs for all 8 gates
 * @param policy - Policy tokens for thresholds
 * @returns Risk gates result with trace entry
 *
 * @example
 * ```typescript
 * const result = computeRiskGates({
 *   insurability: { status: "pass", severity: null },
 *   title: { status: "fail", severity: "major", reason: "Lien found" },
 *   flood: { status: "pass", severity: null },
 *   bankruptcy: { status: "unknown", severity: null },
 *   liens: { status: "pass", severity: null },
 *   condition: { status: "fail", severity: "minor", reason: "Minor repairs needed" },
 *   market: { status: "pass", severity: null },
 *   compliance: { status: "pass", severity: null },
 * });
 * // result.riskGates.any_blocking = true (title major, bankruptcy unknown)
 * // result.riskGates.risk_score = ~60
 * ```
 */
export function computeRiskGates(
  input: RiskGatesInput,
  policy: RiskGatesPolicy = DEFAULT_RISK_GATES_POLICY
): RiskGatesComputationResult {
  // ═══════════════════════════════════════════════════════════════
  // EVALUATE EACH GATE
  // ═══════════════════════════════════════════════════════════════

  const inputMap: Record<RiskGateKey, RiskGateInput> = {
    insurability: input.insurability,
    title: input.title,
    flood: input.flood,
    bankruptcy: input.bankruptcy,
    liens: input.liens,
    condition: input.condition,
    market: input.market,
    compliance: input.compliance,
  };

  const perGateTrace: Array<{
    gate: string;
    status: string;
    severity: string | null;
    blocking_branch: string;
    is_blocking: boolean;
    score_contribution: number;
  }> = [];

  const gateResults: RiskGateResult[] = RISK_GATE_CONFIGS.map((config) => {
    const gateInput = inputMap[config.key];
    const { isBlocking, branch } = shouldGateBlock(gateInput, config.key, policy);
    const scoreContribution = calculateScoreContribution(gateInput, policy);

    perGateTrace.push({
      gate: config.key,
      status: gateInput.status,
      severity: gateInput.severity,
      blocking_branch: branch,
      is_blocking: isBlocking,
      score_contribution: scoreContribution,
    });

    return {
      gate: config.key,
      label: config.label,
      status: gateInput.status,
      severity: gateInput.severity,
      is_blocking: isBlocking,
      reason: gateInput.reason ?? null,
      score_contribution: scoreContribution,
    };
  });

  // ═══════════════════════════════════════════════════════════════
  // AGGREGATE COUNTS
  // ═══════════════════════════════════════════════════════════════

  const passCount = gateResults.filter((g) => g.status === "pass").length;
  const failCount = gateResults.filter((g) => g.status === "fail").length;
  const unknownCount = gateResults.filter((g) => g.status === "unknown").length;

  const criticalCount = gateResults.filter(
    (g) => g.status === "fail" && g.severity === "critical"
  ).length;
  const majorCount = gateResults.filter(
    (g) => g.status === "fail" && g.severity === "major"
  ).length;
  const minorCount = gateResults.filter(
    (g) => g.status === "fail" && g.severity === "minor"
  ).length;

  const blockingGates = gateResults
    .filter((g) => g.is_blocking)
    .map((g) => g.gate);

  const anyBlocking = blockingGates.length > 0;

  const attentionGates = gateResults
    .filter((g) => g.status === "fail" || g.status === "unknown")
    .map((g) => g.gate);

  const maxSeverity = findMaxSeverity(gateResults);

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE RISK SCORE
  // ═══════════════════════════════════════════════════════════════

  let rawScore = policy.baseScore;

  for (const gate of gateResults) {
    rawScore += gate.score_contribution;
  }

  const riskScore = Math.round(clamp(rawScore, 0, 100));
  const riskBand = determineRiskBand(riskScore, policy);

  // ═══════════════════════════════════════════════════════════════
  // GENERATE RECOMMENDATION
  // ═══════════════════════════════════════════════════════════════

  const recommendedAction = generateRecommendedAction(
    blockingGates,
    attentionGates,
    maxSeverity,
    unknownCount
  );

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const riskGates: RiskGatesResult = {
    gates: gateResults,
    any_blocking: anyBlocking,
    blocking_gates: blockingGates,
    pass_count: passCount,
    fail_count: failCount,
    unknown_count: unknownCount,
    critical_count: criticalCount,
    major_count: majorCount,
    minor_count: minorCount,
    max_severity: maxSeverity,
    risk_score: riskScore,
    risk_band: riskBand,
    attention_gates: attentionGates,
    recommended_action: recommendedAction,
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "RISK_GATES",
    used: [
      "inputs.insurability",
      "inputs.title",
      "inputs.flood",
      "inputs.bankruptcy",
      "inputs.liens",
      "inputs.condition",
      "inputs.market",
      "inputs.compliance",
      "policy.blocking_severity_threshold",
      "policy.unknown_blocks",
    ],
    details: {
      inputs: {
        insurability: { status: input.insurability.status, severity: input.insurability.severity },
        title: { status: input.title.status, severity: input.title.severity },
        flood: { status: input.flood.status, severity: input.flood.severity },
        bankruptcy: { status: input.bankruptcy.status, severity: input.bankruptcy.severity },
        liens: { status: input.liens.status, severity: input.liens.severity },
        condition: { status: input.condition.status, severity: input.condition.severity },
        market: { status: input.market.status, severity: input.market.severity },
        compliance: { status: input.compliance.status, severity: input.compliance.severity },
      },
      per_gate_evaluation: perGateTrace,
      aggregates: {
        pass_count: passCount,
        fail_count: failCount,
        unknown_count: unknownCount,
        critical_count: criticalCount,
        major_count: majorCount,
        minor_count: minorCount,
        blocking_gates: blockingGates,
        max_severity: maxSeverity,
      },
      score_calculation: {
        base_score: policy.baseScore,
        penalty_from_critical: criticalCount * policy.penaltyPerCritical,
        penalty_from_major: majorCount * policy.penaltyPerMajor,
        penalty_from_minor: minorCount * policy.penaltyPerMinor,
        penalty_from_unknown: unknownCount * policy.penaltyPerUnknown,
        raw_score: rawScore,
        final_score: riskScore,
      },
      result: {
        any_blocking: anyBlocking,
        risk_score: riskScore,
        risk_band: riskBand,
        recommended_action: recommendedAction,
      },
      policy: {
        blocking_severity_threshold: policy.blockingSeverityThreshold,
        unknown_blocks: policy.unknownBlocks,
        base_score: policy.baseScore,
        penalty_per_critical: policy.penaltyPerCritical,
        penalty_per_major: policy.penaltyPerMajor,
        penalty_per_minor: policy.penaltyPerMinor,
        penalty_per_unknown: policy.penaltyPerUnknown,
        low_threshold: policy.lowThreshold,
        moderate_threshold: policy.moderateThreshold,
        elevated_threshold: policy.elevatedThreshold,
        high_threshold: policy.highThreshold,
      },
    },
  };

  return {
    riskGates,
    traceEntry,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates risk gates input for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Risk gates input to validate
 * @returns Array of validation error messages
 */
export function validateRiskGatesInput(input: RiskGatesInput): string[] {
  const errors: string[] = [];

  const gateKeys: RiskGateKey[] = [
    "insurability",
    "title",
    "flood",
    "bankruptcy",
    "liens",
    "condition",
    "market",
    "compliance",
  ];

  for (const key of gateKeys) {
    const gateInput = input[key];

    // Fail status should have severity
    if (gateInput.status === "fail" && gateInput.severity === null) {
      errors.push(`${key}: fail status requires severity`);
    }

    // Pass/unknown should not have severity
    if (gateInput.status !== "fail" && gateInput.severity !== null) {
      errors.push(`${key}: ${gateInput.status} status should not have severity`);
    }
  }

  return errors;
}

/**
 * Validates risk gates policy for correctness.
 * Returns array of validation warnings (empty if valid).
 *
 * @param policy - Risk gates policy to validate
 * @returns Array of validation warnings
 */
export function validateRiskGatesPolicy(policy: RiskGatesPolicy): string[] {
  const warnings: string[] = [];

  // Check all 8 gates have unknownBlocks entries
  const expectedGates: RiskGateKey[] = [
    "insurability",
    "title",
    "flood",
    "bankruptcy",
    "liens",
    "condition",
    "market",
    "compliance",
  ];
  for (const gate of expectedGates) {
    if (policy.unknownBlocks[gate] === undefined) {
      warnings.push(`unknownBlocks missing entry for: ${gate}`);
    }
  }

  // Check score weights are non-negative
  if (policy.penaltyPerCritical < 0) {
    warnings.push("penaltyPerCritical cannot be negative");
  }
  if (policy.penaltyPerMajor < 0) {
    warnings.push("penaltyPerMajor cannot be negative");
  }
  if (policy.penaltyPerMinor < 0) {
    warnings.push("penaltyPerMinor cannot be negative");
  }
  if (policy.penaltyPerUnknown < 0) {
    warnings.push("penaltyPerUnknown cannot be negative");
  }

  // Check band thresholds are in descending order
  if (
    policy.lowThreshold <= policy.moderateThreshold ||
    policy.moderateThreshold <= policy.elevatedThreshold ||
    policy.elevatedThreshold <= policy.highThreshold
  ) {
    warnings.push(
      `Band thresholds must be in descending order: low (${policy.lowThreshold}) > moderate (${policy.moderateThreshold}) > elevated (${policy.elevatedThreshold}) > high (${policy.highThreshold})`
    );
  }

  // Check penalty ordering makes sense (critical >= major >= minor)
  if (policy.penaltyPerCritical < policy.penaltyPerMajor) {
    warnings.push("penaltyPerCritical should be >= penaltyPerMajor");
  }
  if (policy.penaltyPerMajor < policy.penaltyPerMinor) {
    warnings.push("penaltyPerMajor should be >= penaltyPerMinor");
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates an all-pass input for testing/default scenarios.
 */
export function createAllPassInput(): RiskGatesInput {
  const passGate: RiskGateInput = { status: "pass", severity: null };
  return {
    insurability: passGate,
    title: passGate,
    flood: passGate,
    bankruptcy: passGate,
    liens: passGate,
    condition: passGate,
    market: passGate,
    compliance: passGate,
  };
}

/**
 * Creates an all-unknown input for testing/initial scenarios.
 */
export function createAllUnknownInput(): RiskGatesInput {
  const unknownGate: RiskGateInput = { status: "unknown", severity: null };
  return {
    insurability: unknownGate,
    title: unknownGate,
    flood: unknownGate,
    bankruptcy: unknownGate,
    liens: unknownGate,
    condition: unknownGate,
    market: unknownGate,
    compliance: unknownGate,
  };
}

/**
 * Gets list of gates that require attention (failed or unknown).
 *
 * @param riskGates - Computed risk gates result
 * @returns Gates needing attention, sorted by severity (critical first)
 */
export function getGatesRequiringAttention(
  riskGates: RiskGatesResult
): RiskGateResult[] {
  return riskGates.gates
    .filter((g) => g.status === "fail" || g.status === "unknown")
    .sort((a, b) => {
      // Blocking gates first
      if (a.is_blocking && !b.is_blocking) return -1;
      if (!a.is_blocking && b.is_blocking) return 1;

      // Then by severity (using rank)
      const rankA = a.severity ? SEVERITY_RANK[a.severity] : 4; // unknown = 4
      const rankB = b.severity ? SEVERITY_RANK[b.severity] : 4;
      return rankA - rankB;
    });
}

/**
 * Checks if a specific gate is blocking.
 *
 * @param riskGates - Computed risk gates result
 * @param gateKey - Gate to check
 * @returns Whether the gate is blocking
 */
export function isGateBlocking(
  riskGates: RiskGatesResult,
  gateKey: RiskGateKey
): boolean {
  const gate = riskGates.gates.find((g) => g.gate === gateKey);
  return gate?.is_blocking ?? false;
}

/**
 * Counts gates at a specific severity level.
 *
 * @param riskGates - Computed risk gates result
 * @param severity - Severity to count
 * @returns Number of gates at that severity
 */
export function countGatesAtSeverity(
  riskGates: RiskGatesResult,
  severity: RiskGateSeverity
): number {
  return riskGates.gates.filter(
    (g) => g.status === "fail" && g.severity === severity
  ).length;
}

/**
 * Checks if any gate has critical severity.
 *
 * @param riskGates - Computed risk gates result
 * @returns Whether any gate is critical
 */
export function hasAnyCritical(riskGates: RiskGatesResult): boolean {
  return riskGates.critical_count > 0;
}

/**
 * Checks if all gates pass (no failures, no unknowns).
 *
 * @param riskGates - Computed risk gates result
 * @returns Whether all gates pass
 */
export function allGatesPass(riskGates: RiskGatesResult): boolean {
  return riskGates.pass_count === 8 && riskGates.fail_count === 0 && riskGates.unknown_count === 0;
}
