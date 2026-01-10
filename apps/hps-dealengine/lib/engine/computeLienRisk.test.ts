/**
 * computeLienRisk Tests
 * @module lib/engine/computeLienRisk.test
 * @slice 09 of 22
 *
 * Test Categories:
 * - Determinism: Same input → Same output
 * - Total Calculation: Sum all lien categories
 * - Risk Level: Threshold-based derivation
 * - Joint Liability: FL 720.3085 warning
 * - Blocking Gate: > $10,000 trigger
 * - Net Clearance: Negative adjustment
 * - Evidence Needed: Missing data identification
 * - Edge Cases: null, NaN, negative values
 */

import { describe, it, expect } from 'vitest';
import {
  computeLienRisk,
  LIEN_THRESHOLDS,
  LIEN_BLOCKING_THRESHOLD,
  type LienRiskInput,
} from './computeLienRisk';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

/** Helper to create input with defaults */
const createInput = (
  overrides: Partial<LienRiskInput> = {}
): LienRiskInput => ({
  hoa_status: 'current',
  hoa_arrears_amount: 0,
  hoa_monthly_assessment: null,
  cdd_status: 'current',
  cdd_arrears_amount: 0,
  property_tax_status: 'current',
  property_tax_arrears: 0,
  municipal_liens_present: false,
  municipal_lien_amount: 0,
  title_search_completed: true,
  title_issues_notes: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Determinism', () => {
  it('returns identical output for identical input (10 iterations)', () => {
    const input = createInput({
      hoa_status: 'delinquent',
      hoa_arrears_amount: 5000,
      cdd_status: 'delinquent',
      cdd_arrears_amount: 2000,
      property_tax_status: 'delinquent',
      property_tax_arrears: 3000,
    });

    const results = Array.from({ length: 10 }, () => computeLienRisk(input));
    const firstResult = JSON.stringify(results[0]);

    results.forEach((result) => {
      expect(JSON.stringify(result)).toBe(firstResult);
    });
  });

  it('is a pure function (no side effects)', () => {
    const input = createInput({ hoa_arrears_amount: 1000 });
    const inputCopy = JSON.stringify(input);

    computeLienRisk(input);

    expect(JSON.stringify(input)).toBe(inputCopy);
  });

  it('never returns NaN in any numeric field', () => {
    const inputs = [
      createInput({ hoa_arrears_amount: NaN }),
      createInput({ cdd_arrears_amount: undefined as unknown as number }),
      createInput({ property_tax_arrears: null }),
      createInput({ municipal_lien_amount: Infinity }),
    ];

    inputs.forEach((input) => {
      const result = computeLienRisk(input);
      expect(Number.isNaN(result.total_surviving_liens)).toBe(false);
      expect(Number.isNaN(result.net_clearance_adjustment)).toBe(false);
      expect(Number.isNaN(result.breakdown.hoa)).toBe(false);
      expect(Number.isNaN(result.breakdown.cdd)).toBe(false);
      expect(Number.isNaN(result.breakdown.property_tax)).toBe(false);
      expect(Number.isNaN(result.breakdown.municipal)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOTAL CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Total Calculation', () => {
  it('sums all lien categories correctly', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 1000,
        cdd_arrears_amount: 2000,
        property_tax_arrears: 3000,
        municipal_lien_amount: 4000,
      })
    );

    expect(result.total_surviving_liens).toBe(10000);
    expect(result.breakdown).toEqual({
      hoa: 1000,
      cdd: 2000,
      property_tax: 3000,
      municipal: 4000,
    });
  });

  it('handles null amounts as zero', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: null,
        cdd_arrears_amount: null,
        property_tax_arrears: null,
        municipal_lien_amount: null,
      })
    );

    expect(result.total_surviving_liens).toBe(0);
    expect(result.breakdown).toEqual({
      hoa: 0,
      cdd: 0,
      property_tax: 0,
      municipal: 0,
    });
  });

  it('handles mixed null and values', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 5000,
        cdd_arrears_amount: null,
        property_tax_arrears: 2000,
        municipal_lien_amount: null,
      })
    );

    expect(result.total_surviving_liens).toBe(7000);
    expect(result.breakdown.hoa).toBe(5000);
    expect(result.breakdown.cdd).toBe(0);
    expect(result.breakdown.property_tax).toBe(2000);
    expect(result.breakdown.municipal).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK LEVEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Risk Level', () => {
  it('returns "low" for total <= $2,500', () => {
    const results = [
      computeLienRisk(createInput({ hoa_arrears_amount: 0 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 1000 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 2500 })),
    ];

    results.forEach((result) => {
      expect(result.risk_level).toBe('low');
    });
  });

  it('returns "medium" for $2,501 - $5,000', () => {
    const results = [
      computeLienRisk(createInput({ hoa_arrears_amount: 2501 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 3500 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 5000 })),
    ];

    results.forEach((result) => {
      expect(result.risk_level).toBe('medium');
    });
  });

  it('returns "high" for $5,001 - $10,000', () => {
    const results = [
      computeLienRisk(createInput({ hoa_arrears_amount: 5001 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 7500 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 10000 })),
    ];

    results.forEach((result) => {
      expect(result.risk_level).toBe('high');
    });
  });

  it('returns "critical" for > $10,000', () => {
    const results = [
      computeLienRisk(createInput({ hoa_arrears_amount: 10001 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 15000 })),
      computeLienRisk(createInput({ hoa_arrears_amount: 50000 })),
    ];

    results.forEach((result) => {
      expect(result.risk_level).toBe('critical');
    });
  });

  it('uses threshold constants correctly', () => {
    expect(LIEN_THRESHOLDS.WARNING).toBe(2500);
    expect(LIEN_THRESHOLDS.HIGH).toBe(5000);
    expect(LIEN_THRESHOLDS.BLOCKING).toBe(10000);
    expect(LIEN_BLOCKING_THRESHOLD).toBe(10000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JOINT LIABILITY TESTS (FL 720.3085)
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Joint Liability (FL 720.3085)', () => {
  it('warns when HOA arrears present', () => {
    const result = computeLienRisk(
      createInput({
        hoa_status: 'delinquent',
        hoa_arrears_amount: 1000,
      })
    );

    expect(result.joint_liability_warning).toBe(true);
    expect(result.joint_liability_statute).toBe('FL 720.3085');
  });

  it('warns when CDD arrears present', () => {
    const result = computeLienRisk(
      createInput({
        cdd_status: 'delinquent',
        cdd_arrears_amount: 500,
      })
    );

    expect(result.joint_liability_warning).toBe(true);
    expect(result.joint_liability_statute).toBe('FL 720.3085');
  });

  it('warns when both HOA and CDD arrears present', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 1000,
        cdd_arrears_amount: 500,
      })
    );

    expect(result.joint_liability_warning).toBe(true);
    expect(result.joint_liability_statute).toBe('FL 720.3085');
  });

  it('no warning when no HOA/CDD arrears (only property tax)', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 0,
        cdd_arrears_amount: 0,
        property_tax_status: 'delinquent',
        property_tax_arrears: 5000,
      })
    );

    expect(result.joint_liability_warning).toBe(false);
    expect(result.joint_liability_statute).toBeNull();
  });

  it('no warning when all zero', () => {
    const result = computeLienRisk(createInput());

    expect(result.joint_liability_warning).toBe(false);
    expect(result.joint_liability_statute).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKING GATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Blocking Gate', () => {
  it('does NOT trigger at exactly $10,000', () => {
    const result = computeLienRisk(
      createInput({ hoa_arrears_amount: 10000 })
    );

    expect(result.blocking_gate_triggered).toBe(false);
  });

  it('triggers at $10,001', () => {
    const result = computeLienRisk(
      createInput({ hoa_arrears_amount: 10001 })
    );

    expect(result.blocking_gate_triggered).toBe(true);
  });

  it('triggers when combined liens exceed $10,000', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 3000,
        cdd_arrears_amount: 3000,
        property_tax_arrears: 3000,
        municipal_lien_amount: 2000,
      })
    );
    // Total: 11000

    expect(result.blocking_gate_triggered).toBe(true);
  });

  it('does not trigger when combined liens equal $10,000', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 2500,
        cdd_arrears_amount: 2500,
        property_tax_arrears: 2500,
        municipal_lien_amount: 2500,
      })
    );
    // Total: 10000

    expect(result.blocking_gate_triggered).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NET CLEARANCE ADJUSTMENT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Net Clearance Adjustment', () => {
  it('returns negative of total liens', () => {
    const result = computeLienRisk(
      createInput({ hoa_arrears_amount: 5000 })
    );

    expect(result.net_clearance_adjustment).toBe(-5000);
  });

  it('returns 0 when no liens', () => {
    const result = computeLienRisk(createInput());

    expect(result.net_clearance_adjustment).toBe(0);
  });

  it('returns negative of combined total', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 1000,
        cdd_arrears_amount: 2000,
        property_tax_arrears: 3000,
        municipal_lien_amount: 4000,
      })
    );

    expect(result.net_clearance_adjustment).toBe(-10000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE NEEDED TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Evidence Needed', () => {
  it('includes "Title search" when not completed', () => {
    const result = computeLienRisk(
      createInput({ title_search_completed: false })
    );

    expect(result.evidence_needed).toContain('Title search');
  });

  it('does not include "Title search" when completed', () => {
    const result = computeLienRisk(
      createInput({ title_search_completed: true })
    );

    expect(result.evidence_needed).not.toContain('Title search');
  });

  it('includes "HOA status verification" when unknown', () => {
    const result = computeLienRisk(
      createInput({ hoa_status: 'unknown' })
    );

    expect(result.evidence_needed).toContain('HOA status verification');
  });

  it('includes "CDD status verification" when unknown', () => {
    const result = computeLienRisk(
      createInput({ cdd_status: 'unknown' })
    );

    expect(result.evidence_needed).toContain('CDD status verification');
  });

  it('includes "Property tax status verification" when unknown', () => {
    const result = computeLienRisk(
      createInput({ property_tax_status: 'unknown' })
    );

    expect(result.evidence_needed).toContain('Property tax status verification');
  });

  it('includes municipal lien verification when present but amount null', () => {
    const result = computeLienRisk(
      createInput({
        municipal_liens_present: true,
        municipal_lien_amount: null,
      })
    );

    expect(result.evidence_needed).toContain('Municipal lien amount verification');
  });

  it('returns empty array when all evidence complete', () => {
    const result = computeLienRisk(
      createInput({
        hoa_status: 'current',
        cdd_status: 'current',
        property_tax_status: 'current',
        title_search_completed: true,
      })
    );

    expect(result.evidence_needed).toEqual([]);
  });

  it('returns multiple items when multiple gaps', () => {
    const result = computeLienRisk(
      createInput({
        hoa_status: 'unknown',
        cdd_status: 'unknown',
        property_tax_status: 'unknown',
        title_search_completed: false,
      })
    );

    expect(result.evidence_needed.length).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Edge Cases', () => {
  it('handles NaN as zero', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: NaN,
        cdd_arrears_amount: NaN,
        property_tax_arrears: NaN,
        municipal_lien_amount: NaN,
      })
    );

    expect(result.total_surviving_liens).toBe(0);
    expect(result.breakdown.hoa).toBe(0);
  });

  it('handles negative amounts as zero', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: -1000,
        cdd_arrears_amount: -500,
      })
    );

    expect(result.breakdown.hoa).toBe(0);
    expect(result.breakdown.cdd).toBe(0);
    expect(result.total_surviving_liens).toBe(0);
  });

  it('handles Infinity as zero', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: Infinity,
      })
    );

    expect(result.breakdown.hoa).toBe(0);
    expect(Number.isFinite(result.total_surviving_liens)).toBe(true);
  });

  it('handles -Infinity as zero', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: -Infinity,
      })
    );

    expect(result.breakdown.hoa).toBe(0);
  });

  it('handles very large numbers', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 1000000,
        property_tax_arrears: 500000,
      })
    );

    expect(result.total_surviving_liens).toBe(1500000);
    expect(result.risk_level).toBe('critical');
    expect(result.blocking_gate_triggered).toBe(true);
  });

  it('handles decimal amounts', () => {
    const result = computeLienRisk(
      createInput({
        hoa_arrears_amount: 1234.56,
        cdd_arrears_amount: 789.01,
      })
    );

    expect(result.total_surviving_liens).toBeCloseTo(2023.57);
    expect(result.breakdown.hoa).toBe(1234.56);
    expect(result.breakdown.cdd).toBe(789.01);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Output Structure', () => {
  it('returns all required output fields', () => {
    const result = computeLienRisk(createInput());

    expect(result).toHaveProperty('total_surviving_liens');
    expect(result).toHaveProperty('risk_level');
    expect(result).toHaveProperty('joint_liability_warning');
    expect(result).toHaveProperty('joint_liability_statute');
    expect(result).toHaveProperty('blocking_gate_triggered');
    expect(result).toHaveProperty('net_clearance_adjustment');
    expect(result).toHaveProperty('evidence_needed');
    expect(result).toHaveProperty('breakdown');
  });

  it('breakdown has all required fields', () => {
    const result = computeLienRisk(createInput());

    expect(result.breakdown).toHaveProperty('hoa');
    expect(result.breakdown).toHaveProperty('cdd');
    expect(result.breakdown).toHaveProperty('property_tax');
    expect(result.breakdown).toHaveProperty('municipal');
  });

  it('risk_level is valid enum value', () => {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    const result = computeLienRisk(createInput());

    expect(validLevels).toContain(result.risk_level);
  });

  it('evidence_needed is an array', () => {
    const result = computeLienRisk(createInput());

    expect(Array.isArray(result.evidence_needed)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLienRisk - Constants', () => {
  it('LIEN_THRESHOLDS has correct values', () => {
    expect(LIEN_THRESHOLDS.WARNING).toBe(2500);
    expect(LIEN_THRESHOLDS.HIGH).toBe(5000);
    expect(LIEN_THRESHOLDS.BLOCKING).toBe(10000);
  });

  it('LIEN_BLOCKING_THRESHOLD equals LIEN_THRESHOLDS.BLOCKING', () => {
    expect(LIEN_BLOCKING_THRESHOLD).toBe(LIEN_THRESHOLDS.BLOCKING);
  });

  it('thresholds are in ascending order', () => {
    expect(LIEN_THRESHOLDS.WARNING).toBeLessThan(LIEN_THRESHOLDS.HIGH);
    expect(LIEN_THRESHOLDS.HIGH).toBeLessThan(LIEN_THRESHOLDS.BLOCKING);
  });
});
