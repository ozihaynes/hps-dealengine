/**
 * computeMotivationScore - Calculate seller motivation score
 * @module lib/engine/computeMotivationScore
 * @slice 07 of 22
 *
 * Principles Applied:
 * - DETERMINISM: Same input -> Same output, always
 * - PURITY: No side effects, no API calls, no state mutations
 * - AUDITABILITY: Returns full breakdown for transparency
 * - DEFENSIVE: Handles null, undefined, NaN gracefully
 *
 * Algorithm:
 * score = (base_score * timeline_multiplier * decision_maker_factor)
 *         + distress_bonus + foreclosure_boost
 *
 * Output: Clamped to 0-100, rounded to integer
 */

import type {
  ReasonForSelling,
  SellerTimeline,
  DecisionMakerStatus,
  MotivationLevel,
  ConfidenceLevel,
  MotivationScoreInput,
  MotivationScoreOutput,
} from '@hps-internal/contracts';

import {
  REASON_FOR_SELLING_OPTIONS,
  SELLER_TIMELINE_OPTIONS,
  DECISION_MAKER_OPTIONS,
  MOTIVATION_MEDIUM_MIN,
  MOTIVATION_HIGH_MIN,
  MOTIVATION_CRITICAL_MIN,
} from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED LOOKUP MAPS (Built from contracts options for O(1) access)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base scores by reason for selling.
 * Derived from REASON_FOR_SELLING_OPTIONS.motivationWeight
 */
const REASON_SCORES: Record<ReasonForSelling, number> = REASON_FOR_SELLING_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.motivationWeight;
    return acc;
  },
  {} as Record<ReasonForSelling, number>
);

/**
 * Timeline multipliers.
 * Derived from SELLER_TIMELINE_OPTIONS.multiplier
 */
const TIMELINE_MULTIPLIERS: Record<SellerTimeline, number> = SELLER_TIMELINE_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.multiplier;
    return acc;
  },
  {} as Record<SellerTimeline, number>
);

/**
 * Decision maker factors.
 * Derived from DECISION_MAKER_OPTIONS.factor
 */
const DECISION_MAKER_FACTORS: Record<DecisionMakerStatus, number> = DECISION_MAKER_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.factor;
    return acc;
  },
  {} as Record<DecisionMakerStatus, number>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default base score when reason is null */
const DEFAULT_BASE_SCORE = 50;

/** Bonus for mortgage delinquency */
const DISTRESS_BONUS = 10;

/** Maximum allowed foreclosure boost */
const MAX_FORECLOSURE_BOOST = 25;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute seller motivation score from input data.
 *
 * This is a PURE function - no side effects, deterministic output.
 *
 * @param input - Seller situation data
 * @returns Motivation score with breakdown
 *
 * @example
 * ```ts
 * const result = computeMotivationScore({
 *   reason_for_selling: 'foreclosure',
 *   seller_timeline: 'immediate',
 *   decision_maker_status: 'sole_owner',
 *   mortgage_delinquent: true,
 *   foreclosure_boost: 25,
 * });
 * // result.motivation_score = 100 (capped)
 * // result.motivation_level = 'critical'
 * ```
 */
export function computeMotivationScore(
  input: MotivationScoreInput
): MotivationScoreOutput {
  // === STEP 1: Extract and validate inputs ===
  const {
    reason_for_selling,
    seller_timeline,
    decision_maker_status,
    mortgage_delinquent,
    foreclosure_boost,
  } = input;

  // === STEP 2: Calculate base score ===
  const base_score =
    reason_for_selling !== null
      ? (REASON_SCORES[reason_for_selling] ?? DEFAULT_BASE_SCORE)
      : DEFAULT_BASE_SCORE;

  // === STEP 3: Get timeline multiplier ===
  const timeline_multiplier =
    seller_timeline !== null
      ? (TIMELINE_MULTIPLIERS[seller_timeline] ?? 1.0)
      : 1.0;

  // === STEP 4: Get decision maker factor ===
  const decision_maker_factor =
    decision_maker_status !== null
      ? (DECISION_MAKER_FACTORS[decision_maker_status] ?? 1.0)
      : 1.0;

  // === STEP 5: Calculate distress bonus ===
  const distress_bonus = mortgage_delinquent === true ? DISTRESS_BONUS : 0;

  // === STEP 6: Sanitize foreclosure boost (handle NaN, negative) ===
  const sanitized_boost = sanitizeNumber(foreclosure_boost, 0, 0, MAX_FORECLOSURE_BOOST);

  // === STEP 7: Calculate raw score ===
  const raw_score =
    base_score * timeline_multiplier * decision_maker_factor +
    distress_bonus +
    sanitized_boost;

  // === STEP 8: Clamp and round to integer ===
  const motivation_score = clampToInteger(raw_score, 0, 100);

  // === STEP 9: Derive motivation level ===
  const motivation_level = deriveMotivationLevel(motivation_score);

  // === STEP 10: Calculate confidence ===
  const confidence = deriveConfidence(input);

  // === STEP 11: Identify red flags ===
  const red_flags = identifyRedFlags(input);

  // === RETURN: Full output with breakdown ===
  return {
    motivation_score,
    motivation_level,
    confidence,
    red_flags,
    breakdown: {
      base_score,
      timeline_multiplier,
      decision_maker_factor,
      distress_bonus,
      foreclosure_boost: sanitized_boost,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (Pure, deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a number: handle NaN/undefined, clamp to range.
 */
function sanitizeNumber(
  value: number | undefined | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp value to range and round to integer.
 */
function clampToInteger(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.round(Math.max(min, Math.min(max, value)));
}

/**
 * Derive motivation level from score using contract thresholds.
 */
function deriveMotivationLevel(score: number): MotivationLevel {
  if (score >= MOTIVATION_CRITICAL_MIN) return 'critical';
  if (score >= MOTIVATION_HIGH_MIN) return 'high';
  if (score >= MOTIVATION_MEDIUM_MIN) return 'medium';
  return 'low';
}

/**
 * Derive confidence based on data completeness.
 */
function deriveConfidence(input: MotivationScoreInput): ConfidenceLevel {
  let fieldsProvided = 0;
  const totalFields = 4;

  if (input.reason_for_selling !== null) fieldsProvided++;
  if (input.seller_timeline !== null) fieldsProvided++;
  if (input.decision_maker_status !== null) fieldsProvided++;
  // mortgage_delinquent is boolean - if explicitly set (not undefined), count it
  if (typeof input.mortgage_delinquent === 'boolean') fieldsProvided++;

  const ratio = fieldsProvided / totalFields;
  if (ratio >= 0.75) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

/**
 * Identify red flags from input.
 */
function identifyRedFlags(input: MotivationScoreInput): string[] {
  const flags: string[] = [];

  if (input.seller_timeline === 'testing_market') {
    flags.push('Seller may just be testing the market');
  }

  if (input.seller_timeline === 'no_rush') {
    flags.push('No closing urgency - low motivation');
  }

  if (input.decision_maker_status === 'multiple_parties') {
    flags.push('Multiple decision makers - harder to close');
  }

  if (input.decision_maker_status === 'unknown') {
    flags.push('Decision maker status unknown - verify authority');
  }

  return flags;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED MAPS (For testing and external use)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  REASON_SCORES,
  TIMELINE_MULTIPLIERS,
  DECISION_MAKER_FACTORS,
  DEFAULT_BASE_SCORE,
  DISTRESS_BONUS,
  MAX_FORECLOSURE_BOOST,
};
