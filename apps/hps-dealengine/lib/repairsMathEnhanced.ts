// ============================================================================
// REPAIRS MATH ENHANCED — Business Logic
// ============================================================================
// Principles Applied:
// - Determinism: Pure functions, no side effects
// - Immutability: Always return new objects
// - Null safety: Explicit handling of null/undefined
// - Edge case handling: NaN, negative, zero
// ============================================================================

import type {
  EnhancedLineItem,
  EnhancedCategory,
  EnhancedEstimatorState,
  ContingencyPolicy,
  RehabLevel,
  RepairUnit,
} from '@hps-internal/contracts';
import { DEFAULT_CONTINGENCY_POLICY } from '@hps-internal/contracts';
import { estimatorSectionsV2 } from '@/constants';

// -----------------------------------------------------------------------------
// Line Item Calculations
// -----------------------------------------------------------------------------

/**
 * Calculate total cost for a single line item
 *
 * @description
 * Rules (in order of precedence):
 * 1. If isManualOverride = true AND totalCost is valid, use totalCost
 * 2. Otherwise: quantity × unitCost
 * 3. If quantity OR unitCost is null/undefined/NaN, return 0
 * 4. Never return negative values
 *
 * @param item - Enhanced line item
 * @returns Computed total cost (always >= 0)
 *
 * @example
 * computeLineItemTotal({ quantity: 10, unitCost: 5, isManualOverride: false }) // 50
 * computeLineItemTotal({ totalCost: 100, isManualOverride: true }) // 100
 * computeLineItemTotal({ quantity: null, unitCost: 5 }) // 0
 */
export function computeLineItemTotal(item: EnhancedLineItem): number {
  // Rule 1: Manual override takes precedence
  if (
    item.isManualOverride &&
    item.totalCost !== null &&
    item.totalCost !== undefined
  ) {
    const cost = Number(item.totalCost);
    if (Number.isNaN(cost) || cost < 0) return 0;
    return cost;
  }

  // Rule 2: Compute from Qty × UnitCost
  const qty = item.quantity;
  const rate = item.unitCost;

  // Rule 3: Null/undefined/NaN handling
  if (qty === null || qty === undefined || rate === null || rate === undefined) {
    return 0;
  }

  const quantity = Number(qty);
  const unitCost = Number(rate);

  if (Number.isNaN(quantity) || Number.isNaN(unitCost)) {
    return 0;
  }

  // Rule 4: Never negative
  const total = quantity * unitCost;
  return Math.max(0, total);
}

// -----------------------------------------------------------------------------
// Category Calculations
// -----------------------------------------------------------------------------

/**
 * Calculate subtotal for a category (sum of line item totals)
 *
 * @param category - Enhanced category with items
 * @returns Sum of all line item totals (always >= 0)
 */
export function computeCategorySubtotal(category: EnhancedCategory): number {
  if (!category.items || !Array.isArray(category.items)) {
    return 0;
  }

  return category.items.reduce((sum, item) => {
    const itemTotal = computeLineItemTotal(item);
    return sum + itemTotal;
  }, 0);
}

/**
 * Check if category has any items with values
 */
export function categoryHasValues(category: EnhancedCategory): boolean {
  if (!category.items || !Array.isArray(category.items)) {
    return false;
  }
  return category.items.some((item) => computeLineItemTotal(item) > 0);
}

/**
 * Count items with values in a category
 */
export function countItemsWithValues(category: EnhancedCategory): number {
  if (!category.items || !Array.isArray(category.items)) {
    return 0;
  }
  return category.items.filter((item) => computeLineItemTotal(item) > 0).length;
}

// -----------------------------------------------------------------------------
// State Calculations
// -----------------------------------------------------------------------------

/**
 * Compute all totals for enhanced estimator state
 *
 * @description
 * Performs full recalculation of:
 * - Each category subtotal
 * - Grand total (sum of subtotals)
 * - Contingency amount (grandTotal × contingencyPercent / 100)
 * - Total with contingency
 * - lastUpdated timestamp
 *
 * @param state - Current enhanced estimator state
 * @returns New state with all totals computed (immutable)
 */
export function computeEnhancedTotals(
  state: EnhancedEstimatorState
): EnhancedEstimatorState {
  // Compute each category subtotal
  const updatedCategories: Record<string, EnhancedCategory> = {};
  let grandTotal = 0;

  for (const [categoryKey, category] of Object.entries(state.categories)) {
    const subtotal = computeCategorySubtotal(category);
    grandTotal += subtotal;

    updatedCategories[categoryKey] = {
      ...category,
      subtotal,
    };
  }

  // Compute contingency
  const contingencyPercent = state.contingencyPercent ?? 15;
  const contingencyAmount = Math.round((grandTotal * contingencyPercent) / 100);
  const totalWithContingency = grandTotal + contingencyAmount;

  return {
    ...state,
    categories: updatedCategories,
    grandTotal,
    contingencyPercent,
    contingencyAmount,
    totalWithContingency,
    lastUpdated: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Contingency Helpers
// -----------------------------------------------------------------------------

/**
 * Get contingency percentage for a rehab level
 *
 * @param rehabLevel - Rehab level (none, light, medium, heavy, structural)
 * @param policy - Optional custom contingency policy
 * @returns Contingency percentage (0-100)
 */
export function getContingencyPercent(
  rehabLevel: RehabLevel | string,
  policy: ContingencyPolicy = DEFAULT_CONTINGENCY_POLICY
): number {
  const level = rehabLevel as keyof ContingencyPolicy;

  if (level in policy) {
    return policy[level];
  }

  // Default to medium if unknown
  return policy.medium ?? 15;
}

// -----------------------------------------------------------------------------
// Line Item Updates
// -----------------------------------------------------------------------------

/**
 * Update a single line item and recompute all totals
 *
 * @description
 * Immutably updates a line item and triggers full state recalculation.
 * Returns original state if category or item not found.
 *
 * @param state - Current state
 * @param categoryKey - Category containing the item
 * @param itemKey - Item to update
 * @param updates - Partial updates to apply
 * @returns New state with updates applied
 */
export function updateLineItem(
  state: EnhancedEstimatorState,
  categoryKey: string,
  itemKey: string,
  updates: Partial<EnhancedLineItem>
): EnhancedEstimatorState {
  // Validate category exists
  const category = state.categories[categoryKey];
  if (!category) {
    console.warn(`[repairsMathEnhanced] Category not found: ${categoryKey}`);
    return state;
  }

  // Find item index
  const itemIndex = category.items.findIndex((item) => item.itemKey === itemKey);
  if (itemIndex === -1) {
    console.warn(
      `[repairsMathEnhanced] Item not found: ${itemKey} in ${categoryKey}`
    );
    return state;
  }

  // Create updated item
  const updatedItem: EnhancedLineItem = {
    ...category.items[itemIndex],
    ...updates,
  };

  // Create updated items array
  const updatedItems = [...category.items];
  updatedItems[itemIndex] = updatedItem;

  // Create updated category
  const updatedCategory: EnhancedCategory = {
    ...category,
    items: updatedItems,
  };

  // Create updated state
  const updatedState: EnhancedEstimatorState = {
    ...state,
    categories: {
      ...state.categories,
      [categoryKey]: updatedCategory,
    },
  };

  // Recompute all totals
  return computeEnhancedTotals(updatedState);
}

// -----------------------------------------------------------------------------
// Unit Cost Lookup
// -----------------------------------------------------------------------------

/**
 * Get unit cost with fallback chain
 *
 * @description
 * Fallback order:
 * 1. lineItemRates[categoryKey][itemKey] (nested structure)
 * 2. lineItemRates[itemKey] (flat structure)
 * 3. defaultUnitCost from estimatorSectionsV2
 * 4. 0
 *
 * @param itemKey - Item identifier
 * @param categoryKey - Category identifier
 * @param lineItemRates - Rate profile data (from repair_rate_sets)
 * @returns Unit cost (always >= 0)
 */
export function getUnitCost(
  itemKey: string,
  categoryKey: string,
  lineItemRates: Record<string, unknown> | undefined
): number {
  // Fallback 1: Nested structure
  if (lineItemRates) {
    const categoryRates = lineItemRates[categoryKey];
    if (categoryRates && typeof categoryRates === 'object') {
      const rate = (categoryRates as Record<string, unknown>)[itemKey];
      if (typeof rate === 'number' && !Number.isNaN(rate) && rate >= 0) {
        return rate;
      }
    }

    // Fallback 2: Flat structure
    const flatRate = lineItemRates[itemKey];
    if (typeof flatRate === 'number' && !Number.isNaN(flatRate) && flatRate >= 0) {
      return flatRate;
    }
  }

  // Fallback 3: Default from constants
  const sectionDef = estimatorSectionsV2[categoryKey];
  if (sectionDef?.items?.[itemKey]) {
    const defaultCost = sectionDef.items[itemKey].defaultUnitCost;
    if (
      typeof defaultCost === 'number' &&
      !Number.isNaN(defaultCost) &&
      defaultCost >= 0
    ) {
      return defaultCost;
    }
  }

  // Fallback 4: Zero
  return 0;
}

// -----------------------------------------------------------------------------
// Formatting Helpers
// -----------------------------------------------------------------------------

/**
 * Format number as currency string
 *
 * @param value - Number to format (null = $0)
 * @returns Formatted currency string (e.g., "$1,234")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format unit display string
 *
 * @param unit - Unit type
 * @param _quantity - Quantity (reserved for future pluralization)
 * @returns Display string (e.g., "SF", "each", "LS")
 */
export function formatUnit(unit: RepairUnit | string, _quantity: number | null): string {
  const unitMap: Record<string, string> = {
    each: 'each',
    sq_ft: 'SF',
    linear_ft: 'LF',
    square: 'SQ',
    lump: 'LS',
    unit: 'unit',
  };

  return unitMap[unit] ?? unit;
}

// -----------------------------------------------------------------------------
// State Validation
// -----------------------------------------------------------------------------

/**
 * Validate enhanced estimator state structure
 */
export function isValidEnhancedState(
  state: unknown
): state is EnhancedEstimatorState {
  if (!state || typeof state !== 'object') return false;

  const s = state as Record<string, unknown>;

  return (
    s.version === 2 &&
    typeof s.categories === 'object' &&
    s.categories !== null &&
    typeof s.grandTotal === 'number' &&
    typeof s.contingencyPercent === 'number'
  );
}

// -----------------------------------------------------------------------------
// State Initialization
// -----------------------------------------------------------------------------

/**
 * Create an empty enhanced estimator state from section definitions
 *
 * @returns New EnhancedEstimatorState with all categories and items initialized
 */
export function createEmptyEnhancedState(): EnhancedEstimatorState {
  const categories: Record<string, EnhancedCategory> = {};

  for (const [categoryKey, sectionDef] of Object.entries(estimatorSectionsV2)) {
    const items: EnhancedLineItem[] = [];

    for (const [itemKey, itemDef] of Object.entries(sectionDef.items)) {
      items.push({
        itemKey,
        label: itemDef.label,
        categoryKey,
        condition: 'n/a',
        quantity: null,
        unit: itemDef.unit,
        unitCost: itemDef.defaultUnitCost,
        totalCost: null,
        isManualOverride: false,
        notes: '',
        displayOrder: items.length,
      });
    }

    categories[categoryKey] = {
      categoryKey,
      title: sectionDef.title,
      icon: sectionDef.icon,
      items,
      subtotal: 0,
      displayOrder: sectionDef.displayOrder,
    };
  }

  return {
    categories,
    grandTotal: 0,
    contingencyPercent: 15,
    contingencyAmount: 0,
    totalWithContingency: 0,
    version: 2,
  };
}
