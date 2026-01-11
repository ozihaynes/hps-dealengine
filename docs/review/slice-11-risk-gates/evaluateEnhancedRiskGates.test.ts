/**
 * evaluateEnhancedRiskGates Tests
 * @module lib/engine/evaluateEnhancedRiskGates.test
 * @slice 11 of 22
 *
 * Test Categories:
 * - Determinism: Same input → Same output
 * - Individual Gates: Each gate tested in isolation
 * - Summary Counts: Correct totals by type
 * - Edge Cases: null inputs, boundary conditions
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateEnhancedRiskGates,
  RISK_GATES,
  MOTIVATION_LOW_THRESHOLD,
  FORECLOSURE_IMMINENT_THRESHOLD,
  type EnhancedGateInput,
  type LienOutputForGates,
  type MotivationOutputForGates,
  type ForeclosureOutputForGates,
} from './evaluateEnhancedRiskGates';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

/** Helper to create input with defaults */
const createInput = (
  overrides: Partial<EnhancedGateInput> = {}
): EnhancedGateInput => ({
  motivationOutput: null,
  foreclosureOutput: null,
  lienOutput: null,
  sellerStrikePrice: null,
  maoCeiling: null,
  titleSearchCompleted: true,
  ...overrides,
});

/** Helper to create lien output */
const createLienOutput = (
  overrides: Partial<LienOutputForGates> = {}
): LienOutputForGates => ({
  total_surviving_liens: 0,
  joint_liability_warning: false,
  ...overrides,
});

/** Helper to create motivation output */
const createMotivationOutput = (
  overrides: Partial<MotivationOutputForGates> = {}
): MotivationOutputForGates => ({
  motivation_score: 50,
  ...overrides,
});

/** Helper to create foreclosure output */
const createForeclosureOutput = (
  overrides: Partial<ForeclosureOutputForGates> = {}
): ForeclosureOutputForGates => ({
  days_until_estimated_sale: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - Determinism', () => {
  it('returns identical output for identical input (10 iterations)', () => {
    const input = createInput({
      motivationOutput: createMotivationOutput({ motivation_score: 75 }),
      foreclosureOutput: createForeclosureOutput({
        days_until_estimated_sale: 45,
      }),
      lienOutput: createLienOutput({
        total_surviving_liens: 5000,
        joint_liability_warning: true,
      }),
      sellerStrikePrice: 200000,
      maoCeiling: 220000,
      titleSearchCompleted: true,
    });

    const results = Array.from({ length: 10 }, () =>
      evaluateEnhancedRiskGates(input)
    );
    const firstResult = JSON.stringify(results[0]);

    results.forEach((result) => {
      expect(JSON.stringify(result)).toBe(firstResult);
    });
  });

  it('is a pure function (no side effects)', () => {
    const input = createInput({
      lienOutput: createLienOutput({ total_surviving_liens: 5000 }),
    });
    const inputCopy = JSON.stringify(input);

    evaluateEnhancedRiskGates(input);

    expect(JSON.stringify(input)).toBe(inputCopy);
  });

  it('evaluates ALL gates (no short-circuit)', () => {
    // Even with a blocking failure, all gates should be evaluated
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 50000 }), // Blocking fail
      })
    );

    expect(result.total_gates).toBe(6);
    expect(result.results).toHaveLength(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE 1: LIEN_THRESHOLD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - LIEN_THRESHOLD', () => {
  it('passes when liens = $0', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 0 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    expect(gate?.passed).toBe(true);
    expect(gate?.type).toBe('blocking');
  });

  it('passes when liens = $10,000 (at threshold)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 10000 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    expect(gate?.passed).toBe(true);
  });

  it('fails when liens = $10,001 (above threshold)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 10001 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    expect(gate?.passed).toBe(false);
    expect(gate?.type).toBe('blocking');
    expect(gate?.value).toBe(10001);
    expect(gate?.threshold).toBe(10000);
  });

  it('passes when lienOutput is null (default to 0)', () => {
    const result = evaluateEnhancedRiskGates(createInput({ lienOutput: null }));

    const gate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    expect(gate?.passed).toBe(true);
    expect(gate?.value).toBe(0);
  });

  it('fails when liens = $50,000', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 50000 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    expect(gate?.passed).toBe(false);
    expect(gate?.message).toContain('$50,000');
    expect(gate?.message).toContain('$10,000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE 2: HOA_JOINT_LIABILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - HOA_JOINT_LIABILITY', () => {
  it('passes when no joint liability', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ joint_liability_warning: false }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'HOA_JOINT_LIABILITY');
    expect(gate?.passed).toBe(true);
    expect(gate?.type).toBe('warning');
  });

  it('fails when joint liability warning', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ joint_liability_warning: true }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'HOA_JOINT_LIABILITY');
    expect(gate?.passed).toBe(false);
    expect(gate?.type).toBe('warning');
    expect(gate?.message).toContain('FL 720.3085');
  });

  it('passes when lienOutput is null (default to false)', () => {
    const result = evaluateEnhancedRiskGates(createInput({ lienOutput: null }));

    const gate = result.results.find((r) => r.gate === 'HOA_JOINT_LIABILITY');
    expect(gate?.passed).toBe(true);
  });

  it('returns value as boolean', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ joint_liability_warning: true }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'HOA_JOINT_LIABILITY');
    expect(gate?.value).toBe(true);
    expect(gate?.threshold).toBe(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE 3: MOTIVATION_LOW TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - MOTIVATION_LOW', () => {
  it('passes when motivation = 40 (at threshold)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 40 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'MOTIVATION_LOW');
    expect(gate?.passed).toBe(true);
    expect(gate?.type).toBe('warning');
  });

  it('passes when motivation = 100', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 100 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'MOTIVATION_LOW');
    expect(gate?.passed).toBe(true);
  });

  it('fails when motivation = 39 (below threshold)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 39 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'MOTIVATION_LOW');
    expect(gate?.passed).toBe(false);
    expect(gate?.type).toBe('warning');
    expect(gate?.value).toBe(39);
    expect(gate?.threshold).toBe(40);
  });

  it('fails when motivation = 0', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 0 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'MOTIVATION_LOW');
    expect(gate?.passed).toBe(false);
  });

  it('passes when motivationOutput is null (default to 50)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({ motivationOutput: null })
    );

    const gate = result.results.find((r) => r.gate === 'MOTIVATION_LOW');
    expect(gate?.passed).toBe(true);
    expect(gate?.value).toBe(50);
  });

  it('passes when motivation = 41', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 41 }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'MOTIVATION_LOW');
    expect(gate?.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE 4: FORECLOSURE_IMMINENT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - FORECLOSURE_IMMINENT', () => {
  it('passes when no foreclosure (null days)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: null,
        }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(true);
    expect(gate?.type).toBe('warning');
    expect(gate?.message).toContain('No foreclosure timeline');
  });

  it('passes when 31 days until sale (above threshold)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 31,
        }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(true);
  });

  it('fails when 30 days until sale (at threshold)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 30,
        }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(false);
    expect(gate?.type).toBe('warning');
    expect(gate?.value).toBe(30);
    expect(gate?.threshold).toBe(30);
  });

  it('fails when 1 day until sale', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 1,
        }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(false);
  });

  it('fails when negative days (past sale)', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: -5,
        }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(false);
    expect(gate?.value).toBe(-5);
  });

  it('passes when foreclosureOutput is null', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({ foreclosureOutput: null })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(true);
  });

  it('fails when 0 days until sale', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 0,
        }),
      })
    );

    const gate = result.results.find((r) => r.gate === 'FORECLOSURE_IMMINENT');
    expect(gate?.passed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE 5: TITLE_SEARCH_MISSING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - TITLE_SEARCH_MISSING', () => {
  it('passes when title search completed', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({ titleSearchCompleted: true })
    );

    const gate = result.results.find((r) => r.gate === 'TITLE_SEARCH_MISSING');
    expect(gate?.passed).toBe(true);
    expect(gate?.type).toBe('evidence');
    expect(gate?.message).toBe('Title search completed');
  });

  it('fails when title search not completed', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({ titleSearchCompleted: false })
    );

    const gate = result.results.find((r) => r.gate === 'TITLE_SEARCH_MISSING');
    expect(gate?.passed).toBe(false);
    expect(gate?.type).toBe('evidence');
    expect(gate?.value).toBe(false);
  });

  it('returns value as boolean', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({ titleSearchCompleted: true })
    );

    const gate = result.results.find((r) => r.gate === 'TITLE_SEARCH_MISSING');
    expect(gate?.value).toBe(true);
    expect(gate?.threshold).toBe(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE 6: SELLER_STRIKE_ABOVE_CEILING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - SELLER_STRIKE_ABOVE_CEILING', () => {
  it('passes when strike < ceiling', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: 200000,
        maoCeiling: 220000,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.passed).toBe(true);
    expect(gate?.type).toBe('blocking');
  });

  it('passes when strike = ceiling', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: 220000,
        maoCeiling: 220000,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.passed).toBe(true);
  });

  it('fails when strike > ceiling', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: 250000,
        maoCeiling: 220000,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.passed).toBe(false);
    expect(gate?.type).toBe('blocking');
    expect(gate?.value).toBe(250000);
    expect(gate?.threshold).toBe(220000);
  });

  it('passes by default when sellerStrikePrice is null', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: null,
        maoCeiling: 220000,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.passed).toBe(true);
    expect(gate?.message).toContain('Insufficient data');
  });

  it('passes by default when maoCeiling is null', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: 200000,
        maoCeiling: null,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.passed).toBe(true);
    expect(gate?.message).toContain('Insufficient data');
  });

  it('passes by default when both are null', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: null,
        maoCeiling: null,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.passed).toBe(true);
  });

  it('message includes formatted amounts on failure', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        sellerStrikePrice: 300000,
        maoCeiling: 200000,
      })
    );

    const gate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );
    expect(gate?.message).toContain('$300,000');
    expect(gate?.message).toContain('$200,000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - Summary', () => {
  it('counts total gates correctly', () => {
    const result = evaluateEnhancedRiskGates(createInput());

    expect(result.total_gates).toBe(6);
    expect(result.results).toHaveLength(6);
  });

  it('passed + failed = total_gates', () => {
    const result = evaluateEnhancedRiskGates(createInput());

    expect(result.passed + result.failed).toBe(result.total_gates);
  });

  it('counts blocking failures correctly', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 15000 }), // Blocking fail
        sellerStrikePrice: 300000, // Blocking fail
        maoCeiling: 200000,
      })
    );

    expect(result.blocking_failures).toBe(2);
  });

  it('counts warning failures correctly', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 20 }), // Warning fail
        lienOutput: createLienOutput({ joint_liability_warning: true }), // Warning fail
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 10,
        }), // Warning fail
      })
    );

    expect(result.warning_failures).toBe(3);
  });

  it('counts evidence failures correctly', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        titleSearchCompleted: false, // Evidence fail
      })
    );

    expect(result.evidence_failures).toBe(1);
  });

  it('all gates pass with good data', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        motivationOutput: createMotivationOutput({ motivation_score: 80 }),
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 60,
        }),
        lienOutput: createLienOutput({
          total_surviving_liens: 2000,
          joint_liability_warning: false,
        }),
        sellerStrikePrice: 180000,
        maoCeiling: 200000,
        titleSearchCompleted: true,
      })
    );

    expect(result.passed).toBe(6);
    expect(result.failed).toBe(0);
    expect(result.blocking_failures).toBe(0);
    expect(result.warning_failures).toBe(0);
    expect(result.evidence_failures).toBe(0);
  });

  it('failure counts by type are correct', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({
          total_surviving_liens: 50000, // Blocking
          joint_liability_warning: true, // Warning
        }),
        motivationOutput: createMotivationOutput({ motivation_score: 10 }), // Warning
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 5,
        }), // Warning
        sellerStrikePrice: 300000, // Blocking
        maoCeiling: 200000,
        titleSearchCompleted: false, // Evidence
      })
    );

    expect(result.blocking_failures).toBe(2);
    expect(result.warning_failures).toBe(3);
    expect(result.evidence_failures).toBe(1);
    expect(result.failed).toBe(6);
    expect(result.passed).toBe(0);
  });

  it('mixed results counted correctly', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({
          total_surviving_liens: 5000, // Pass
          joint_liability_warning: true, // Fail (warning)
        }),
        motivationOutput: createMotivationOutput({ motivation_score: 80 }), // Pass
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 50,
        }), // Pass
        sellerStrikePrice: 180000, // Pass
        maoCeiling: 200000,
        titleSearchCompleted: true, // Pass
      })
    );

    expect(result.passed).toBe(5);
    expect(result.failed).toBe(1);
    expect(result.warning_failures).toBe(1);
    expect(result.blocking_failures).toBe(0);
    expect(result.evidence_failures).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - Constants', () => {
  it('RISK_GATES has all 6 gates defined', () => {
    expect(Object.keys(RISK_GATES)).toHaveLength(6);
    expect(RISK_GATES.LIEN_THRESHOLD).toBeDefined();
    expect(RISK_GATES.HOA_JOINT_LIABILITY).toBeDefined();
    expect(RISK_GATES.MOTIVATION_LOW).toBeDefined();
    expect(RISK_GATES.FORECLOSURE_IMMINENT).toBeDefined();
    expect(RISK_GATES.TITLE_SEARCH_MISSING).toBeDefined();
    expect(RISK_GATES.SELLER_STRIKE_ABOVE_CEILING).toBeDefined();
  });

  it('gate types are correct', () => {
    expect(RISK_GATES.LIEN_THRESHOLD.type).toBe('blocking');
    expect(RISK_GATES.HOA_JOINT_LIABILITY.type).toBe('warning');
    expect(RISK_GATES.MOTIVATION_LOW.type).toBe('warning');
    expect(RISK_GATES.FORECLOSURE_IMMINENT.type).toBe('warning');
    expect(RISK_GATES.TITLE_SEARCH_MISSING.type).toBe('evidence');
    expect(RISK_GATES.SELLER_STRIKE_ABOVE_CEILING.type).toBe('blocking');
  });

  it('thresholds are correct', () => {
    expect(RISK_GATES.LIEN_THRESHOLD.threshold).toBe(10000);
    expect(RISK_GATES.MOTIVATION_LOW.threshold).toBe(40);
    expect(RISK_GATES.FORECLOSURE_IMMINENT.threshold).toBe(30);
  });

  it('MOTIVATION_LOW_THRESHOLD is 40', () => {
    expect(MOTIVATION_LOW_THRESHOLD).toBe(40);
  });

  it('FORECLOSURE_IMMINENT_THRESHOLD is 30', () => {
    expect(FORECLOSURE_IMMINENT_THRESHOLD).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - Output Structure', () => {
  it('returns all required summary fields', () => {
    const result = evaluateEnhancedRiskGates(createInput());

    expect(result).toHaveProperty('total_gates');
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('failed');
    expect(result).toHaveProperty('blocking_failures');
    expect(result).toHaveProperty('warning_failures');
    expect(result).toHaveProperty('evidence_failures');
    expect(result).toHaveProperty('results');
  });

  it('each result has all required fields', () => {
    const result = evaluateEnhancedRiskGates(createInput());

    result.results.forEach((gate) => {
      expect(gate).toHaveProperty('gate');
      expect(gate).toHaveProperty('passed');
      expect(gate).toHaveProperty('type');
      expect(gate).toHaveProperty('value');
      expect(gate).toHaveProperty('threshold');
      expect(gate).toHaveProperty('message');
    });
  });

  it('results array contains correct gate IDs', () => {
    const result = evaluateEnhancedRiskGates(createInput());
    const gateIds = result.results.map((r) => r.gate);

    expect(gateIds).toContain('LIEN_THRESHOLD');
    expect(gateIds).toContain('HOA_JOINT_LIABILITY');
    expect(gateIds).toContain('MOTIVATION_LOW');
    expect(gateIds).toContain('FORECLOSURE_IMMINENT');
    expect(gateIds).toContain('TITLE_SEARCH_MISSING');
    expect(gateIds).toContain('SELLER_STRIKE_ABOVE_CEILING');
  });

  it('results are in consistent order', () => {
    const result1 = evaluateEnhancedRiskGates(createInput());
    const result2 = evaluateEnhancedRiskGates(createInput());

    const gateIds1 = result1.results.map((r) => r.gate);
    const gateIds2 = result2.results.map((r) => r.gate);

    expect(gateIds1).toEqual(gateIds2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('evaluateEnhancedRiskGates - Edge Cases', () => {
  it('handles all null inputs gracefully', () => {
    const result = evaluateEnhancedRiskGates({
      motivationOutput: null,
      foreclosureOutput: null,
      lienOutput: null,
      sellerStrikePrice: null,
      maoCeiling: null,
      titleSearchCompleted: true,
    });

    expect(result.total_gates).toBe(6);
    expect(result.passed).toBeGreaterThan(0);
    // Should not throw
  });

  it('handles zero values correctly', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 0 }),
        motivationOutput: createMotivationOutput({ motivation_score: 0 }), // Fails
        foreclosureOutput: createForeclosureOutput({
          days_until_estimated_sale: 0,
        }), // Fails
        sellerStrikePrice: 0,
        maoCeiling: 0, // 0 <= 0, so passes
      })
    );

    expect(result.total_gates).toBe(6);
    const lienGate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    const motivationGate = result.results.find(
      (r) => r.gate === 'MOTIVATION_LOW'
    );
    const foreclosureGate = result.results.find(
      (r) => r.gate === 'FORECLOSURE_IMMINENT'
    );
    const strikeGate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );

    expect(lienGate?.passed).toBe(true);
    expect(motivationGate?.passed).toBe(false);
    expect(foreclosureGate?.passed).toBe(false);
    expect(strikeGate?.passed).toBe(true); // 0 <= 0
  });

  it('handles large numbers correctly', () => {
    const result = evaluateEnhancedRiskGates(
      createInput({
        lienOutput: createLienOutput({ total_surviving_liens: 1000000 }),
        sellerStrikePrice: 999999999,
        maoCeiling: 100000000,
      })
    );

    const lienGate = result.results.find((r) => r.gate === 'LIEN_THRESHOLD');
    const strikeGate = result.results.find(
      (r) => r.gate === 'SELLER_STRIKE_ABOVE_CEILING'
    );

    expect(lienGate?.passed).toBe(false);
    expect(strikeGate?.passed).toBe(false);
  });
});
