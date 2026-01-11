// ============================================================================
// REPAIRS INTEGRATION TESTS
// ============================================================================
// File: apps/hps-dealengine/lib/repairs.integration.test.ts
// Purpose: Integration tests for the enhanced repairs system (Slice C)
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  updateLineItem,
  computeEnhancedTotals,
  getContingencyPercent,
  computeLineItemTotal,
  computeCategorySubtotal,
} from './repairsMathEnhanced';
import {
  migrateEstimatorState,
  createEmptyEnhancedState,
  getOrCreateEnhancedState,
  isEnhancedState,
  isLegacyState,
} from './repairsAdapter';
import type { EnhancedEstimatorState } from '@hps-internal/contracts';

describe('Repairs Integration', () => {
  describe('State Update Flow', () => {
    it('updates state when line item changed', () => {
      const state = createEmptyEnhancedState(15);

      // Simulate user updating interior paint quantity
      const updated = updateLineItem(state, 'interior', 'interiorPaint', {
        quantity: 1500,
        unitCost: 2.5,
      });

      // Verify item was updated
      const item = updated.categories.interior?.items.find(
        (i) => i.itemKey === 'interiorPaint'
      );
      expect(item?.quantity).toBe(1500);
      expect(item?.unitCost).toBe(2.5);

      // Verify totals recalculated
      expect(updated.categories.interior?.subtotal).toBe(3750); // 1500 * 2.5
      expect(updated.grandTotal).toBe(3750);
    });

    it('maintains backward compatibility with repairs.total', () => {
      const state = createEmptyEnhancedState(15);
      const updated = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 24,
        unitCost: 300,
      });

      // 24 * 300 = 7200
      // 7200 * 1.15 = 8280 (with 15% contingency)
      expect(updated.grandTotal).toBe(7200);
      expect(updated.totalWithContingency).toBe(8280);
    });

    it('handles multiple line items in same category', () => {
      let state = createEmptyEnhancedState(15);

      // Add two items
      state = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 24,
        unitCost: 300,
      });
      state = updateLineItem(state, 'roofing', 'flashingRepair', {
        quantity: 50,
        unitCost: 10,
      });

      // 24*300 + 50*10 = 7200 + 500 = 7700
      expect(state.categories.roofing?.subtotal).toBe(7700);
      expect(state.grandTotal).toBe(7700);
    });

    it('handles manual override correctly', () => {
      let state = createEmptyEnhancedState(15);

      // Set manual override
      state = updateLineItem(state, 'roofing', 'shingleInstall', {
        totalCost: 5000,
        isManualOverride: true,
      });

      const item = state.categories.roofing?.items.find(
        (i) => i.itemKey === 'shingleInstall'
      );
      expect(item?.isManualOverride).toBe(true);
      expect(item?.totalCost).toBe(5000);
      expect(computeLineItemTotal(item!)).toBe(5000);
    });
  });

  describe('Contingency Sync', () => {
    it('returns correct contingency for each rehab level', () => {
      expect(getContingencyPercent('none')).toBe(0);
      expect(getContingencyPercent('light')).toBe(10);
      expect(getContingencyPercent('medium')).toBe(15);
      expect(getContingencyPercent('heavy')).toBe(20);
      expect(getContingencyPercent('structural')).toBe(25);
    });

    it('defaults to medium for unknown rehab level', () => {
      expect(getContingencyPercent('unknown' as any)).toBe(15);
      expect(getContingencyPercent('' as any)).toBe(15);
    });

    it('updates contingency when rehab level changes', () => {
      const state = createEmptyEnhancedState(10); // light = 10%

      // Add some value first
      let updated = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 24,
        unitCost: 300,
      });
      expect(updated.contingencyPercent).toBe(10);
      expect(updated.contingencyAmount).toBe(720); // 7200 * 0.10

      // Simulate rehab level change to medium
      updated = computeEnhancedTotals({
        ...updated,
        contingencyPercent: getContingencyPercent('medium'), // 15%
      });

      expect(updated.contingencyPercent).toBe(15);
      expect(updated.contingencyAmount).toBe(1080); // 7200 * 0.15
      expect(updated.totalWithContingency).toBe(8280);
    });
  });

  describe('Migration from V1', () => {
    it('migrates V1 state preserving cost data', () => {
      const legacyState = {
        costs: {
          interior: {
            interiorPaint: { cost: 5000, condition: 'fair', notes: 'Test note' },
          },
        },
        quantities: { interiorPaint: 2000 },
      };

      const migrated = migrateEstimatorState(legacyState, 15);

      // Verify data preserved
      const item = migrated.categories.interior?.items.find(
        (i) => i.itemKey === 'interiorPaint'
      );
      expect(item?.totalCost).toBe(5000);
      expect(item?.isManualOverride).toBe(true); // Legacy costs are manual overrides
      expect(item?.condition).toBe('fair');
      expect(item?.notes).toBe('Test note');
    });

    it('creates empty state when no legacy data', () => {
      const empty = createEmptyEnhancedState(15);

      expect(empty.version).toBe(2);
      expect(Object.keys(empty.categories).length).toBe(13);
      expect(empty.grandTotal).toBe(0);
      expect(empty.contingencyPercent).toBe(15);
    });

    it('handles null legacy state gracefully', () => {
      const state = migrateEstimatorState(null, 15);
      expect(state.version).toBe(2);
      expect(state.grandTotal).toBe(0);
    });

    it('handles undefined legacy state gracefully', () => {
      const state = migrateEstimatorState(undefined, 15);
      expect(state.version).toBe(2);
      expect(state.grandTotal).toBe(0);
    });
  });

  describe('getOrCreateEnhancedState', () => {
    it('returns existing enhanced state if valid', () => {
      const existing: EnhancedEstimatorState = {
        categories: {},
        grandTotal: 5000,
        contingencyPercent: 15,
        contingencyAmount: 750,
        totalWithContingency: 5750,
        version: 2,
      };

      const result = getOrCreateEnhancedState(existing, null, 15);

      expect(result).toEqual(existing);
    });

    it('migrates legacy state if no enhanced state', () => {
      const legacy = {
        costs: { roofing: { shingleInstall: { cost: 7200 } } },
      };

      const result = getOrCreateEnhancedState(null, legacy, 15);

      expect(result.version).toBe(2);
      const item = result.categories.roofing?.items.find(
        (i) => i.itemKey === 'shingleInstall'
      );
      expect(item?.totalCost).toBe(7200);
    });

    it('creates empty state if nothing exists', () => {
      const result = getOrCreateEnhancedState(null, null, 15);

      expect(result.version).toBe(2);
      expect(result.grandTotal).toBe(0);
    });
  });

  describe('Type Guards', () => {
    it('correctly identifies enhanced state', () => {
      const enhanced: EnhancedEstimatorState = {
        categories: {},
        grandTotal: 0,
        contingencyPercent: 15,
        contingencyAmount: 0,
        totalWithContingency: 0,
        version: 2,
      };

      expect(isEnhancedState(enhanced)).toBe(true);
      expect(isEnhancedState(null)).toBe(false);
      expect(isEnhancedState(undefined)).toBe(false);
      expect(isEnhancedState({ version: 1 })).toBe(false);
    });

    it('correctly identifies legacy state', () => {
      const legacy = {
        costs: {},
        quantities: {},
      };

      expect(isLegacyState(legacy)).toBe(true);
      expect(isLegacyState(null)).toBe(false);
      expect(isLegacyState({ version: 2, categories: {} })).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero quantity gracefully', () => {
      let state = createEmptyEnhancedState(15);
      state = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 0,
        unitCost: 300,
      });

      expect(state.grandTotal).toBe(0);
    });

    it('handles null unit cost gracefully', () => {
      let state = createEmptyEnhancedState(15);
      state = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 24,
        unitCost: null,
      });

      const item = state.categories.roofing?.items.find(
        (i) => i.itemKey === 'shingleInstall'
      );
      expect(computeLineItemTotal(item!)).toBe(0);
    });

    it('handles non-existent category gracefully', () => {
      const state = createEmptyEnhancedState(15);
      const result = updateLineItem(
        state,
        'nonExistentCategory',
        'someItem',
        { quantity: 10 }
      );

      // Should return original state unchanged
      expect(result).toEqual(state);
    });

    it('handles non-existent item gracefully', () => {
      const state = createEmptyEnhancedState(15);
      const result = updateLineItem(state, 'roofing', 'nonExistentItem', {
        quantity: 10,
      });

      // Should return original state unchanged
      expect(result).toEqual(state);
    });
  });

  describe('Computation Accuracy', () => {
    it('computes category subtotal correctly', () => {
      let state = createEmptyEnhancedState(15);

      // Add multiple items
      state = updateLineItem(state, 'interior', 'interiorPaint', {
        quantity: 1500,
        unitCost: 2.5,
      });
      state = updateLineItem(state, 'interior', 'drywall', {
        quantity: 200,
        unitCost: 4,
      });

      // 1500 * 2.5 + 200 * 4 = 3750 + 800 = 4550
      const category = state.categories.interior;
      expect(computeCategorySubtotal(category!)).toBe(4550);
    });

    it('computes grand total correctly across categories', () => {
      let state = createEmptyEnhancedState(15);

      state = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 24,
        unitCost: 300,
      });
      state = updateLineItem(state, 'interior', 'interiorPaint', {
        quantity: 1500,
        unitCost: 2.5,
      });
      state = updateLineItem(state, 'flooring', 'lvpFlooring', {
        quantity: 1500,
        unitCost: 6,
      });

      // 7200 + 3750 + 9000 = 19950
      expect(state.grandTotal).toBe(19950);
    });

    it('computes contingency correctly', () => {
      let state = createEmptyEnhancedState(20); // 20% contingency

      state = updateLineItem(state, 'roofing', 'shingleInstall', {
        quantity: 24,
        unitCost: 300,
      });

      // 7200 * 0.20 = 1440
      expect(state.contingencyAmount).toBe(1440);
      expect(state.totalWithContingency).toBe(8640);
    });
  });
});
