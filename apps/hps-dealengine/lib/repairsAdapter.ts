// ============================================================================
// REPAIRS ADAPTER — V1 to V2 Migration
// ============================================================================
// File: apps/hps-dealengine/lib/repairsAdapter.ts
// Action: CREATE new file
// ============================================================================
// Principles Applied:
// - Backward compatibility: V1 states migrate seamlessly
// - Data preservation: No data loss during migration
// - Type safety: Runtime validation of state structure
// ============================================================================

import type {
  EnhancedEstimatorState,
  EnhancedCategory,
  EnhancedLineItem,
  RepairUnit,
  RepairCondition,
} from '@hps-internal/contracts';
import { estimatorSectionsV2 } from '@/constants';
import { computeEnhancedTotals } from './repairsMathEnhanced';

// -----------------------------------------------------------------------------
// Legacy Types (V1 estimator state)
// -----------------------------------------------------------------------------

interface LegacyEstimatorState {
  costs?: Record<
    string,
    Record<string, { condition?: string; cost: number | null; notes?: string }>
  >;
  quantities?: Record<string, number | null>;
}

// -----------------------------------------------------------------------------
// Category Mapping (V1 → V2)
// -----------------------------------------------------------------------------

/**
 * Maps V1 category keys to V2 category keys
 * Used for backward compatibility when migrating existing data
 */
const CATEGORY_MAP: Record<string, string> = {
  exterior: 'exterior',
  interior: 'interior',
  kitchenBath: 'kitchen', // V1 kitchenBath → V2 kitchen (primary)
  systems: 'hvac', // V1 systems → V2 hvac (primary)
  structural: 'foundation', // V1 structural → V2 foundation
};

// -----------------------------------------------------------------------------
// Unit Mapping (V1 unitName → V2 RepairUnit)
// -----------------------------------------------------------------------------

const UNIT_MAP: Record<string, RepairUnit> = {
  each: 'each',
  EA: 'each',
  sf: 'sq_ft',
  SF: 'sq_ft',
  'sq ft': 'sq_ft',
  lf: 'linear_ft',
  LF: 'linear_ft',
  'lin ft': 'linear_ft',
  sq: 'square',
  SQ: 'square',
  ls: 'lump',
  LS: 'lump',
  lump: 'lump',
};

/**
 * Map V1 unit name to V2 RepairUnit
 */
function mapUnitName(unitName: string | undefined): RepairUnit {
  if (!unitName) return 'each';
  return UNIT_MAP[unitName] ?? 'each';
}

/**
 * Validate and normalize condition string to RepairCondition
 */
function normalizeCondition(condition: string | undefined): RepairCondition {
  const validConditions: RepairCondition[] = [
    'n/a',
    'good',
    'fair',
    'poor',
    'replace',
  ];
  if (condition && validConditions.includes(condition as RepairCondition)) {
    return condition as RepairCondition;
  }
  return 'n/a';
}

// -----------------------------------------------------------------------------
// Migration Functions
// -----------------------------------------------------------------------------

/**
 * Convert legacy EstimatorState (V1) to EnhancedEstimatorState (V2)
 *
 * @description
 * Migration rules:
 * - cost becomes totalCost
 * - isManualOverride = true (V1 was always manual entry)
 * - quantity preserved
 * - condition preserved
 * - notes preserved
 * - unit inferred from section definition or defaults to 'each'
 * - unitCost = null (not available in V1)
 *
 * @param legacy - V1 estimator state (or null/undefined)
 * @param contingencyPercent - Optional contingency percentage (default: 15)
 * @returns V2 enhanced estimator state
 */
export function migrateEstimatorState(
  legacy: LegacyEstimatorState | null | undefined,
  contingencyPercent: number = 15
): EnhancedEstimatorState {
  const categories: Record<string, EnhancedCategory> = {};

  // Initialize all V2 categories with items from definitions
  for (const [categoryKey, sectionDef] of Object.entries(estimatorSectionsV2)) {
    const items: EnhancedLineItem[] = [];
    let itemOrder = 0;

    for (const [itemKey, itemDef] of Object.entries(sectionDef.items)) {
      // Try to find legacy data for this item
      let legacyCost:
        | { condition?: string; cost: number | null; notes?: string }
        | undefined;
      let legacyQty: number | null = null;

      // Direct lookup in V2 category
      if (legacy?.costs?.[categoryKey]?.[itemKey]) {
        legacyCost = legacy.costs[categoryKey][itemKey];
        legacyQty = legacy.quantities?.[itemKey] ?? null;
      }

      // Try mapped category lookup for V1 split categories
      if (!legacyCost) {
        for (const [v1Cat, v2Cat] of Object.entries(CATEGORY_MAP)) {
          if (v2Cat === categoryKey && legacy?.costs?.[v1Cat]?.[itemKey]) {
            legacyCost = legacy.costs[v1Cat][itemKey];
            legacyQty = legacy.quantities?.[itemKey] ?? null;
            break;
          }
        }
      }

      const totalCost = legacyCost?.cost ?? null;

      items.push({
        itemKey,
        label: itemDef.label,
        categoryKey,
        condition: normalizeCondition(legacyCost?.condition),
        quantity: legacyQty,
        unit: mapUnitName(itemDef.unitName),
        unitCost: null, // V1 doesn't have unit cost
        totalCost: totalCost && totalCost > 0 ? totalCost : null,
        isManualOverride: totalCost !== null && totalCost > 0, // Manual if has value
        notes: legacyCost?.notes ?? '',
        displayOrder: itemOrder++,
      });
    }

    categories[categoryKey] = {
      categoryKey,
      title: sectionDef.title,
      icon: sectionDef.icon,
      items,
      subtotal: 0, // Will be computed
      displayOrder: sectionDef.displayOrder,
    };
  }

  const initialState: EnhancedEstimatorState = {
    categories,
    grandTotal: 0,
    contingencyPercent,
    contingencyAmount: 0,
    totalWithContingency: 0,
    version: 2,
  };

  // Compute all totals
  return computeEnhancedTotals(initialState);
}

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

/**
 * Type guard: Is this an enhanced state (V2)?
 */
export function isEnhancedState(state: unknown): state is EnhancedEstimatorState {
  return (
    state !== null &&
    typeof state === 'object' &&
    (state as Record<string, unknown>).version === 2 &&
    'categories' in state &&
    typeof (state as Record<string, unknown>).categories === 'object'
  );
}

/**
 * Type guard: Is this a legacy state (V1)?
 */
export function isLegacyState(state: unknown): state is LegacyEstimatorState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  // V1 has costs/quantities but no version field
  return 'costs' in s && !('version' in s);
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create fresh enhanced state with no data
 */
export function createEmptyEnhancedState(
  contingencyPercent: number = 15
): EnhancedEstimatorState {
  return migrateEstimatorState(null, contingencyPercent);
}

/**
 * Get or create enhanced state from deal data
 *
 * @description
 * Checks for existing V2 state, otherwise migrates V1 or creates empty.
 *
 * @param existingEnhanced - Potential V2 state from deal.repairs.enhancedEstimatorState
 * @param legacyState - V1 state from deal.repairs.estimatorState
 * @param contingencyPercent - Contingency percentage to use
 * @returns V2 enhanced estimator state
 */
export function getOrCreateEnhancedState(
  existingEnhanced: unknown,
  legacyState: LegacyEstimatorState | null | undefined,
  contingencyPercent: number = 15
): EnhancedEstimatorState {
  // Check if we already have V2 state
  if (isEnhancedState(existingEnhanced)) {
    return existingEnhanced;
  }

  // Migrate from V1 or create empty
  return migrateEstimatorState(legacyState, contingencyPercent);
}
