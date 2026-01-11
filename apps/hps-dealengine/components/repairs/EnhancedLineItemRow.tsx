'use client';

// ============================================================================
// ENHANCED LINE ITEM ROW COMPONENT
// ============================================================================
// Principles Applied:
// - Industry Standard: Qty x Unit x Rate structure
// - Accessible Forms: Labels, error states, focus management
// - Visual Hierarchy: Label prominent, inputs aligned
// - Manual Override: Toggle between calculated and manual entry
// - WCAG AA: 44px touch targets, focus indicators
// ============================================================================

import { memo, useState, useCallback } from 'react';
import { Circle, CircleDot } from 'lucide-react';
import type {
  EnhancedLineItem,
  EstimatorItemDefV2,
  RepairCondition,
} from '@hps-internal/contracts';
import { CONDITION_DISPLAY_NAMES } from '@hps-internal/contracts';
import { computeLineItemTotal, formatCurrency, formatUnit } from '@/lib/repairsMathEnhanced';
import { repairsDesignTokens, getCategoryColors } from './designTokens';

interface EnhancedLineItemRowProps {
  /** Line item data */
  item: EnhancedLineItem;
  /** Item definition from constants */
  itemDef: EstimatorItemDefV2;
  /** Callback when item is updated */
  onUpdate: (updates: Partial<EnhancedLineItem>) => void;
  /** Demo mode styling */
  isDemoMode?: boolean;
}

const CONDITIONS: RepairCondition[] = ['n/a', 'good', 'fair', 'poor', 'replace'];

export const EnhancedLineItemRow = memo(function EnhancedLineItemRow({
  item,
  itemDef,
  onUpdate,
  isDemoMode = false,
}: EnhancedLineItemRowProps) {
  const [isFocused, setIsFocused] = useState(false);
  const colors = getCategoryColors(item.categoryKey);
  const computedTotal = computeLineItemTotal(item);

  // Handle quantity change
  const handleQuantityChange = useCallback(
    (value: string) => {
      const qty = value === '' ? null : parseFloat(value);
      // Validate: reject NaN, negative
      if (qty !== null && (Number.isNaN(qty) || qty < 0)) return;
      onUpdate({
        quantity: qty,
        isManualOverride: false, // Reset to calculated mode
      });
    },
    [onUpdate]
  );

  // Handle unit cost change
  const handleUnitCostChange = useCallback(
    (value: string) => {
      const cost = value === '' ? null : parseFloat(value);
      // Validate: reject NaN, negative
      if (cost !== null && (Number.isNaN(cost) || cost < 0)) return;
      onUpdate({
        unitCost: cost,
        isManualOverride: false,
      });
    },
    [onUpdate]
  );

  // Handle manual total override
  const handleManualTotalChange = useCallback(
    (value: string) => {
      const total = value === '' ? null : parseFloat(value);
      // Validate: reject NaN, negative
      if (total !== null && (Number.isNaN(total) || total < 0)) return;
      onUpdate({
        totalCost: total,
        isManualOverride: true,
      });
    },
    [onUpdate]
  );

  // Handle condition change
  const handleConditionChange = useCallback(
    (condition: RepairCondition) => {
      // Auto-populate unit cost from condition tier if available
      const tierCost =
        itemDef.options?.[condition as keyof typeof itemDef.options];
      onUpdate({
        condition,
        unitCost: tierCost ?? itemDef.defaultUnitCost ?? null,
      });
    },
    [onUpdate, itemDef]
  );

  // Toggle manual override mode
  const toggleManualMode = useCallback(() => {
    if (item.isManualOverride) {
      // Switch back to calculated
      onUpdate({
        isManualOverride: false,
        totalCost: null,
      });
    } else {
      // Switch to manual, preserve current total
      onUpdate({
        isManualOverride: true,
        totalCost: computedTotal > 0 ? computedTotal : null,
      });
    }
  }, [item.isManualOverride, computedTotal, onUpdate]);

  return (
    <div
      className={`
        grid grid-cols-12 gap-2 items-center py-2 px-3
        border-b border-slate-800/50 last:border-b-0
        transition-colors duration-150
        ${isFocused ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'}
        ${isDemoMode ? 'border-l-2 border-l-amber-500/50' : ''}
      `}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* Label - 4 cols on mobile, 3 cols on desktop */}
      <div className="col-span-4 sm:col-span-3">
        <label
          htmlFor={`${item.categoryKey}-${item.itemKey}-qty`}
          className="text-sm text-slate-300 truncate block cursor-pointer"
          title={item.label}
        >
          {item.label}
        </label>
      </div>

      {/* Condition - 2 cols (hidden on mobile) */}
      <div className="col-span-2 hidden sm:block">
        <select
          value={item.condition}
          onChange={(e) =>
            handleConditionChange(e.target.value as RepairCondition)
          }
          className={`
            w-full text-xs px-2 py-1.5 rounded
            bg-slate-800 border border-slate-700
            text-slate-300
            ${repairsDesignTokens.focus.className}
          `}
          aria-label={`${item.label} condition`}
          style={{ minHeight: repairsDesignTokens.touchTargets.min }}
        >
          {CONDITIONS.map((cond) => (
            <option key={cond} value={cond}>
              {CONDITION_DISPLAY_NAMES[cond] ?? cond}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity - 2 cols */}
      <div className="col-span-2">
        <input
          id={`${item.categoryKey}-${item.itemKey}-qty`}
          type="number"
          min="0"
          step="any"
          value={item.quantity ?? ''}
          onChange={(e) => handleQuantityChange(e.target.value)}
          disabled={item.isManualOverride}
          placeholder="Qty"
          className={`
            w-full text-sm px-2 py-1.5 rounded tabular-nums text-right
            bg-slate-800 border border-slate-700
            text-white placeholder:text-slate-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${repairsDesignTokens.focus.className}
          `}
          aria-label={`${item.label} quantity`}
          style={{ minHeight: repairsDesignTokens.touchTargets.min }}
        />
      </div>

      {/* Unit - 1 col */}
      <div className="col-span-1 text-center">
        <span className="text-xs text-slate-500">
          {formatUnit(item.unit, item.quantity)}
        </span>
      </div>

      {/* Rate - 2 cols (hidden on mobile) */}
      <div className="col-span-2 hidden sm:block">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.unitCost ?? ''}
            onChange={(e) => handleUnitCostChange(e.target.value)}
            disabled={item.isManualOverride}
            placeholder="Rate"
            className={`
              w-full text-sm pl-5 pr-2 py-1.5 rounded tabular-nums text-right
              bg-slate-800 border border-slate-700
              text-white placeholder:text-slate-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${repairsDesignTokens.focus.className}
            `}
            aria-label={`${item.label} unit cost`}
            style={{ minHeight: repairsDesignTokens.touchTargets.min }}
          />
        </div>
      </div>

      {/* Total - 3 cols on mobile, 2 cols on desktop */}
      <div className="col-span-3 sm:col-span-2 flex items-center gap-1">
        {/* Manual Override Toggle */}
        <button
          type="button"
          onClick={toggleManualMode}
          className={`
            p-1 rounded transition-colors
            ${item.isManualOverride ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}
            ${repairsDesignTokens.focus.className}
          `}
          title={
            item.isManualOverride
              ? 'Using manual total (click to calculate)'
              : 'Click to enter manual total'
          }
          aria-label={
            item.isManualOverride
              ? 'Switch to calculated total'
              : 'Switch to manual total'
          }
          style={{
            minHeight: repairsDesignTokens.touchTargets.min,
            minWidth: repairsDesignTokens.touchTargets.min,
          }}
        >
          {item.isManualOverride ? (
            <CircleDot className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Circle className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Total Input/Display */}
        {item.isManualOverride ? (
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
              $
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={item.totalCost ?? ''}
              onChange={(e) => handleManualTotalChange(e.target.value)}
              placeholder="Total"
              className={`
                w-full text-sm pl-5 pr-2 py-1.5 rounded tabular-nums text-right
                bg-amber-900/20 border border-amber-600/50
                text-amber-300 placeholder:text-amber-700
                ${repairsDesignTokens.focus.className}
              `}
              aria-label={`${item.label} manual total`}
              style={{ minHeight: repairsDesignTokens.touchTargets.min }}
            />
          </div>
        ) : (
          <span
            className={`
              flex-1 text-sm tabular-nums text-right font-medium
              ${computedTotal > 0 ? 'text-emerald-400' : 'text-slate-500'}
            `}
          >
            {formatCurrency(computedTotal)}
          </span>
        )}
      </div>
    </div>
  );
});

export default EnhancedLineItemRow;
