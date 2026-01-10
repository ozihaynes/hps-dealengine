/**
 * computeSystemsStatus - Calculate remaining useful life for property systems
 * @module lib/engine/computeSystemsStatus
 * @slice 10 of 22
 *
 * Principles Applied:
 * - DETERMINISM: Same input → Same output (injectable referenceYear)
 * - PURITY: No side effects, no API calls
 * - RUL FORMULA: RUL = max(0, expectedLife - age), age = max(0, refYear - installYear)
 * - AUDITABILITY: Full breakdown per system
 * - DEFENSIVE: Handle null years, future install dates, NaN, Infinity
 *
 * System Expected Life (Central FL climate):
 * - Roof (shingle): 25 years
 * - HVAC: 15 years (heavy FL use)
 * - Water Heater: 12 years
 */

import type {
  SystemsStatusInput,
  SystemsStatusOutput,
  SystemScore,
  SystemCondition,
} from '@hps-internal/contracts';

import {
  ROOF_EXPECTED_LIFE,
  HVAC_EXPECTED_LIFE,
  WATER_HEATER_EXPECTED_LIFE,
  ROOF_REPLACEMENT_COST,
  HVAC_REPLACEMENT_COST,
  WATER_HEATER_REPLACEMENT_COST,
} from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * System type identifier.
 */
export type SystemType = 'roof' | 'hvac' | 'water_heater';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY-DRIVEN CONSTANTS (Re-export for convenience)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expected useful life for each system in years.
 * Based on Central Florida climate conditions.
 */
export const SYSTEM_EXPECTED_LIFE: Record<SystemType, number> = {
  roof: ROOF_EXPECTED_LIFE,
  hvac: HVAC_EXPECTED_LIFE,
  water_heater: WATER_HEATER_EXPECTED_LIFE,
} as const;

/**
 * Estimated replacement cost for each system in dollars.
 * Based on Central Florida market rates.
 */
export const SYSTEM_REPLACEMENT_COST: Record<SystemType, number> = {
  roof: ROOF_REPLACEMENT_COST,
  hvac: HVAC_REPLACEMENT_COST,
  water_heater: WATER_HEATER_REPLACEMENT_COST,
} as const;

/**
 * Condition thresholds as percentage of expected life remaining.
 */
export const CONDITION_THRESHOLDS = {
  GOOD: 40, // > 40% = good
  FAIR: 20, // 20-40% = fair
  // < 20% = poor
  // 0% = critical
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute systems status and remaining useful life.
 *
 * This is a PURE function - no side effects, deterministic output.
 * The referenceYear parameter allows injection for testing.
 *
 * @param input - System install years and condition data
 * @param referenceYear - Year to calculate from (defaults to current year)
 * @returns Systems status with RUL, conditions, and replacement costs
 *
 * @example
 * ```ts
 * const result = computeSystemsStatus({
 *   overall_condition: 'fair',
 *   deferred_maintenance_level: 'moderate',
 *   roof_year_installed: 2010,
 *   hvac_year_installed: 2018,
 *   water_heater_year_installed: 2020,
 * }, 2026);
 * // result.roof_rul = 9 (25 - 16 years old)
 * // result.hvac_rul = 7 (15 - 8 years old)
 * // result.water_heater_rul = 6 (12 - 6 years old)
 * ```
 */
export function computeSystemsStatus(
  input: SystemsStatusInput,
  referenceYear: number = new Date().getFullYear()
): SystemsStatusOutput {
  // === Calculate individual system scores ===
  const roof = calculateSystemScore('roof', input.roof_year_installed, referenceYear);
  const hvac = calculateSystemScore('hvac', input.hvac_year_installed, referenceYear);
  const water_heater = calculateSystemScore(
    'water_heater',
    input.water_heater_year_installed,
    referenceYear
  );

  // === Identify urgent replacements and calculate total cost ===
  const urgent_replacements: string[] = [];
  let total_replacement_cost = 0;

  if (roof.needs_replacement) {
    urgent_replacements.push('Roof');
    total_replacement_cost += roof.replacement_cost;
  }
  if (hvac.needs_replacement) {
    urgent_replacements.push('HVAC');
    total_replacement_cost += hvac.replacement_cost;
  }
  if (water_heater.needs_replacement) {
    urgent_replacements.push('Water Heater');
    total_replacement_cost += water_heater.replacement_cost;
  }

  // === Build output ===
  return {
    roof_rul: roof.remaining_years,
    hvac_rul: hvac.remaining_years,
    water_heater_rul: water_heater.remaining_years,
    total_replacement_cost,
    urgent_replacements,
    system_scores: {
      roof,
      hvac,
      water_heater,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (Pure, deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate score for a single system.
 *
 * RUL Formula:
 * - age = max(0, referenceYear - yearInstalled)
 * - RUL = max(0, expectedLife - age)
 */
function calculateSystemScore(
  system: SystemType,
  yearInstalled: number | null,
  referenceYear: number
): SystemScore {
  const expected_life = SYSTEM_EXPECTED_LIFE[system];
  const replacement_cost = SYSTEM_REPLACEMENT_COST[system];

  // Handle null/unknown year
  if (yearInstalled === null || yearInstalled === undefined) {
    return {
      system,
      year_installed: null,
      age: null,
      remaining_years: null,
      expected_life,
      condition: null,
      replacement_cost,
      needs_replacement: false, // Unknown, don't flag as urgent
    };
  }

  // Handle NaN year
  if (Number.isNaN(yearInstalled) || !Number.isFinite(yearInstalled)) {
    return {
      system,
      year_installed: null,
      age: null,
      remaining_years: null,
      expected_life,
      condition: null,
      replacement_cost,
      needs_replacement: false,
    };
  }

  // Calculate age (clamp to 0 for future install dates)
  const age = Math.max(0, referenceYear - yearInstalled);

  // Calculate RUL (clamp to 0)
  const remaining_years = Math.max(0, expected_life - age);

  // Derive condition from RUL percentage
  const condition = deriveCondition(remaining_years, expected_life);

  // Needs replacement if RUL is 0
  const needs_replacement = remaining_years <= 0;

  return {
    system,
    year_installed: yearInstalled,
    age,
    remaining_years,
    expected_life,
    condition,
    replacement_cost,
    needs_replacement,
  };
}

/**
 * Derive system condition from remaining useful life percentage.
 *
 * Thresholds:
 * - good: > 40% of expected life remaining
 * - fair: 20-40% remaining
 * - poor: 1-20% remaining
 * - critical: 0% remaining (RUL = 0)
 */
function deriveCondition(
  remainingYears: number,
  expectedLife: number
): SystemCondition {
  // Critical if no remaining life
  if (remainingYears <= 0) return 'critical';

  // Calculate percentage of life remaining
  const percentage = (remainingYears / expectedLife) * 100;

  if (percentage > CONDITION_THRESHOLDS.GOOD) return 'good';
  if (percentage > CONDITION_THRESHOLDS.FAIR) return 'fair';
  return 'poor';
}
