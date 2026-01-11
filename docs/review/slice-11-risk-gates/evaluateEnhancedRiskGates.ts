/**
 * evaluateEnhancedRiskGates - Evaluate underwriting risk gates
 * @module lib/engine/evaluateEnhancedRiskGates
 * @slice 11 of 22
 *
 * Principles Applied:
 * - DETERMINISM: Same input → Same output, always
 * - PURITY: No side effects, no API calls
 * - COMPOSITION: Uses outputs from other engine functions
 * - TRANSPARENCY: Evaluate ALL gates, no short-circuit
 * - AUDITABILITY: Full results array with summary counts
 *
 * Gate Types:
 * - blocking: Deal cannot proceed without resolution
 * - warning: Proceed with caution, flag for review
 * - evidence: Missing information, needs research
 */

import { LIEN_BLOCKING_THRESHOLD } from './computeLienRisk';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type of risk gate.
 */
export type RiskGateType = 'blocking' | 'warning' | 'evidence';

/**
 * Risk gate definition.
 */
export interface RiskGateDefinition {
  id: string;
  type: RiskGateType;
  threshold: number | null;
  message: string;
}

/**
 * Result of evaluating a single risk gate.
 */
export interface RiskGateResult {
  /** Gate identifier */
  gate: string;
  /** Did the gate pass? */
  passed: boolean;
  /** Gate type (blocking/warning/evidence) */
  type: RiskGateType;
  /** Actual value that was evaluated */
  value: number | boolean | null;
  /** Threshold used for comparison (if applicable) */
  threshold: number | null;
  /** Human-readable message */
  message: string;
}

/**
 * Summary of all gate evaluations.
 */
export interface RiskGateSummary {
  /** Total number of gates evaluated */
  total_gates: number;
  /** Number of gates that passed */
  passed: number;
  /** Number of gates that failed */
  failed: number;
  /** Number of blocking gates that failed */
  blocking_failures: number;
  /** Number of warning gates that failed */
  warning_failures: number;
  /** Number of evidence gates that failed */
  evidence_failures: number;
  /** Detailed results for each gate */
  results: RiskGateResult[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINIMAL INPUT TYPES (Compatible with engine outputs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal motivation output interface for gate evaluation.
 */
export interface MotivationOutputForGates {
  motivation_score: number;
}

/**
 * Minimal foreclosure output interface for gate evaluation.
 */
export interface ForeclosureOutputForGates {
  days_until_estimated_sale: number | null;
}

/**
 * Minimal lien output interface for gate evaluation.
 */
export interface LienOutputForGates {
  total_surviving_liens: number;
  joint_liability_warning: boolean;
}

/**
 * Input for enhanced gate evaluation.
 */
export interface EnhancedGateInput {
  /** Output from computeMotivationScore (or partial) */
  motivationOutput: MotivationOutputForGates | null;
  /** Output from computeForeclosureTimeline (or partial) */
  foreclosureOutput: ForeclosureOutputForGates | null;
  /** Output from computeLienRisk (or partial) */
  lienOutput: LienOutputForGates | null;
  /** Seller's minimum acceptable price */
  sellerStrikePrice: number | null;
  /** Maximum allowable offer (MAO) ceiling */
  maoCeiling: number | null;
  /** Whether title search has been completed */
  titleSearchCompleted: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY-DRIVEN GATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Motivation score threshold - below this is a warning.
 */
export const MOTIVATION_LOW_THRESHOLD = 40;

/**
 * Foreclosure imminent threshold - at or below this is a warning.
 */
export const FORECLOSURE_IMMINENT_THRESHOLD = 30;

/**
 * Risk gate definitions.
 * These are policy-backed constants - changes require approval.
 */
export const RISK_GATES: Record<string, RiskGateDefinition> = {
  LIEN_THRESHOLD: {
    id: 'LIEN_THRESHOLD',
    type: 'blocking',
    threshold: LIEN_BLOCKING_THRESHOLD, // $10,000
    message: 'Total liens exceed blocking threshold',
  },
  HOA_JOINT_LIABILITY: {
    id: 'HOA_JOINT_LIABILITY',
    type: 'warning',
    threshold: null,
    message: 'FL 720.3085 joint liability for HOA/CDD arrears',
  },
  MOTIVATION_LOW: {
    id: 'MOTIVATION_LOW',
    type: 'warning',
    threshold: MOTIVATION_LOW_THRESHOLD,
    message: 'Seller motivation score below threshold',
  },
  FORECLOSURE_IMMINENT: {
    id: 'FORECLOSURE_IMMINENT',
    type: 'warning',
    threshold: FORECLOSURE_IMMINENT_THRESHOLD,
    message: 'Foreclosure sale imminent (<=30 days)',
  },
  TITLE_SEARCH_MISSING: {
    id: 'TITLE_SEARCH_MISSING',
    type: 'evidence',
    threshold: null,
    message: 'Title search not completed',
  },
  SELLER_STRIKE_ABOVE_CEILING: {
    id: 'SELLER_STRIKE_ABOVE_CEILING',
    type: 'blocking',
    threshold: null, // Dynamic, uses maoCeiling
    message: 'Seller strike price exceeds MAO ceiling',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluate all enhanced risk gates.
 *
 * This is a PURE function - no side effects, deterministic output.
 * Evaluates ALL gates (no short-circuit) for transparency.
 *
 * @param input - Aggregated outputs from engine functions
 * @returns Summary of gate evaluations with counts by type
 *
 * @example
 * ```ts
 * const summary = evaluateEnhancedRiskGates({
 *   motivationOutput: { motivation_score: 75 },
 *   foreclosureOutput: { days_until_estimated_sale: 45 },
 *   lienOutput: { total_surviving_liens: 5000, joint_liability_warning: true },
 *   sellerStrikePrice: 200000,
 *   maoCeiling: 220000,
 *   titleSearchCompleted: true,
 * });
 * // summary.blocking_failures = 0
 * // summary.warning_failures = 1 (joint liability)
 * ```
 */
export function evaluateEnhancedRiskGates(
  input: EnhancedGateInput
): RiskGateSummary {
  const results: RiskGateResult[] = [];

  // === GATE 1: LIEN_THRESHOLD (blocking) ===
  results.push(evaluateLienThreshold(input.lienOutput));

  // === GATE 2: HOA_JOINT_LIABILITY (warning) ===
  results.push(evaluateHoaJointLiability(input.lienOutput));

  // === GATE 3: MOTIVATION_LOW (warning) ===
  results.push(evaluateMotivationLow(input.motivationOutput));

  // === GATE 4: FORECLOSURE_IMMINENT (warning) ===
  results.push(evaluateForeclosureImminent(input.foreclosureOutput));

  // === GATE 5: TITLE_SEARCH_MISSING (evidence) ===
  results.push(evaluateTitleSearchMissing(input.titleSearchCompleted));

  // === GATE 6: SELLER_STRIKE_ABOVE_CEILING (blocking) ===
  results.push(
    evaluateSellerStrikeAboveCeiling(input.sellerStrikePrice, input.maoCeiling)
  );

  // === Calculate summary ===
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const blocking_failures = results.filter(
    (r) => !r.passed && r.type === 'blocking'
  ).length;
  const warning_failures = results.filter(
    (r) => !r.passed && r.type === 'warning'
  ).length;
  const evidence_failures = results.filter(
    (r) => !r.passed && r.type === 'evidence'
  ).length;

  return {
    total_gates: results.length,
    passed,
    failed,
    blocking_failures,
    warning_failures,
    evidence_failures,
    results,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL GATE EVALUATORS (Pure, deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GATE 1: LIEN_THRESHOLD
 * Blocking gate - fails if total liens > $10,000
 */
function evaluateLienThreshold(
  lienOutput: LienOutputForGates | null
): RiskGateResult {
  const gate = RISK_GATES.LIEN_THRESHOLD;
  const totalLiens = lienOutput?.total_surviving_liens ?? 0;
  const threshold = gate.threshold ?? LIEN_BLOCKING_THRESHOLD;
  const passed = totalLiens <= threshold;

  return {
    gate: gate.id,
    passed,
    type: gate.type,
    value: totalLiens,
    threshold,
    message: passed
      ? `Total liens ($${totalLiens.toLocaleString()}) within threshold`
      : `${gate.message}: $${totalLiens.toLocaleString()} > $${threshold.toLocaleString()}`,
  };
}

/**
 * GATE 2: HOA_JOINT_LIABILITY
 * Warning gate - fails if FL 720.3085 joint liability applies
 */
function evaluateHoaJointLiability(
  lienOutput: LienOutputForGates | null
): RiskGateResult {
  const gate = RISK_GATES.HOA_JOINT_LIABILITY;
  const hasJointLiability = lienOutput?.joint_liability_warning ?? false;
  const passed = !hasJointLiability;

  return {
    gate: gate.id,
    passed,
    type: gate.type,
    value: hasJointLiability,
    threshold: null,
    message: passed ? 'No HOA/CDD joint liability' : gate.message,
  };
}

/**
 * GATE 3: MOTIVATION_LOW
 * Warning gate - fails if motivation score < 40
 */
function evaluateMotivationLow(
  motivationOutput: MotivationOutputForGates | null
): RiskGateResult {
  const gate = RISK_GATES.MOTIVATION_LOW;
  const score = motivationOutput?.motivation_score ?? 50; // Default to passing
  const threshold = gate.threshold ?? MOTIVATION_LOW_THRESHOLD;
  const passed = score >= threshold;

  return {
    gate: gate.id,
    passed,
    type: gate.type,
    value: score,
    threshold,
    message: passed
      ? `Motivation score (${score}) above threshold`
      : `${gate.message}: ${score} < ${threshold}`,
  };
}

/**
 * GATE 4: FORECLOSURE_IMMINENT
 * Warning gate - fails if sale <= 30 days away
 */
function evaluateForeclosureImminent(
  foreclosureOutput: ForeclosureOutputForGates | null
): RiskGateResult {
  const gate = RISK_GATES.FORECLOSURE_IMMINENT;
  const daysUntilSale = foreclosureOutput?.days_until_estimated_sale ?? null;
  const threshold = gate.threshold ?? FORECLOSURE_IMMINENT_THRESHOLD;

  // Passed if no foreclosure data or > 30 days
  const passed = daysUntilSale === null || daysUntilSale > threshold;

  return {
    gate: gate.id,
    passed,
    type: gate.type,
    value: daysUntilSale,
    threshold,
    message: passed
      ? daysUntilSale === null
        ? 'No foreclosure timeline'
        : `${daysUntilSale} days until sale (above threshold)`
      : `${gate.message}: ${daysUntilSale} days`,
  };
}

/**
 * GATE 5: TITLE_SEARCH_MISSING
 * Evidence gate - fails if title search not completed
 */
function evaluateTitleSearchMissing(
  titleSearchCompleted: boolean
): RiskGateResult {
  const gate = RISK_GATES.TITLE_SEARCH_MISSING;
  const passed = titleSearchCompleted;

  return {
    gate: gate.id,
    passed,
    type: gate.type,
    value: titleSearchCompleted,
    threshold: null,
    message: passed ? 'Title search completed' : gate.message,
  };
}

/**
 * GATE 6: SELLER_STRIKE_ABOVE_CEILING
 * Blocking gate - fails if strike > MAO ceiling
 */
function evaluateSellerStrikeAboveCeiling(
  sellerStrike: number | null,
  maoCeiling: number | null
): RiskGateResult {
  const gate = RISK_GATES.SELLER_STRIKE_ABOVE_CEILING;

  // Can't evaluate if either value is missing
  if (sellerStrike === null || maoCeiling === null) {
    return {
      gate: gate.id,
      passed: true, // Pass by default when data incomplete
      type: gate.type,
      value: null,
      threshold: null,
      message: 'Insufficient data to evaluate strike vs ceiling',
    };
  }

  const passed = sellerStrike <= maoCeiling;

  return {
    gate: gate.id,
    passed,
    type: gate.type,
    value: sellerStrike,
    threshold: maoCeiling,
    message: passed
      ? `Seller strike ($${sellerStrike.toLocaleString()}) within MAO ceiling`
      : `${gate.message}: $${sellerStrike.toLocaleString()} > $${maoCeiling.toLocaleString()}`,
  };
}
