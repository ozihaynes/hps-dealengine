/**
 * computeMotivationScore Tests
 * @module lib/engine/computeMotivationScore.test
 * @slice 07 of 22
 *
 * Test Categories:
 * - Determinism: Same input -> Same output
 * - Boundaries: 0-100 clamping
 * - Edge cases: Null/undefined/NaN inputs
 * - Algorithm: Score calculation accuracy
 * - Levels: Motivation level derivation
 * - Confidence: Data completeness assessment
 * - Red Flags: Warning identification
 */

import { describe, it, expect } from 'vitest';
import {
  computeMotivationScore,
  REASON_SCORES,
  TIMELINE_MULTIPLIERS,
  DECISION_MAKER_FACTORS,
  DEFAULT_BASE_SCORE,
  DISTRESS_BONUS,
  MAX_FORECLOSURE_BOOST,
} from './computeMotivationScore';
import type { MotivationScoreInput } from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const createInput = (
  overrides: Partial<MotivationScoreInput> = {}
): MotivationScoreInput => ({
  reason_for_selling: 'inherited',
  seller_timeline: 'flexible',
  decision_maker_status: 'sole_owner',
  mortgage_delinquent: false,
  foreclosure_boost: 0,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Determinism', () => {
  it('returns identical output for identical input (10 iterations)', () => {
    const input = createInput({
      reason_for_selling: 'foreclosure',
      seller_timeline: 'immediate',
      decision_maker_status: 'sole_owner',
      mortgage_delinquent: true,
      foreclosure_boost: 25,
    });

    const results = Array.from({ length: 10 }, () =>
      computeMotivationScore(input)
    );
    const firstResult = JSON.stringify(results[0]);

    results.forEach((result) => {
      expect(JSON.stringify(result)).toBe(firstResult);
    });
  });

  it('returns integer score (no floating point issues)', () => {
    const inputs: MotivationScoreInput[] = [
      createInput({ reason_for_selling: 'downsizing', seller_timeline: 'urgent' }),
      createInput({ reason_for_selling: 'inherited', seller_timeline: 'immediate' }),
      createInput({ reason_for_selling: 'relocation', seller_timeline: 'flexible' }),
    ];

    inputs.forEach((input) => {
      const result = computeMotivationScore(input);
      expect(Number.isInteger(result.motivation_score)).toBe(true);
    });
  });

  it('is a pure function (no side effects)', () => {
    const input = createInput();
    const inputCopy = JSON.stringify(input);

    computeMotivationScore(input);

    expect(JSON.stringify(input)).toBe(inputCopy);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Boundaries', () => {
  it('clamps score to maximum 100', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'foreclosure', // 100 (motivationWeight)
      seller_timeline: 'immediate', // 1.5x
      decision_maker_status: 'sole_owner', // 1.0x
      mortgage_delinquent: true, // +10
      foreclosure_boost: 25, // +25
    });
    // Raw: 100 * 1.5 * 1.0 + 10 + 25 = 185 -> clamped to 100

    expect(result.motivation_score).toBe(100);
    expect(result.motivation_score).toBeLessThanOrEqual(100);
  });

  it('score never goes below 0', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'other', // 30 (lowest motivationWeight)
      seller_timeline: 'testing_market', // 0.3x
      decision_maker_status: 'multiple_parties', // 0.6x
      mortgage_delinquent: false, // +0
      foreclosure_boost: 0,
    });
    // Raw: 30 * 0.3 * 0.6 = 5.4 -> rounds to 5

    expect(result.motivation_score).toBeGreaterThanOrEqual(0);
  });

  it('handles foreclosure_boost clamped to 0-25', () => {
    const resultNegative = computeMotivationScore(
      createInput({ foreclosure_boost: -50 })
    );
    expect(resultNegative.breakdown.foreclosure_boost).toBe(0);

    const resultOver = computeMotivationScore(
      createInput({ foreclosure_boost: 100 })
    );
    expect(resultOver.breakdown.foreclosure_boost).toBe(MAX_FORECLOSURE_BOOST);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Edge Cases', () => {
  it('handles all null inputs gracefully', () => {
    const result = computeMotivationScore({
      reason_for_selling: null,
      seller_timeline: null,
      decision_maker_status: null,
      mortgage_delinquent: false,
      foreclosure_boost: 0,
    });

    expect(result.motivation_score).toBe(DEFAULT_BASE_SCORE); // 50
    expect(result.confidence).toBe('low');
    expect(result.breakdown.base_score).toBe(DEFAULT_BASE_SCORE);
    expect(result.breakdown.timeline_multiplier).toBe(1.0);
    expect(result.breakdown.decision_maker_factor).toBe(1.0);
  });

  it('handles NaN foreclosure_boost', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'inherited',
      seller_timeline: 'flexible',
      decision_maker_status: 'sole_owner',
      mortgage_delinquent: false,
      foreclosure_boost: NaN,
    });

    expect(result.breakdown.foreclosure_boost).toBe(0);
    expect(Number.isNaN(result.motivation_score)).toBe(false);
  });

  it('handles partial inputs', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'foreclosure',
      seller_timeline: null,
      decision_maker_status: null,
      mortgage_delinquent: true,
      foreclosure_boost: 0,
    });

    expect(result.motivation_score).toBeGreaterThan(0);
    expect(result.confidence).toBe('medium');
  });

  it('handles zero foreclosure_boost correctly', () => {
    const result = computeMotivationScore(createInput({ foreclosure_boost: 0 }));
    expect(result.breakdown.foreclosure_boost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Algorithm', () => {
  it('applies base score from reason correctly', () => {
    const foreclosure = computeMotivationScore(
      createInput({ reason_for_selling: 'foreclosure' })
    );
    const other = computeMotivationScore(
      createInput({ reason_for_selling: 'other' })
    );

    expect(foreclosure.breakdown.base_score).toBe(100);
    expect(other.breakdown.base_score).toBe(30);
    expect(foreclosure.motivation_score).toBeGreaterThan(other.motivation_score);
  });

  it('applies timeline multiplier correctly', () => {
    const immediate = computeMotivationScore(
      createInput({ seller_timeline: 'immediate' })
    );
    const testing = computeMotivationScore(
      createInput({ seller_timeline: 'testing_market' })
    );

    expect(immediate.breakdown.timeline_multiplier).toBe(1.5);
    expect(testing.breakdown.timeline_multiplier).toBe(0.3);
    expect(immediate.motivation_score).toBeGreaterThan(testing.motivation_score);
  });

  it('applies decision maker factor correctly', () => {
    const sole = computeMotivationScore(
      createInput({ decision_maker_status: 'sole_owner' })
    );
    const multiple = computeMotivationScore(
      createInput({ decision_maker_status: 'multiple_parties' })
    );

    expect(sole.breakdown.decision_maker_factor).toBe(1.0);
    expect(multiple.breakdown.decision_maker_factor).toBe(0.6);
    expect(sole.motivation_score).toBeGreaterThan(multiple.motivation_score);
  });

  it('adds distress bonus when mortgage delinquent', () => {
    const withDistress = computeMotivationScore(
      createInput({ mortgage_delinquent: true })
    );
    const withoutDistress = computeMotivationScore(
      createInput({ mortgage_delinquent: false })
    );

    expect(withDistress.breakdown.distress_bonus).toBe(DISTRESS_BONUS);
    expect(withoutDistress.breakdown.distress_bonus).toBe(0);
    expect(withDistress.motivation_score).toBe(
      withoutDistress.motivation_score + DISTRESS_BONUS
    );
  });

  it('adds foreclosure boost correctly', () => {
    const withBoost = computeMotivationScore(
      createInput({ foreclosure_boost: 20 })
    );
    const withoutBoost = computeMotivationScore(
      createInput({ foreclosure_boost: 0 })
    );

    expect(withBoost.breakdown.foreclosure_boost).toBe(20);
    expect(withBoost.motivation_score).toBe(
      withoutBoost.motivation_score + 20
    );
  });

  it('calculates full formula correctly', () => {
    // inherited = 55, flexible = 1.0, sole_owner = 1.0
    // Raw: 55 * 1.0 * 1.0 = 55
    const result = computeMotivationScore(
      createInput({
        reason_for_selling: 'inherited',
        seller_timeline: 'flexible',
        decision_maker_status: 'sole_owner',
        mortgage_delinquent: false,
        foreclosure_boost: 0,
      })
    );

    expect(result.motivation_score).toBe(55);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION LEVEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Motivation Level', () => {
  it('returns "critical" for score >= 85', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'foreclosure',
      seller_timeline: 'immediate',
      decision_maker_status: 'sole_owner',
      mortgage_delinquent: true,
      foreclosure_boost: 0,
    });
    // 100 * 1.5 * 1.0 + 10 = 160 -> clamped to 100

    expect(result.motivation_score).toBeGreaterThanOrEqual(85);
    expect(result.motivation_level).toBe('critical');
  });

  it('returns "high" for score 65-84', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'probate', // 70
      seller_timeline: 'flexible', // 1.0x
      decision_maker_status: 'sole_owner', // 1.0x
      mortgage_delinquent: false,
      foreclosure_boost: 0,
    });
    // Raw: 70 * 1.0 * 1.0 = 70

    expect(result.motivation_score).toBe(70);
    expect(result.motivation_level).toBe('high');
  });

  it('returns "medium" for score 40-64', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'inherited', // 55
      seller_timeline: 'flexible', // 1.0x
      decision_maker_status: 'sole_owner', // 1.0x
      mortgage_delinquent: false,
      foreclosure_boost: 0,
    });
    // Raw: 55 * 1.0 * 1.0 = 55

    expect(result.motivation_score).toBe(55);
    expect(result.motivation_level).toBe('medium');
  });

  it('returns "low" for score < 40', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'other', // 30
      seller_timeline: 'testing_market', // 0.3x
      decision_maker_status: 'multiple_parties', // 0.6x
      mortgage_delinquent: false,
      foreclosure_boost: 0,
    });
    // Raw: 30 * 0.3 * 0.6 = 5.4 -> 5

    expect(result.motivation_score).toBeLessThan(40);
    expect(result.motivation_level).toBe('low');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Confidence', () => {
  it('returns "high" confidence when all 4 fields provided', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'foreclosure',
      seller_timeline: 'immediate',
      decision_maker_status: 'sole_owner',
      mortgage_delinquent: true,
      foreclosure_boost: 0,
    });

    expect(result.confidence).toBe('high');
  });

  it('returns "medium" confidence when 2 fields provided', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'foreclosure',
      seller_timeline: null,
      decision_maker_status: null,
      mortgage_delinquent: true,
      foreclosure_boost: 0,
    });
    // 2 fields: reason_for_selling + mortgage_delinquent
    // ratio = 2/4 = 0.5, which is >= 0.5 -> medium

    expect(result.confidence).toBe('medium');
  });

  it('returns "low" confidence when 0-1 fields provided', () => {
    const result = computeMotivationScore({
      reason_for_selling: null,
      seller_timeline: null,
      decision_maker_status: null,
      mortgage_delinquent: false,
      foreclosure_boost: 0,
    });

    expect(result.confidence).toBe('low');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RED FLAGS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Red Flags', () => {
  it('flags testing_market timeline', () => {
    const result = computeMotivationScore(
      createInput({ seller_timeline: 'testing_market' })
    );

    expect(result.red_flags).toContain('Seller may just be testing the market');
  });

  it('flags no_rush timeline', () => {
    const result = computeMotivationScore(
      createInput({ seller_timeline: 'no_rush' })
    );

    expect(result.red_flags).toContain('No closing urgency - low motivation');
  });

  it('flags multiple_parties', () => {
    const result = computeMotivationScore(
      createInput({ decision_maker_status: 'multiple_parties' })
    );

    expect(result.red_flags).toContain(
      'Multiple decision makers - harder to close'
    );
  });

  it('flags unknown decision maker', () => {
    const result = computeMotivationScore(
      createInput({ decision_maker_status: 'unknown' })
    );

    expect(result.red_flags).toContain(
      'Decision maker status unknown - verify authority'
    );
  });

  it('returns empty array when no red flags', () => {
    const result = computeMotivationScore(createInput());

    expect(result.red_flags).toEqual([]);
  });

  it('returns multiple flags when applicable', () => {
    const result = computeMotivationScore({
      reason_for_selling: 'other',
      seller_timeline: 'testing_market',
      decision_maker_status: 'multiple_parties',
      mortgage_delinquent: false,
      foreclosure_boost: 0,
    });

    expect(result.red_flags.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BREAKDOWN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Breakdown', () => {
  it('returns complete breakdown object', () => {
    const result = computeMotivationScore(createInput());

    expect(result.breakdown).toHaveProperty('base_score');
    expect(result.breakdown).toHaveProperty('timeline_multiplier');
    expect(result.breakdown).toHaveProperty('decision_maker_factor');
    expect(result.breakdown).toHaveProperty('distress_bonus');
    expect(result.breakdown).toHaveProperty('foreclosure_boost');
  });

  it('breakdown values match expected types', () => {
    const result = computeMotivationScore(createInput());

    expect(typeof result.breakdown.base_score).toBe('number');
    expect(typeof result.breakdown.timeline_multiplier).toBe('number');
    expect(typeof result.breakdown.decision_maker_factor).toBe('number');
    expect(typeof result.breakdown.distress_bonus).toBe('number');
    expect(typeof result.breakdown.foreclosure_boost).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Constants', () => {
  it('REASON_SCORES covers all reason types', () => {
    const reasons = [
      'foreclosure',
      'pre_foreclosure',
      'divorce',
      'probate',
      'relocation',
      'downsizing',
      'financial_distress',
      'tired_landlord',
      'inherited',
      'tax_lien',
      'code_violations',
      'health_issues',
      'job_loss',
      'other',
    ] as const;

    reasons.forEach((reason) => {
      expect(REASON_SCORES[reason]).toBeDefined();
      expect(typeof REASON_SCORES[reason]).toBe('number');
    });
  });

  it('TIMELINE_MULTIPLIERS covers all timeline types', () => {
    const timelines = [
      'immediate',
      'urgent',
      'flexible',
      'no_rush',
      'testing_market',
    ] as const;

    timelines.forEach((timeline) => {
      expect(TIMELINE_MULTIPLIERS[timeline]).toBeDefined();
      expect(typeof TIMELINE_MULTIPLIERS[timeline]).toBe('number');
    });
  });

  it('DECISION_MAKER_FACTORS covers all status types', () => {
    const statuses = [
      'sole_owner',
      'joint_decision',
      'power_of_attorney',
      'estate_executor',
      'multiple_parties',
      'unknown',
    ] as const;

    statuses.forEach((status) => {
      expect(DECISION_MAKER_FACTORS[status]).toBeDefined();
      expect(typeof DECISION_MAKER_FACTORS[status]).toBe('number');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMotivationScore - Output Structure', () => {
  it('returns all required output fields', () => {
    const result = computeMotivationScore(createInput());

    expect(result).toHaveProperty('motivation_score');
    expect(result).toHaveProperty('motivation_level');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('red_flags');
    expect(result).toHaveProperty('breakdown');
  });

  it('motivation_score is a number in 0-100 range', () => {
    const result = computeMotivationScore(createInput());

    expect(typeof result.motivation_score).toBe('number');
    expect(result.motivation_score).toBeGreaterThanOrEqual(0);
    expect(result.motivation_score).toBeLessThanOrEqual(100);
  });

  it('motivation_level is valid enum value', () => {
    const result = computeMotivationScore(createInput());
    const validLevels = ['low', 'medium', 'high', 'critical'];

    expect(validLevels).toContain(result.motivation_level);
  });

  it('confidence is valid enum value', () => {
    const result = computeMotivationScore(createInput());
    const validConfidences = ['low', 'medium', 'high'];

    expect(validConfidences).toContain(result.confidence);
  });

  it('red_flags is an array', () => {
    const result = computeMotivationScore(createInput());

    expect(Array.isArray(result.red_flags)).toBe(true);
  });
});
