/**
 * Comp Quality Scorer — V2.5 Wholesaler Dashboard
 *
 * Performs Fannie Mae-style quality assessment of comparable sales.
 * Evaluates comps based on:
 * - Proximity (distance from subject)
 * - Recency (age of sale)
 * - Similarity (sqft variance)
 * - Count (number of comps)
 *
 * Produces a quality score (0-100) and band (excellent/good/fair/poor).
 *
 * @module slices/compQuality
 * @trace COMP_QUALITY
 */

import type {
  CompQuality,
  CompQualityBand,
  CompQualityScoringMethod,
} from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simplified comp record for quality scoring.
 * Only needs the fields relevant to quality assessment.
 */
export interface CompForScoring {
  /** Distance from subject property in miles */
  distance_miles: number;
  /** Age of sale in days */
  age_days: number;
  /** Square footage of comp */
  sqft: number;
  /** Optional: sale price for weighting */
  sale_price?: number;
}

/**
 * Input parameters for comp quality scoring.
 */
export interface CompQualityInput {
  /** Array of comparable sales to evaluate */
  comps: CompForScoring[];
  /** Subject property square footage */
  subjectSqft: number;
}

/**
 * Result of comp quality computation with trace data.
 */
export interface CompQualityResult {
  /** Computed comp quality */
  compQuality: CompQuality;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
}

// ═══════════════════════════════════════════════════════════════════════════
// POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Policy tokens for comp quality scoring.
 * Based on Fannie Mae appraisal guidelines.
 */
export interface CompQualityPolicy {
  // ─────────────────────────────────────────────────────────────
  // DISTANCE PENALTIES
  // ─────────────────────────────────────────────────────────────
  /** Ideal distance threshold (no penalty) in miles */
  distanceIdealMiles: number;
  /** Penalty points per 0.5mi over ideal */
  distancePenaltyPer05Mi: number;
  /** Maximum distance penalty points */
  distanceMaxPenalty: number;

  // ─────────────────────────────────────────────────────────────
  // AGE PENALTIES
  // ─────────────────────────────────────────────────────────────
  /** Ideal age threshold (no penalty) in days */
  ageIdealDays: number;
  /** Penalty points per 30 days over ideal */
  agePenaltyPer30Days: number;
  /** Maximum age penalty points */
  ageMaxPenalty: number;

  // ─────────────────────────────────────────────────────────────
  // SQFT VARIANCE PENALTIES
  // ─────────────────────────────────────────────────────────────
  /** Ideal sqft variance threshold (no penalty) as percentage */
  sqftVarianceIdealPct: number;
  /** Penalty points per 10% variance over ideal */
  sqftPenaltyPer10Pct: number;
  /** Maximum sqft variance penalty points */
  sqftMaxPenalty: number;

  // ─────────────────────────────────────────────────────────────
  // COMP COUNT ADJUSTMENTS
  // ─────────────────────────────────────────────────────────────
  /** Minimum comps required (below = penalty) */
  minCompsRequired: number;
  /** Penalty for having fewer than minimum comps */
  lowCompCountPenalty: number;
  /** Bonus for having 5+ comps */
  highCompCountBonus: number;
  /** Threshold for high comp count bonus */
  highCompCountThreshold: number;

  // ─────────────────────────────────────────────────────────────
  // QUALITY BANDS
  // ─────────────────────────────────────────────────────────────
  /** Minimum score for "excellent" band */
  excellentThreshold: number;
  /** Minimum score for "good" band */
  goodThreshold: number;
  /** Minimum score for "fair" band */
  fairThreshold: number;
  // Below fairThreshold = "poor"

  // ─────────────────────────────────────────────────────────────
  // CONFIDENCE THRESHOLD
  // ─────────────────────────────────────────────────────────────
  /** Minimum score required for confidence grade A */
  confidenceAThreshold: number;
}

/**
 * Default policy values based on Fannie Mae guidelines.
 */
export const DEFAULT_COMP_QUALITY_POLICY: CompQualityPolicy = {
  // Distance: Ideal ≤0.5mi, -5pts per 0.5mi over, max -30pts
  distanceIdealMiles: 0.5,
  distancePenaltyPer05Mi: 5,
  distanceMaxPenalty: 30,

  // Age: Ideal ≤90 days, -5pts per 30 days over, max -30pts
  ageIdealDays: 90,
  agePenaltyPer30Days: 5,
  ageMaxPenalty: 30,

  // Sqft: Ideal ≤10% variance, -10pts per 10% over, max -20pts
  sqftVarianceIdealPct: 10,
  sqftPenaltyPer10Pct: 10,
  sqftMaxPenalty: 20,

  // Comp count: Need 3+, bonus for 5+
  minCompsRequired: 3,
  lowCompCountPenalty: 20,
  highCompCountBonus: 10,
  highCompCountThreshold: 5,

  // Quality bands
  excellentThreshold: 80,
  goodThreshold: 60,
  fairThreshold: 40,

  // Confidence threshold
  confidenceAThreshold: 70,
};

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detailed scoring breakdown for a single comp.
 */
interface CompScoreDetail {
  /** Index of comp in array */
  index: number;
  /** Distance from subject */
  distance_miles: number;
  /** Age of sale */
  age_days: number;
  /** Square footage */
  sqft: number;
  /** Sqft variance from subject as percentage */
  sqft_variance_pct: number;
  /** Distance penalty applied */
  distance_penalty: number;
  /** Age penalty applied */
  age_penalty: number;
  /** Sqft penalty applied */
  sqft_penalty: number;
  /** Total penalty for this comp */
  total_penalty: number;
  /** Individual comp score (100 - penalties) */
  comp_score: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rounds to 2 decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates average of an array of numbers.
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Scores an individual comparable sale.
 */
function scoreIndividualComp(
  comp: CompForScoring,
  subjectSqft: number,
  index: number,
  policy: CompQualityPolicy
): CompScoreDetail {
  // Calculate sqft variance
  const sqftVariancePct =
    subjectSqft > 0
      ? Math.abs((comp.sqft - subjectSqft) / subjectSqft) * 100
      : 0;

  // Calculate distance penalty
  const distanceOver = Math.max(
    0,
    comp.distance_miles - policy.distanceIdealMiles
  );
  const distancePenalty = Math.min(
    policy.distanceMaxPenalty,
    Math.floor(distanceOver / 0.5) * policy.distancePenaltyPer05Mi
  );

  // Calculate age penalty
  const ageOver = Math.max(0, comp.age_days - policy.ageIdealDays);
  const agePenalty = Math.min(
    policy.ageMaxPenalty,
    Math.floor(ageOver / 30) * policy.agePenaltyPer30Days
  );

  // Calculate sqft penalty
  const sqftOver = Math.max(0, sqftVariancePct - policy.sqftVarianceIdealPct);
  const sqftPenalty = Math.min(
    policy.sqftMaxPenalty,
    Math.floor(sqftOver / 10) * policy.sqftPenaltyPer10Pct
  );

  // Total penalty and score
  const totalPenalty = distancePenalty + agePenalty + sqftPenalty;
  const compScore = Math.max(0, 100 - totalPenalty);

  return {
    index,
    distance_miles: comp.distance_miles,
    age_days: comp.age_days,
    sqft: comp.sqft,
    sqft_variance_pct: round2(sqftVariancePct),
    distance_penalty: distancePenalty,
    age_penalty: agePenalty,
    sqft_penalty: sqftPenalty,
    total_penalty: totalPenalty,
    comp_score: compScore,
  };
}

/**
 * Determines quality band based on final score.
 */
function determineQualityBand(
  score: number,
  policy: CompQualityPolicy
): CompQualityBand {
  if (score >= policy.excellentThreshold) return "excellent";
  if (score >= policy.goodThreshold) return "good";
  if (score >= policy.fairThreshold) return "fair";
  return "poor";
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes comp quality score using Fannie Mae-style methodology.
 *
 * Scoring Algorithm:
 * 1. Start each comp at 100 points
 * 2. Apply distance penalty: -5pts per 0.5mi over 0.5mi (max -30)
 * 3. Apply age penalty: -5pts per 30 days over 90 days (max -30)
 * 4. Apply sqft penalty: -10pts per 10% variance over 10% (max -20)
 * 5. Average all comp scores
 * 6. Apply comp count adjustment:
 *    - <3 comps: -20pts
 *    - ≥5 comps: +10pts
 * 7. Clamp final score to 0-100
 * 8. Assign quality band
 *
 * @param input - Comp quality input parameters
 * @param policy - Policy tokens for scoring thresholds
 * @returns Comp quality result with trace entry
 *
 * @example
 * ```typescript
 * const result = computeCompQuality({
 *   comps: [
 *     { distance_miles: 0.3, age_days: 45, sqft: 1800 },
 *     { distance_miles: 0.7, age_days: 60, sqft: 1750 },
 *     { distance_miles: 0.5, age_days: 30, sqft: 1850 }
 *   ],
 *   subjectSqft: 1800
 * });
 * // result.compQuality.quality_score = 95
 * // result.compQuality.quality_band = 'excellent'
 * ```
 */
export function computeCompQuality(
  input: CompQualityInput,
  policy: CompQualityPolicy = DEFAULT_COMP_QUALITY_POLICY
): CompQualityResult {
  const { comps, subjectSqft } = input;

  // Handle edge case: no comps
  if (comps.length === 0) {
    return createNoCompsResult(policy);
  }

  // ═══════════════════════════════════════════════════════════════
  // SCORE EACH COMP INDIVIDUALLY
  // ═══════════════════════════════════════════════════════════════

  const compScoreDetails: CompScoreDetail[] = comps.map((comp, index) => {
    return scoreIndividualComp(comp, subjectSqft, index, policy);
  });

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE AGGREGATES
  // ═══════════════════════════════════════════════════════════════

  const avgDistanceMiles = average(comps.map((c) => c.distance_miles));
  const avgAgeDays = average(comps.map((c) => c.age_days));
  const avgSqftVariancePct = average(
    compScoreDetails.map((c) => c.sqft_variance_pct)
  );
  const avgCompScore = average(compScoreDetails.map((c) => c.comp_score));

  // Calculate max values for output
  const maxDistanceMiles = Math.max(...comps.map((c) => c.distance_miles));
  const maxAgeDays = Math.max(...comps.map((c) => c.age_days));

  // ═══════════════════════════════════════════════════════════════
  // APPLY COMP COUNT ADJUSTMENT
  // ═══════════════════════════════════════════════════════════════

  let compCountAdjustment = 0;
  let adjustmentReason = "Standard comp count";

  if (comps.length < policy.minCompsRequired) {
    compCountAdjustment = -policy.lowCompCountPenalty;
    adjustmentReason = `Only ${comps.length} comps (need ${policy.minCompsRequired}+)`;
  } else if (comps.length >= policy.highCompCountThreshold) {
    compCountAdjustment = policy.highCompCountBonus;
    adjustmentReason = `${comps.length} comps (bonus for ${policy.highCompCountThreshold}+)`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE FINAL SCORE
  // ═══════════════════════════════════════════════════════════════

  const rawScore = avgCompScore;
  const finalScore = clamp(rawScore + compCountAdjustment, 0, 100);
  const qualityBand = determineQualityBand(finalScore, policy);

  // Calculate component scores for breakdown
  const proximityScore = round2(
    100 - average(compScoreDetails.map((c) => c.distance_penalty))
  );
  const recencyScore = round2(
    100 - average(compScoreDetails.map((c) => c.age_penalty))
  );
  const similarityScore = round2(
    100 - average(compScoreDetails.map((c) => c.sqft_penalty))
  );

  // Check confidence threshold
  const meetsConfidenceThreshold = finalScore >= policy.confidenceAThreshold;

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const compQuality: CompQuality = {
    comp_count: comps.length,
    avg_distance_miles: round2(avgDistanceMiles),
    avg_age_days: round2(avgAgeDays),
    sqft_variance_pct: round2(avgSqftVariancePct),
    quality_score: round2(finalScore),
    quality_band: qualityBand,
    scoring_method: "fannie_mae" as CompQualityScoringMethod,
    meets_confidence_threshold: meetsConfidenceThreshold,
    max_distance_miles: round2(maxDistanceMiles),
    max_age_days: maxAgeDays,
    score_breakdown: {
      recency_score: recencyScore,
      proximity_score: proximityScore,
      similarity_score: similarityScore,
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "COMP_QUALITY",
    used: [
      "inputs.comps",
      "inputs.subject_sqft",
      "policy.distance_thresholds",
      "policy.age_thresholds",
      "policy.sqft_thresholds",
      "policy.comp_count_thresholds",
    ],
    details: {
      inputs: {
        comp_count: comps.length,
        subject_sqft: subjectSqft,
      },
      per_comp_scoring: compScoreDetails,
      aggregates: {
        avg_distance_miles: round2(avgDistanceMiles),
        avg_age_days: round2(avgAgeDays),
        avg_sqft_variance_pct: round2(avgSqftVariancePct),
        avg_comp_score: round2(avgCompScore),
        max_distance_miles: round2(maxDistanceMiles),
        max_age_days: maxAgeDays,
      },
      adjustments: {
        comp_count_adjustment: compCountAdjustment,
        reason: adjustmentReason,
      },
      result: {
        raw_score: round2(rawScore),
        final_score: round2(finalScore),
        quality_band: qualityBand,
        meets_confidence_threshold: meetsConfidenceThreshold,
      },
      score_breakdown: {
        proximity_score: proximityScore,
        recency_score: recencyScore,
        similarity_score: similarityScore,
      },
      policy: {
        distance_ideal_miles: policy.distanceIdealMiles,
        distance_penalty_per_05mi: policy.distancePenaltyPer05Mi,
        distance_max_penalty: policy.distanceMaxPenalty,
        age_ideal_days: policy.ageIdealDays,
        age_penalty_per_30days: policy.agePenaltyPer30Days,
        age_max_penalty: policy.ageMaxPenalty,
        sqft_variance_ideal_pct: policy.sqftVarianceIdealPct,
        sqft_penalty_per_10pct: policy.sqftPenaltyPer10Pct,
        sqft_max_penalty: policy.sqftMaxPenalty,
        min_comps_required: policy.minCompsRequired,
        low_comp_count_penalty: policy.lowCompCountPenalty,
        high_comp_count_bonus: policy.highCompCountBonus,
        high_comp_count_threshold: policy.highCompCountThreshold,
        excellent_threshold: policy.excellentThreshold,
        good_threshold: policy.goodThreshold,
        fair_threshold: policy.fairThreshold,
        confidence_a_threshold: policy.confidenceAThreshold,
      },
    },
  };

  return {
    compQuality,
    traceEntry,
  };
}

/**
 * Creates result for edge case when no comps are provided.
 */
function createNoCompsResult(policy: CompQualityPolicy): CompQualityResult {
  const compQuality: CompQuality = {
    comp_count: 0,
    avg_distance_miles: 0,
    avg_age_days: 0,
    sqft_variance_pct: 0,
    quality_score: 0,
    quality_band: "poor",
    scoring_method: "fannie_mae",
    meets_confidence_threshold: false,
    max_distance_miles: null,
    max_age_days: null,
    score_breakdown: {
      recency_score: 0,
      proximity_score: 0,
      similarity_score: 0,
    },
  };

  const traceEntry: TraceEntry = {
    rule: "COMP_QUALITY",
    used: ["inputs.comps"],
    details: {
      inputs: {
        comp_count: 0,
        subject_sqft: 0,
      },
      per_comp_scoring: [],
      aggregates: {
        avg_distance_miles: 0,
        avg_age_days: 0,
        avg_sqft_variance_pct: 0,
        avg_comp_score: 0,
        max_distance_miles: null,
        max_age_days: null,
      },
      adjustments: {
        comp_count_adjustment: -policy.lowCompCountPenalty,
        reason: "No comps provided",
      },
      result: {
        raw_score: 0,
        final_score: 0,
        quality_band: "poor",
        meets_confidence_threshold: false,
      },
      score_breakdown: {
        proximity_score: 0,
        recency_score: 0,
        similarity_score: 0,
      },
      policy: {
        distance_ideal_miles: policy.distanceIdealMiles,
        age_ideal_days: policy.ageIdealDays,
        sqft_variance_ideal_pct: policy.sqftVarianceIdealPct,
        min_comps_required: policy.minCompsRequired,
      },
    },
  };

  return {
    compQuality,
    traceEntry,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates comp quality input for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Comp quality input to validate
 * @returns Array of validation error messages
 */
export function validateCompQualityInput(input: CompQualityInput): string[] {
  const errors: string[] = [];

  if (input.subjectSqft < 0) {
    errors.push("subjectSqft cannot be negative");
  }

  for (let i = 0; i < input.comps.length; i++) {
    const comp = input.comps[i];
    if (comp.distance_miles < 0) {
      errors.push(`Comp ${i}: distance_miles cannot be negative`);
    }
    if (comp.age_days < 0) {
      errors.push(`Comp ${i}: age_days cannot be negative`);
    }
    if (comp.sqft < 0) {
      errors.push(`Comp ${i}: sqft cannot be negative`);
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates what comp characteristics would achieve a target score.
 * Useful for understanding quality requirements.
 *
 * @param targetScore - Desired quality score
 * @param policy - Scoring policy
 * @returns Ideal comp characteristics
 */
export function calculateIdealCompCharacteristics(
  targetScore: number,
  policy: CompQualityPolicy = DEFAULT_COMP_QUALITY_POLICY
): { maxDistanceMiles: number; maxAgeDays: number; maxSqftVariancePct: number } {
  // For target score, calculate max allowable penalties
  const allowablePenalty = 100 - targetScore;

  // Distribute penalty allowance equally across dimensions
  const penaltyPerDimension = allowablePenalty / 3;

  // Calculate max values based on penalty allowance
  const maxDistanceSteps = Math.floor(
    penaltyPerDimension / policy.distancePenaltyPer05Mi
  );
  const maxDistanceMiles =
    policy.distanceIdealMiles + maxDistanceSteps * 0.5;

  const maxAgeSteps = Math.floor(
    penaltyPerDimension / policy.agePenaltyPer30Days
  );
  const maxAgeDays = policy.ageIdealDays + maxAgeSteps * 30;

  const maxSqftSteps = Math.floor(
    penaltyPerDimension / policy.sqftPenaltyPer10Pct
  );
  const maxSqftVariancePct =
    policy.sqftVarianceIdealPct + maxSqftSteps * 10;

  return {
    maxDistanceMiles: round2(maxDistanceMiles),
    maxAgeDays,
    maxSqftVariancePct: round2(maxSqftVariancePct),
  };
}

/**
 * Determines if comps are sufficient for high-confidence valuation.
 *
 * @param compQuality - Computed comp quality result
 * @param minScore - Minimum required score (default 70)
 * @param minCount - Minimum required comp count (default 3)
 * @returns Whether comps meet sufficiency criteria
 */
export function areCompsSufficient(
  compQuality: CompQuality,
  minScore: number = 70,
  minCount: number = 3
): boolean {
  return (
    compQuality.comp_count >= minCount && compQuality.quality_score >= minScore
  );
}
