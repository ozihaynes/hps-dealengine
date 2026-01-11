// ============================================================================
// REPAIRS ADAPTER — Unit Tests
// ============================================================================
// File: apps/hps-dealengine/lib/repairsAdapter.test.ts
// Action: CREATE new file
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  migrateEstimatorState,
  isEnhancedState,
  isLegacyState,
  createEmptyEnhancedState,
  getOrCreateEnhancedState,
} from './repairsAdapter';

// -----------------------------------------------------------------------------
// migrateEstimatorState Tests
// -----------------------------------------------------------------------------

describe('migrateEstimatorState', () => {
  it('creates valid V2 state from null', () => {
    const result = migrateEstimatorState(null);

    expect(result.version).toBe(2);
    expect(result.categories).toBeDefined();
    expect(Object.keys(result.categories).length).toBe(13);
  });

  it('creates valid V2 state from undefined', () => {
    const result = migrateEstimatorState(undefined);

    expect(result.version).toBe(2);
    expect(Object.keys(result.categories).length).toBe(13);
  });

  it('preserves legacy cost as totalCost with manual override', () => {
    const legacy = {
      costs: {
        interior: {
          interiorPaint: { cost: 5000, condition: 'fair', notes: 'Full repaint' },
        },
      },
      quantities: { interiorPaint: 2000 },
    };

    const result = migrateEstimatorState(legacy);
    const item = result.categories.interior.items.find(
      (i) => i.itemKey === 'interiorPaint'
    );

    expect(item?.totalCost).toBe(5000);
    expect(item?.isManualOverride).toBe(true);
    expect(item?.condition).toBe('fair');
    expect(item?.notes).toBe('Full repaint');
    expect(item?.quantity).toBe(2000);
  });

  it('sets correct contingency percent', () => {
    const result = migrateEstimatorState(null, 20);
    expect(result.contingencyPercent).toBe(20);
  });

  it('handles empty costs object', () => {
    const result = migrateEstimatorState({ costs: {}, quantities: {} });
    expect(result.grandTotal).toBe(0);
  });

  it('creates 64 total items across all categories', () => {
    const result = migrateEstimatorState(null);
    const totalItems = Object.values(result.categories).reduce(
      (sum, cat) => sum + cat.items.length,
      0
    );
    expect(totalItems).toBe(64);
  });

  it('normalizes invalid condition to n/a', () => {
    const legacy = {
      costs: {
        roofing: {
          shingleInstall: { cost: 1000, condition: 'invalid_condition' },
        },
      },
      quantities: {},
    };

    const result = migrateEstimatorState(legacy);
    const item = result.categories.roofing.items.find(
      (i) => i.itemKey === 'shingleInstall'
    );

    expect(item?.condition).toBe('n/a');
  });

  it('handles V1 category mapping (kitchenBath → kitchen)', () => {
    const legacy = {
      costs: {
        kitchenBath: {
          cabinets: { cost: 3000, condition: 'replace' },
        },
      },
      quantities: { cabinets: 20 },
    };

    const result = migrateEstimatorState(legacy);
    const item = result.categories.kitchen.items.find(
      (i) => i.itemKey === 'cabinets'
    );

    expect(item?.totalCost).toBe(3000);
    expect(item?.condition).toBe('replace');
    expect(item?.quantity).toBe(20);
  });

  it('ignores zero and negative costs', () => {
    const legacy = {
      costs: {
        roofing: {
          shingleInstall: { cost: 0 },
          roofTearOff: { cost: -100 },
        },
      },
      quantities: {},
    };

    const result = migrateEstimatorState(legacy);

    const shingle = result.categories.roofing.items.find(
      (i) => i.itemKey === 'shingleInstall'
    );
    const tearOff = result.categories.roofing.items.find(
      (i) => i.itemKey === 'roofTearOff'
    );

    expect(shingle?.totalCost).toBeNull();
    expect(shingle?.isManualOverride).toBe(false);
    expect(tearOff?.totalCost).toBeNull();
  });

  it('computes totals after migration', () => {
    const legacy = {
      costs: {
        roofing: {
          shingleInstall: { cost: 5000 },
          roofTearOff: { cost: 2000 },
        },
      },
      quantities: {},
    };

    const result = migrateEstimatorState(legacy, 15);

    expect(result.categories.roofing.subtotal).toBe(7000);
    expect(result.grandTotal).toBe(7000);
    expect(result.contingencyAmount).toBe(1050); // 7000 × 15%
    expect(result.totalWithContingency).toBe(8050);
  });
});

// -----------------------------------------------------------------------------
// isEnhancedState Tests
// -----------------------------------------------------------------------------

describe('isEnhancedState', () => {
  it('returns true for valid V2 state', () => {
    const state = createEmptyEnhancedState();
    expect(isEnhancedState(state)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEnhancedState(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isEnhancedState(undefined)).toBe(false);
  });

  it('returns false for V1 state', () => {
    const v1 = { costs: {}, quantities: {} };
    expect(isEnhancedState(v1)).toBe(false);
  });

  it('returns false for state with wrong version', () => {
    const wrongVersion = { version: 1, categories: {} };
    expect(isEnhancedState(wrongVersion)).toBe(false);
  });

  it('returns false for state without categories', () => {
    const noCategories = { version: 2 };
    expect(isEnhancedState(noCategories)).toBe(false);
  });

  it('returns false for primitive values', () => {
    expect(isEnhancedState('string')).toBe(false);
    expect(isEnhancedState(123)).toBe(false);
    expect(isEnhancedState(true)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// isLegacyState Tests
// -----------------------------------------------------------------------------

describe('isLegacyState', () => {
  it('returns true for V1 state with costs', () => {
    const v1 = { costs: {}, quantities: {} };
    expect(isLegacyState(v1)).toBe(true);
  });

  it('returns true for V1 state with only costs', () => {
    const v1 = { costs: { roofing: {} } };
    expect(isLegacyState(v1)).toBe(true);
  });

  it('returns false for V2 state', () => {
    const v2 = createEmptyEnhancedState();
    expect(isLegacyState(v2)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLegacyState(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLegacyState(undefined)).toBe(false);
  });

  it('returns false for object without costs', () => {
    expect(isLegacyState({ foo: 'bar' })).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// createEmptyEnhancedState Tests
// -----------------------------------------------------------------------------

describe('createEmptyEnhancedState', () => {
  it('creates state with 13 categories', () => {
    const state = createEmptyEnhancedState();
    expect(Object.keys(state.categories).length).toBe(13);
  });

  it('creates state with 64 total items', () => {
    const state = createEmptyEnhancedState();
    const totalItems = Object.values(state.categories).reduce(
      (sum, cat) => sum + cat.items.length,
      0
    );
    expect(totalItems).toBe(64);
  });

  it('has zero totals', () => {
    const state = createEmptyEnhancedState();
    expect(state.grandTotal).toBe(0);
    expect(state.totalWithContingency).toBe(0);
  });

  it('uses default contingency percent (15)', () => {
    const state = createEmptyEnhancedState();
    expect(state.contingencyPercent).toBe(15);
  });

  it('uses provided contingency percent', () => {
    const state = createEmptyEnhancedState(25);
    expect(state.contingencyPercent).toBe(25);
  });

  it('creates all expected category keys', () => {
    const state = createEmptyEnhancedState();
    const expectedKeys = [
      'demolition',
      'roofing',
      'exterior',
      'windowsDoors',
      'foundation',
      'plumbing',
      'electrical',
      'hvac',
      'interior',
      'flooring',
      'kitchen',
      'bathrooms',
      'permits',
    ];

    for (const key of expectedKeys) {
      expect(state.categories[key]).toBeDefined();
    }
  });
});

// -----------------------------------------------------------------------------
// getOrCreateEnhancedState Tests
// -----------------------------------------------------------------------------

describe('getOrCreateEnhancedState', () => {
  it('returns existing V2 state if valid', () => {
    const existing = createEmptyEnhancedState();
    const result = getOrCreateEnhancedState(existing, null, 15);
    expect(result).toBe(existing);
  });

  it('migrates from V1 if no V2 state', () => {
    const legacy = {
      costs: {
        roofing: {
          shingleInstall: { cost: 7200, condition: 'replace' },
        },
      },
      quantities: {},
    };

    const result = getOrCreateEnhancedState(null, legacy, 15);

    expect(result.version).toBe(2);
    const item = result.categories.roofing?.items.find(
      (i) => i.itemKey === 'shingleInstall'
    );
    expect(item?.totalCost).toBe(7200);
  });

  it('creates empty if no existing data', () => {
    const result = getOrCreateEnhancedState(null, null, 15);

    expect(result.version).toBe(2);
    expect(result.grandTotal).toBe(0);
  });

  it('prefers V2 over V1 when both provided', () => {
    const v2 = createEmptyEnhancedState(20);
    const legacy = {
      costs: {
        roofing: { shingleInstall: { cost: 5000 } },
      },
      quantities: {},
    };

    const result = getOrCreateEnhancedState(v2, legacy, 15);

    // Should return the V2 state, not migrate from V1
    expect(result).toBe(v2);
    expect(result.contingencyPercent).toBe(20); // V2's value, not the 15 passed
  });

  it('uses provided contingency when creating new state', () => {
    const result = getOrCreateEnhancedState(null, null, 25);
    expect(result.contingencyPercent).toBe(25);
  });
});
