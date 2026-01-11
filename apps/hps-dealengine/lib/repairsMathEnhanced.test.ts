// ============================================================================
// REPAIRS MATH ENHANCED — Unit Tests
// ============================================================================
// Coverage Target: 95%+
// Edge Cases: NaN, null, undefined, negative, zero, empty arrays
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  computeLineItemTotal,
  computeCategorySubtotal,
  computeEnhancedTotals,
  getContingencyPercent,
  updateLineItem,
  getUnitCost,
  formatCurrency,
  formatUnit,
  categoryHasValues,
  countItemsWithValues,
  isValidEnhancedState,
  createEmptyEnhancedState,
} from './repairsMathEnhanced';
import type {
  EnhancedLineItem,
  EnhancedCategory,
  EnhancedEstimatorState,
} from '@hps-internal/contracts';

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------

function createLineItem(overrides: Partial<EnhancedLineItem> = {}): EnhancedLineItem {
  return {
    itemKey: 'testItem',
    label: 'Test Item',
    categoryKey: 'testCategory',
    condition: 'n/a',
    quantity: null,
    unit: 'each',
    unitCost: null,
    totalCost: null,
    isManualOverride: false,
    notes: '',
    displayOrder: 0,
    ...overrides,
  };
}

function createCategory(overrides: Partial<EnhancedCategory> = {}): EnhancedCategory {
  return {
    categoryKey: 'testCategory',
    title: 'Test Category',
    icon: 'Box',
    items: [],
    subtotal: 0,
    displayOrder: 0,
    ...overrides,
  };
}

function createState(
  overrides: Partial<EnhancedEstimatorState> = {}
): EnhancedEstimatorState {
  return {
    categories: {},
    grandTotal: 0,
    contingencyPercent: 15,
    contingencyAmount: 0,
    totalWithContingency: 0,
    version: 2,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// computeLineItemTotal Tests
// -----------------------------------------------------------------------------

describe('computeLineItemTotal', () => {
  describe('Qty × UnitCost calculation', () => {
    it('returns quantity × unitCost when both provided', () => {
      const item = createLineItem({ quantity: 10, unitCost: 5 });
      expect(computeLineItemTotal(item)).toBe(50);
    });

    it('handles decimal quantities', () => {
      const item = createLineItem({ quantity: 10.5, unitCost: 2 });
      expect(computeLineItemTotal(item)).toBe(21);
    });

    it('handles decimal unit costs', () => {
      const item = createLineItem({ quantity: 100, unitCost: 2.5 });
      expect(computeLineItemTotal(item)).toBe(250);
    });

    it('handles large numbers', () => {
      const item = createLineItem({ quantity: 10000, unitCost: 100 });
      expect(computeLineItemTotal(item)).toBe(1000000);
    });
  });

  describe('manual override', () => {
    it('uses totalCost when isManualOverride is true', () => {
      const item = createLineItem({
        quantity: 10,
        unitCost: 5,
        totalCost: 100,
        isManualOverride: true,
      });
      expect(computeLineItemTotal(item)).toBe(100);
    });

    it('falls back to calculation when totalCost is null with override', () => {
      const item = createLineItem({
        quantity: 10,
        unitCost: 5,
        totalCost: null,
        isManualOverride: true,
      });
      expect(computeLineItemTotal(item)).toBe(50);
    });

    it('returns 0 for negative manual override', () => {
      const item = createLineItem({
        totalCost: -100,
        isManualOverride: true,
      });
      expect(computeLineItemTotal(item)).toBe(0);
    });
  });

  describe('null/undefined handling', () => {
    it('returns 0 when quantity is null', () => {
      const item = createLineItem({ quantity: null, unitCost: 5 });
      expect(computeLineItemTotal(item)).toBe(0);
    });

    it('returns 0 when unitCost is null', () => {
      const item = createLineItem({ quantity: 10, unitCost: null });
      expect(computeLineItemTotal(item)).toBe(0);
    });

    it('returns 0 when both are null', () => {
      const item = createLineItem({ quantity: null, unitCost: null });
      expect(computeLineItemTotal(item)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns 0 for zero quantity', () => {
      const item = createLineItem({ quantity: 0, unitCost: 5 });
      expect(computeLineItemTotal(item)).toBe(0);
    });

    it('returns 0 for zero unitCost', () => {
      const item = createLineItem({ quantity: 10, unitCost: 0 });
      expect(computeLineItemTotal(item)).toBe(0);
    });

    it('returns 0 for negative values (clamped)', () => {
      const item = createLineItem({ quantity: -10, unitCost: 5 });
      expect(computeLineItemTotal(item)).toBe(0);
    });

    it('returns 0 for NaN quantity', () => {
      const item = createLineItem({ quantity: NaN, unitCost: 5 });
      expect(computeLineItemTotal(item)).toBe(0);
    });

    it('returns 0 for NaN unitCost', () => {
      const item = createLineItem({ quantity: 10, unitCost: NaN });
      expect(computeLineItemTotal(item)).toBe(0);
    });
  });
});

// -----------------------------------------------------------------------------
// computeCategorySubtotal Tests
// -----------------------------------------------------------------------------

describe('computeCategorySubtotal', () => {
  it('sums all line item totals', () => {
    const category = createCategory({
      items: [
        createLineItem({ quantity: 10, unitCost: 5 }), // 50
        createLineItem({ quantity: 20, unitCost: 3 }), // 60
        createLineItem({ quantity: 5, unitCost: 10 }), // 50
      ],
    });
    expect(computeCategorySubtotal(category)).toBe(160);
  });

  it('returns 0 for empty items array', () => {
    const category = createCategory({ items: [] });
    expect(computeCategorySubtotal(category)).toBe(0);
  });

  it('handles mixed null values', () => {
    const category = createCategory({
      items: [
        createLineItem({ quantity: 10, unitCost: 5 }), // 50
        createLineItem({ quantity: null, unitCost: 3 }), // 0
        createLineItem({ quantity: 5, unitCost: null }), // 0
      ],
    });
    expect(computeCategorySubtotal(category)).toBe(50);
  });

  it('handles undefined items gracefully', () => {
    const category = createCategory({
      items: undefined as unknown as EnhancedLineItem[],
    });
    expect(computeCategorySubtotal(category)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// categoryHasValues Tests
// -----------------------------------------------------------------------------

describe('categoryHasValues', () => {
  it('returns true when at least one item has value', () => {
    const category = createCategory({
      items: [
        createLineItem({ quantity: null, unitCost: null }), // 0
        createLineItem({ quantity: 10, unitCost: 5 }), // 50
      ],
    });
    expect(categoryHasValues(category)).toBe(true);
  });

  it('returns false when no items have values', () => {
    const category = createCategory({
      items: [
        createLineItem({ quantity: null, unitCost: null }),
        createLineItem({ quantity: 0, unitCost: 5 }),
      ],
    });
    expect(categoryHasValues(category)).toBe(false);
  });

  it('returns false for empty category', () => {
    const category = createCategory({ items: [] });
    expect(categoryHasValues(category)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// countItemsWithValues Tests
// -----------------------------------------------------------------------------

describe('countItemsWithValues', () => {
  it('counts items with positive values', () => {
    const category = createCategory({
      items: [
        createLineItem({ quantity: 10, unitCost: 5 }), // 50
        createLineItem({ quantity: null, unitCost: 3 }), // 0
        createLineItem({ quantity: 5, unitCost: 10 }), // 50
      ],
    });
    expect(countItemsWithValues(category)).toBe(2);
  });

  it('returns 0 for empty category', () => {
    const category = createCategory({ items: [] });
    expect(countItemsWithValues(category)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// computeEnhancedTotals Tests
// -----------------------------------------------------------------------------

describe('computeEnhancedTotals', () => {
  it('computes all totals correctly', () => {
    const state = createState({
      categories: {
        cat1: createCategory({
          categoryKey: 'cat1',
          items: [createLineItem({ quantity: 10, unitCost: 10 })], // 100
        }),
        cat2: createCategory({
          categoryKey: 'cat2',
          items: [createLineItem({ quantity: 20, unitCost: 5 })], // 100
        }),
      },
      contingencyPercent: 20,
    });

    const result = computeEnhancedTotals(state);

    expect(result.grandTotal).toBe(200);
    expect(result.contingencyAmount).toBe(40);
    expect(result.totalWithContingency).toBe(240);
    expect(result.categories.cat1.subtotal).toBe(100);
    expect(result.categories.cat2.subtotal).toBe(100);
    expect(result.lastUpdated).toBeDefined();
  });

  it('handles empty state', () => {
    const state = createState({ categories: {} });
    const result = computeEnhancedTotals(state);

    expect(result.grandTotal).toBe(0);
    expect(result.contingencyAmount).toBe(0);
    expect(result.totalWithContingency).toBe(0);
  });

  it('uses default contingency when not specified', () => {
    const state = createState({
      categories: {
        cat1: createCategory({
          items: [createLineItem({ quantity: 100, unitCost: 1 })], // 100
        }),
      },
      contingencyPercent: undefined as unknown as number,
    });

    const result = computeEnhancedTotals(state);
    expect(result.contingencyPercent).toBe(15);
    expect(result.contingencyAmount).toBe(15);
  });
});

// -----------------------------------------------------------------------------
// getContingencyPercent Tests
// -----------------------------------------------------------------------------

describe('getContingencyPercent', () => {
  it('returns correct percentage for each rehab level', () => {
    expect(getContingencyPercent('none')).toBe(0);
    expect(getContingencyPercent('light')).toBe(10);
    expect(getContingencyPercent('medium')).toBe(15);
    expect(getContingencyPercent('heavy')).toBe(20);
    expect(getContingencyPercent('structural')).toBe(25);
  });

  it('returns medium (15) for unknown levels', () => {
    expect(getContingencyPercent('unknown')).toBe(15);
    expect(getContingencyPercent('')).toBe(15);
  });

  it('uses custom policy when provided', () => {
    const customPolicy = {
      none: 5,
      light: 15,
      medium: 25,
      heavy: 35,
      structural: 45,
    };
    expect(getContingencyPercent('light', customPolicy)).toBe(15);
    expect(getContingencyPercent('heavy', customPolicy)).toBe(35);
  });
});

// -----------------------------------------------------------------------------
// updateLineItem Tests
// -----------------------------------------------------------------------------

describe('updateLineItem', () => {
  it('updates item and recomputes totals', () => {
    const state = createState({
      categories: {
        testCat: createCategory({
          categoryKey: 'testCat',
          items: [
            createLineItem({ itemKey: 'item1', quantity: 10, unitCost: 5 }),
          ],
        }),
      },
    });

    const result = updateLineItem(state, 'testCat', 'item1', { quantity: 20 });

    expect(result.categories.testCat.items[0].quantity).toBe(20);
    expect(result.grandTotal).toBe(100); // 20 × 5
  });

  it('returns original state when category not found', () => {
    const state = createState({ categories: {} });
    const result = updateLineItem(state, 'nonexistent', 'item1', {
      quantity: 10,
    });

    expect(result).toBe(state);
  });

  it('returns original state when item not found', () => {
    const state = createState({
      categories: {
        testCat: createCategory({
          categoryKey: 'testCat',
          items: [createLineItem({ itemKey: 'item1' })],
        }),
      },
    });

    const result = updateLineItem(state, 'testCat', 'nonexistent', {
      quantity: 10,
    });

    expect(result).toBe(state);
  });
});

// -----------------------------------------------------------------------------
// getUnitCost Tests
// -----------------------------------------------------------------------------

describe('getUnitCost', () => {
  it('returns rate from nested structure', () => {
    const rates = {
      roofing: {
        roofTearOff: 150,
      },
    };
    expect(getUnitCost('roofTearOff', 'roofing', rates)).toBe(150);
  });

  it('returns rate from flat structure', () => {
    const rates = {
      roofTearOff: 150,
    };
    expect(getUnitCost('roofTearOff', 'roofing', rates)).toBe(150);
  });

  it('falls back to default from constants', () => {
    // estimatorSectionsV2.roofing.items.roofTearOff.defaultUnitCost = 125
    const result = getUnitCost('roofTearOff', 'roofing', undefined);
    expect(result).toBe(125);
  });

  it('returns 0 for unknown item', () => {
    const result = getUnitCost('unknownItem', 'unknownCategory', undefined);
    expect(result).toBe(0);
  });

  it('rejects negative rates', () => {
    const rates = { testItem: -100 };
    expect(getUnitCost('testItem', 'testCat', rates)).toBe(0);
  });

  it('rejects NaN rates', () => {
    const rates = { testItem: NaN };
    expect(getUnitCost('testItem', 'testCat', rates)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// formatCurrency Tests
// -----------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
    expect(formatCurrency(1000000)).toBe('$1,000,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('handles null', () => {
    expect(formatCurrency(null)).toBe('$0');
  });

  it('handles undefined', () => {
    expect(formatCurrency(undefined)).toBe('$0');
  });

  it('handles NaN', () => {
    expect(formatCurrency(NaN)).toBe('$0');
  });

  it('rounds to whole dollars', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });
});

// -----------------------------------------------------------------------------
// formatUnit Tests
// -----------------------------------------------------------------------------

describe('formatUnit', () => {
  it('formats known units', () => {
    expect(formatUnit('each', null)).toBe('each');
    expect(formatUnit('sq_ft', null)).toBe('SF');
    expect(formatUnit('linear_ft', null)).toBe('LF');
    expect(formatUnit('square', null)).toBe('SQ');
    expect(formatUnit('lump', null)).toBe('LS');
    expect(formatUnit('unit', null)).toBe('unit');
  });

  it('returns unknown units as-is', () => {
    expect(formatUnit('custom', null)).toBe('custom');
  });
});

// -----------------------------------------------------------------------------
// isValidEnhancedState Tests
// -----------------------------------------------------------------------------

describe('isValidEnhancedState', () => {
  it('returns true for valid state', () => {
    const state = createState();
    expect(isValidEnhancedState(state)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidEnhancedState(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidEnhancedState(undefined)).toBe(false);
  });

  it('returns false for wrong version', () => {
    const state = { ...createState(), version: 1 };
    expect(isValidEnhancedState(state)).toBe(false);
  });

  it('returns false for missing categories', () => {
    const state = { ...createState(), categories: null };
    expect(isValidEnhancedState(state)).toBe(false);
  });

  it('returns false for non-numeric grandTotal', () => {
    const state = { ...createState(), grandTotal: '100' };
    expect(isValidEnhancedState(state)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// createEmptyEnhancedState Tests
// -----------------------------------------------------------------------------

describe('createEmptyEnhancedState', () => {
  it('creates state with all categories from estimatorSectionsV2', () => {
    const state = createEmptyEnhancedState();

    expect(state.version).toBe(2);
    expect(state.grandTotal).toBe(0);
    expect(state.contingencyPercent).toBe(15);
    expect(Object.keys(state.categories).length).toBe(13); // 13 categories
  });

  it('creates categories with correct structure', () => {
    const state = createEmptyEnhancedState();

    const roofing = state.categories.roofing;
    expect(roofing).toBeDefined();
    expect(roofing.title).toBe('Roofing');
    expect(roofing.icon).toBe('Home');
    expect(roofing.items.length).toBe(5); // 5 items in roofing
  });

  it('creates line items with default unit costs', () => {
    const state = createEmptyEnhancedState();

    const roofTearOff = state.categories.roofing.items.find(
      (item) => item.itemKey === 'roofTearOff'
    );

    expect(roofTearOff).toBeDefined();
    expect(roofTearOff?.unitCost).toBe(125);
    expect(roofTearOff?.quantity).toBeNull();
    expect(roofTearOff?.isManualOverride).toBe(false);
  });

  it('totals 64 items across all categories', () => {
    const state = createEmptyEnhancedState();

    const totalItems = Object.values(state.categories).reduce(
      (sum, cat) => sum + cat.items.length,
      0
    );

    expect(totalItems).toBe(64);
  });
});

// -----------------------------------------------------------------------------
// Integration: Full Workflow Test
// -----------------------------------------------------------------------------

describe('Integration: Full Workflow', () => {
  it('creates state, updates items, and computes totals correctly', () => {
    // Step 1: Create empty state
    let state = createEmptyEnhancedState();
    expect(state.grandTotal).toBe(0);

    // Step 2: Update a roofing item
    state = updateLineItem(state, 'roofing', 'roofTearOff', {
      quantity: 20, // 20 squares
    });

    // roofTearOff: 20 × $125 = $2,500
    expect(state.categories.roofing.subtotal).toBe(2500);
    expect(state.grandTotal).toBe(2500);

    // Step 3: Update another item
    state = updateLineItem(state, 'roofing', 'shingleInstall', {
      quantity: 20, // 20 squares
    });

    // shingleInstall: 20 × $350 = $7,000
    // Total roofing: $2,500 + $7,000 = $9,500
    expect(state.categories.roofing.subtotal).toBe(9500);
    expect(state.grandTotal).toBe(9500);

    // Step 4: Verify contingency
    // 15% of $9,500 = $1,425
    expect(state.contingencyAmount).toBe(1425);
    expect(state.totalWithContingency).toBe(10925);
  });

  it('handles manual override correctly in workflow', () => {
    let state = createEmptyEnhancedState();

    // Set a manual override
    state = updateLineItem(state, 'permits', 'buildingPermit', {
      totalCost: 2000,
      isManualOverride: true,
    });

    expect(state.categories.permits.subtotal).toBe(2000);
    expect(state.grandTotal).toBe(2000);

    // Manual override should ignore quantity × unitCost
    state = updateLineItem(state, 'permits', 'buildingPermit', {
      quantity: 100, // This should be ignored
      totalCost: 2000,
      isManualOverride: true,
    });

    expect(state.categories.permits.subtotal).toBe(2000);
  });
});
