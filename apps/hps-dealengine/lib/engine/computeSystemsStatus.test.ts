/**
 * computeSystemsStatus Tests
 * @module lib/engine/computeSystemsStatus.test
 * @slice 10 of 22
 *
 * Test Categories:
 * - Determinism: Same input → Same output
 * - RUL Calculation: age and remaining years
 * - Condition Derivation: percentage thresholds
 * - Urgent Replacements: identification and cost
 * - Edge Cases: null, future years, NaN
 * - System Scores: full breakdown
 */

import { describe, it, expect } from 'vitest';
import {
  computeSystemsStatus,
  SYSTEM_EXPECTED_LIFE,
  SYSTEM_REPLACEMENT_COST,
  CONDITION_THRESHOLDS,
} from './computeSystemsStatus';
import type { SystemsStatusInput } from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

/** Fixed reference year for deterministic tests */
const REF_YEAR = 2026;

/** Helper to create input with defaults */
const createInput = (
  overrides: Partial<SystemsStatusInput> = {}
): SystemsStatusInput => ({
  overall_condition: null,
  deferred_maintenance_level: null,
  roof_year_installed: null,
  hvac_year_installed: null,
  water_heater_year_installed: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Determinism', () => {
  it('returns identical output for identical input (10 iterations)', () => {
    const input = createInput({
      overall_condition: 'fair',
      deferred_maintenance_level: 'moderate',
      roof_year_installed: 2010,
      hvac_year_installed: 2018,
      water_heater_year_installed: 2020,
    });

    const results = Array.from({ length: 10 }, () =>
      computeSystemsStatus(input, REF_YEAR)
    );
    const firstResult = JSON.stringify(results[0]);

    results.forEach((result) => {
      expect(JSON.stringify(result)).toBe(firstResult);
    });
  });

  it('is a pure function (no side effects)', () => {
    const input = createInput({ roof_year_installed: 2015 });
    const inputCopy = JSON.stringify(input);

    computeSystemsStatus(input, REF_YEAR);

    expect(JSON.stringify(input)).toBe(inputCopy);
  });

  it('uses injectable referenceYear for testing', () => {
    const input = createInput({ roof_year_installed: 2015 });

    const result2024 = computeSystemsStatus(input, 2024);
    const result2026 = computeSystemsStatus(input, 2026);

    expect(result2024.roof_rul).toBe(16); // 25 - 9 = 16
    expect(result2026.roof_rul).toBe(14); // 25 - 11 = 14
    expect(result2024.roof_rul! - result2026.roof_rul!).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUL CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - RUL Calculation', () => {
  it('calculates roof RUL correctly (25 year expected life)', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2010 }), // 16 years old
      REF_YEAR
    );

    expect(result.roof_rul).toBe(9); // 25 - 16 = 9
    expect(result.system_scores.roof.age).toBe(16);
    expect(result.system_scores.roof.expected_life).toBe(25);
  });

  it('calculates HVAC RUL correctly (15 year expected life)', () => {
    const result = computeSystemsStatus(
      createInput({ hvac_year_installed: 2018 }), // 8 years old
      REF_YEAR
    );

    expect(result.hvac_rul).toBe(7); // 15 - 8 = 7
    expect(result.system_scores.hvac.age).toBe(8);
    expect(result.system_scores.hvac.expected_life).toBe(15);
  });

  it('calculates water heater RUL correctly (12 year expected life)', () => {
    const result = computeSystemsStatus(
      createInput({ water_heater_year_installed: 2020 }), // 6 years old
      REF_YEAR
    );

    expect(result.water_heater_rul).toBe(6); // 12 - 6 = 6
    expect(result.system_scores.water_heater.age).toBe(6);
    expect(result.system_scores.water_heater.expected_life).toBe(12);
  });

  it('clamps RUL to minimum 0 (past expected life)', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 1990 }), // 36 years old
      REF_YEAR
    );

    expect(result.roof_rul).toBe(0);
    expect(result.system_scores.roof.age).toBe(36);
    expect(result.system_scores.roof.needs_replacement).toBe(true);
  });

  it('clamps age to minimum 0 (future install date)', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2030 }), // Future year
      REF_YEAR
    );

    expect(result.system_scores.roof.age).toBe(0);
    expect(result.roof_rul).toBe(25); // Full expected life
  });

  it('calculates all three systems together', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 2006, // 20 years old, RUL = 5
        hvac_year_installed: 2016, // 10 years old, RUL = 5
        water_heater_year_installed: 2021, // 5 years old, RUL = 7
      }),
      REF_YEAR
    );

    expect(result.roof_rul).toBe(5);
    expect(result.hvac_rul).toBe(5);
    expect(result.water_heater_rul).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION DERIVATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Condition Derivation', () => {
  it('returns "good" for > 40% RUL remaining', () => {
    // Roof: 25 year life, > 40% = > 10 years remaining
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2015 }), // 11 years old, 14 remaining = 56%
      REF_YEAR
    );

    expect(result.system_scores.roof.condition).toBe('good');
    expect(result.system_scores.roof.remaining_years).toBe(14);
  });

  it('returns "fair" for 20-40% RUL remaining', () => {
    // Roof: 25 year life, 20-40% = 5-10 years remaining
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2008 }), // 18 years old, 7 remaining = 28%
      REF_YEAR
    );

    expect(result.system_scores.roof.condition).toBe('fair');
    expect(result.system_scores.roof.remaining_years).toBe(7);
  });

  it('returns "poor" for 1-20% RUL remaining', () => {
    // Roof: 25 year life, 1-20% = 1-5 years remaining
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2004 }), // 22 years old, 3 remaining = 12%
      REF_YEAR
    );

    expect(result.system_scores.roof.condition).toBe('poor');
    expect(result.system_scores.roof.remaining_years).toBe(3);
  });

  it('returns "critical" for 0% RUL (past life)', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 1990 }), // 36 years old, past life
      REF_YEAR
    );

    expect(result.system_scores.roof.condition).toBe('critical');
    expect(result.system_scores.roof.remaining_years).toBe(0);
  });

  it('returns "critical" for exactly 0 remaining years', () => {
    // Roof: 25 year life, installed 2001 = exactly 25 years old
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2001 }), // 25 years old, 0 remaining
      REF_YEAR
    );

    expect(result.system_scores.roof.condition).toBe('critical');
    expect(result.system_scores.roof.remaining_years).toBe(0);
  });

  it('returns null condition for unknown year', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: null }),
      REF_YEAR
    );

    expect(result.system_scores.roof.condition).toBeNull();
  });

  it('correctly identifies 40% boundary (exactly 10 years remaining)', () => {
    // Roof: 25 year life, exactly 10 years = exactly 40%
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2011 }), // 15 years old, 10 remaining = 40%
      REF_YEAR
    );

    // 40% is NOT > 40%, so it should be "fair"
    expect(result.system_scores.roof.condition).toBe('fair');
    expect(result.system_scores.roof.remaining_years).toBe(10);
  });

  it('correctly identifies 20% boundary (exactly 5 years remaining)', () => {
    // Roof: 25 year life, exactly 5 years = exactly 20%
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2006 }), // 20 years old, 5 remaining = 20%
      REF_YEAR
    );

    // 20% is NOT > 20%, so it should be "poor"
    expect(result.system_scores.roof.condition).toBe('poor');
    expect(result.system_scores.roof.remaining_years).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// URGENT REPLACEMENTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Urgent Replacements', () => {
  it('includes systems with RUL = 0 in urgent list', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 1990, // Past life
        hvac_year_installed: 2000, // 26 years old, past 15 year life
        water_heater_year_installed: 2005, // 21 years old, past 12 year life
      }),
      REF_YEAR
    );

    expect(result.urgent_replacements).toContain('Roof');
    expect(result.urgent_replacements).toContain('HVAC');
    expect(result.urgent_replacements).toContain('Water Heater');
    expect(result.urgent_replacements).toHaveLength(3);
  });

  it('excludes systems with RUL > 0', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 2020, // 6 years old, RUL = 19
        hvac_year_installed: 2020, // 6 years old, RUL = 9
        water_heater_year_installed: 2020, // 6 years old, RUL = 6
      }),
      REF_YEAR
    );

    expect(result.urgent_replacements).toHaveLength(0);
  });

  it('excludes systems with null year (unknown)', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: null,
        hvac_year_installed: null,
        water_heater_year_installed: null,
      }),
      REF_YEAR
    );

    expect(result.urgent_replacements).toHaveLength(0);
  });

  it('includes only systems that need replacement', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 1990, // Needs replacement
        hvac_year_installed: 2020, // Good
        water_heater_year_installed: 2005, // Needs replacement
      }),
      REF_YEAR
    );

    expect(result.urgent_replacements).toContain('Roof');
    expect(result.urgent_replacements).toContain('Water Heater');
    expect(result.urgent_replacements).not.toContain('HVAC');
    expect(result.urgent_replacements).toHaveLength(2);
  });

  it('returns replacements in consistent order: Roof, HVAC, Water Heater', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 1990,
        hvac_year_installed: 2000,
        water_heater_year_installed: 2005,
      }),
      REF_YEAR
    );

    expect(result.urgent_replacements[0]).toBe('Roof');
    expect(result.urgent_replacements[1]).toBe('HVAC');
    expect(result.urgent_replacements[2]).toBe('Water Heater');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPLACEMENT COST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Replacement Cost', () => {
  it('sums only urgent replacement costs', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 1990, // Needs: $15,000
        hvac_year_installed: 2020, // Good, not counted
        water_heater_year_installed: 2005, // Needs: $1,500
      }),
      REF_YEAR
    );

    expect(result.total_replacement_cost).toBe(16500); // 15000 + 1500
  });

  it('returns 0 when no urgent replacements', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 2020,
        hvac_year_installed: 2020,
        water_heater_year_installed: 2020,
      }),
      REF_YEAR
    );

    expect(result.total_replacement_cost).toBe(0);
  });

  it('sums all three systems when all need replacement', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: 1990,
        hvac_year_installed: 2000,
        water_heater_year_installed: 2005,
      }),
      REF_YEAR
    );

    // $15,000 + $8,000 + $1,500 = $24,500
    expect(result.total_replacement_cost).toBe(24500);
  });

  it('includes correct individual costs in system scores', () => {
    const result = computeSystemsStatus(createInput(), REF_YEAR);

    expect(result.system_scores.roof.replacement_cost).toBe(15000);
    expect(result.system_scores.hvac.replacement_cost).toBe(8000);
    expect(result.system_scores.water_heater.replacement_cost).toBe(1500);
  });

  it('returns 0 when all years are null', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: null,
        hvac_year_installed: null,
        water_heater_year_installed: null,
      }),
      REF_YEAR
    );

    expect(result.total_replacement_cost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Edge Cases', () => {
  it('handles all null years', () => {
    const result = computeSystemsStatus(
      createInput({
        roof_year_installed: null,
        hvac_year_installed: null,
        water_heater_year_installed: null,
      }),
      REF_YEAR
    );

    expect(result.roof_rul).toBeNull();
    expect(result.hvac_rul).toBeNull();
    expect(result.water_heater_rul).toBeNull();
    expect(result.urgent_replacements).toHaveLength(0);
    expect(result.total_replacement_cost).toBe(0);
  });

  it('handles future install year gracefully (age = 0)', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2030 }), // Future year
      REF_YEAR
    );

    expect(result.system_scores.roof.age).toBe(0);
    expect(result.roof_rul).toBe(25); // Full expected life
    expect(result.system_scores.roof.condition).toBe('good');
    expect(result.system_scores.roof.needs_replacement).toBe(false);
  });

  it('handles NaN year as null', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: NaN as unknown as number }),
      REF_YEAR
    );

    expect(result.roof_rul).toBeNull();
    expect(result.system_scores.roof.age).toBeNull();
    expect(result.system_scores.roof.condition).toBeNull();
  });

  it('handles Infinity year as null', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: Infinity as unknown as number }),
      REF_YEAR
    );

    expect(result.roof_rul).toBeNull();
  });

  it('handles -Infinity year as null', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: -Infinity as unknown as number }),
      REF_YEAR
    );

    expect(result.roof_rul).toBeNull();
  });

  it('handles very old install year', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 1950 }), // 76 years old
      REF_YEAR
    );

    expect(result.system_scores.roof.age).toBe(76);
    expect(result.roof_rul).toBe(0);
    expect(result.system_scores.roof.condition).toBe('critical');
  });

  it('handles exact boundary at expected life', () => {
    // Roof installed exactly 25 years ago = RUL 0
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2001 }),
      REF_YEAR
    );

    expect(result.system_scores.roof.age).toBe(25);
    expect(result.roof_rul).toBe(0);
    expect(result.system_scores.roof.needs_replacement).toBe(true);
  });

  it('handles brand new installation (age = 0)', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2026 }), // Same as ref year
      REF_YEAR
    );

    expect(result.system_scores.roof.age).toBe(0);
    expect(result.roof_rul).toBe(25);
    expect(result.system_scores.roof.condition).toBe('good');
  });

  it('handles one year old installation', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2025 }),
      REF_YEAR
    );

    expect(result.system_scores.roof.age).toBe(1);
    expect(result.roof_rul).toBe(24);
  });

  it('preserves year_installed value in output', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2015 }),
      REF_YEAR
    );

    expect(result.system_scores.roof.year_installed).toBe(2015);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM SCORES BREAKDOWN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - System Scores Breakdown', () => {
  it('includes all expected properties in system score', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2015 }),
      REF_YEAR
    );

    expect(result.system_scores.roof).toMatchObject({
      system: 'roof',
      year_installed: 2015,
      age: 11,
      remaining_years: 14,
      expected_life: 25,
      condition: 'good',
      replacement_cost: 15000,
      needs_replacement: false,
    });
  });

  it('handles null year in system score', () => {
    const result = computeSystemsStatus(
      createInput({ hvac_year_installed: null }),
      REF_YEAR
    );

    expect(result.system_scores.hvac).toMatchObject({
      system: 'hvac',
      year_installed: null,
      age: null,
      remaining_years: null,
      expected_life: 15,
      condition: null,
      replacement_cost: 8000,
      needs_replacement: false,
    });
  });

  it('returns all three system scores', () => {
    const result = computeSystemsStatus(createInput(), REF_YEAR);

    expect(result.system_scores).toHaveProperty('roof');
    expect(result.system_scores).toHaveProperty('hvac');
    expect(result.system_scores).toHaveProperty('water_heater');
  });

  it('includes system identifier in each score', () => {
    const result = computeSystemsStatus(createInput(), REF_YEAR);

    expect(result.system_scores.roof.system).toBe('roof');
    expect(result.system_scores.hvac.system).toBe('hvac');
    expect(result.system_scores.water_heater.system).toBe('water_heater');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Constants', () => {
  it('SYSTEM_EXPECTED_LIFE has correct values', () => {
    expect(SYSTEM_EXPECTED_LIFE.roof).toBe(25);
    expect(SYSTEM_EXPECTED_LIFE.hvac).toBe(15);
    expect(SYSTEM_EXPECTED_LIFE.water_heater).toBe(12);
  });

  it('SYSTEM_REPLACEMENT_COST has correct values', () => {
    expect(SYSTEM_REPLACEMENT_COST.roof).toBe(15000);
    expect(SYSTEM_REPLACEMENT_COST.hvac).toBe(8000);
    expect(SYSTEM_REPLACEMENT_COST.water_heater).toBe(1500);
  });

  it('CONDITION_THRESHOLDS has correct values', () => {
    expect(CONDITION_THRESHOLDS.GOOD).toBe(40);
    expect(CONDITION_THRESHOLDS.FAIR).toBe(20);
  });

  it('expected life values are reasonable', () => {
    expect(SYSTEM_EXPECTED_LIFE.roof).toBeGreaterThan(SYSTEM_EXPECTED_LIFE.hvac);
    expect(SYSTEM_EXPECTED_LIFE.hvac).toBeGreaterThan(SYSTEM_EXPECTED_LIFE.water_heater);
  });

  it('replacement costs are reasonable', () => {
    expect(SYSTEM_REPLACEMENT_COST.roof).toBeGreaterThan(SYSTEM_REPLACEMENT_COST.hvac);
    expect(SYSTEM_REPLACEMENT_COST.hvac).toBeGreaterThan(SYSTEM_REPLACEMENT_COST.water_heater);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Output Structure', () => {
  it('returns all required output fields', () => {
    const result = computeSystemsStatus(createInput(), REF_YEAR);

    expect(result).toHaveProperty('roof_rul');
    expect(result).toHaveProperty('hvac_rul');
    expect(result).toHaveProperty('water_heater_rul');
    expect(result).toHaveProperty('total_replacement_cost');
    expect(result).toHaveProperty('urgent_replacements');
    expect(result).toHaveProperty('system_scores');
  });

  it('urgent_replacements is an array', () => {
    const result = computeSystemsStatus(createInput(), REF_YEAR);

    expect(Array.isArray(result.urgent_replacements)).toBe(true);
  });

  it('total_replacement_cost is a number', () => {
    const result = computeSystemsStatus(createInput(), REF_YEAR);

    expect(typeof result.total_replacement_cost).toBe('number');
    expect(Number.isFinite(result.total_replacement_cost)).toBe(true);
  });

  it('RUL values are numbers or null', () => {
    const result = computeSystemsStatus(
      createInput({ roof_year_installed: 2015, hvac_year_installed: null }),
      REF_YEAR
    );

    expect(typeof result.roof_rul).toBe('number');
    expect(result.hvac_rul).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY CONDITION INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeSystemsStatus - Property Condition Integration', () => {
  it('accepts overall_condition field (not used in calculation)', () => {
    const result = computeSystemsStatus(
      createInput({
        overall_condition: 'poor',
        roof_year_installed: 2015,
      }),
      REF_YEAR
    );

    // The function accepts the field but doesn't use it for RUL calculation
    expect(result.roof_rul).toBe(14);
  });

  it('accepts deferred_maintenance_level field (not used in calculation)', () => {
    const result = computeSystemsStatus(
      createInput({
        deferred_maintenance_level: 'extensive',
        roof_year_installed: 2015,
      }),
      REF_YEAR
    );

    // The function accepts the field but doesn't use it for RUL calculation
    expect(result.roof_rul).toBe(14);
  });
});
