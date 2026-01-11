/**
 * SystemsStatusFields - Form fields for property systems
 * @module components/underwrite/sections/systems-status/SystemsStatusFields
 * @slice 18 of 22
 *
 * Form fields for property systems data collection:
 * - Overall condition dropdown
 * - Deferred maintenance dropdown
 * - Roof year installed (number input)
 * - HVAC year installed (number input)
 * - Water heater year installed (number input)
 *
 * Accessibility (WCAG 2.1 AA):
 * - Proper label associations
 * - aria-describedby for hints
 * - Focus indicators
 * - Touch targets ≥ 44px
 *
 * Principles Applied:
 * - Atomic Design: Field-level component
 * - Accessibility: POUR principles
 * - Design Tokens: Consistent styling
 */

'use client';

import * as React from 'react';
import { cn, colors, focus } from '../../utils';
import {
  PROPERTY_CONDITION_OPTIONS,
  DEFERRED_MAINTENANCE_OPTIONS,
} from '@hps-internal/contracts';
import type {
  PropertyCondition,
  DeferredMaintenance,
} from '@hps-internal/contracts';
import type { SystemsStatusFormData } from './useSystemsStatusForm';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemsStatusFieldsProps {
  /** Current form data */
  data: SystemsStatusFormData;
  /** Field change handler */
  onFieldChange: <K extends keyof SystemsStatusFormData>(
    field: K,
    value: SystemsStatusFormData[K]
  ) => void;
  /** Optional className */
  className?: string;
  /** Whether fields are disabled */
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Use a stable year to avoid hydration mismatch
const CURRENT_YEAR = 2026;
const MIN_YEAR = 1900;
const MAX_YEAR = CURRENT_YEAR + 1;

// System expected life spans (for hint text)
const SYSTEM_LIFE_HINTS = {
  roof: '25 yr life',
  hvac: '15 yr life',
  water_heater: '12 yr life',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const inputStyles = cn(
  'w-full h-11 px-3 rounded-lg',
  'bg-slate-800/50 border border-slate-700',
  'text-sm text-white placeholder:text-slate-500',
  'transition-colors duration-150',
  'hover:border-slate-600',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  focus.ring
);

const labelStyles = cn('block text-sm font-medium mb-2', colors.text.secondary);

const hintStyles = cn('text-xs ml-1', colors.text.muted);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SystemsStatusFields({
  data,
  onFieldChange,
  className,
  disabled = false,
}: SystemsStatusFieldsProps): React.JSX.Element {
  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleConditionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFieldChange(
        'overall_condition',
        value ? (value as PropertyCondition) : null
      );
    },
    [onFieldChange]
  );

  const handleMaintenanceChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFieldChange(
        'deferred_maintenance_level',
        value ? (value as DeferredMaintenance) : null
      );
    },
    [onFieldChange]
  );

  const handleYearChange = React.useCallback(
    (field: 'roof_year_installed' | 'hvac_year_installed' | 'water_heater_year_installed') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Allow empty value (clearing the field)
        if (value === '') {
          onFieldChange(field, null);
          return;
        }

        // Allow typing any digits - don't block during input
        // The HTML min/max attributes provide browser validation hints
        const numValue = parseInt(value, 10);
        if (!Number.isNaN(numValue)) {
          onFieldChange(field, numValue);
        }
      },
    [onFieldChange]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className={cn('grid gap-6 md:grid-cols-2', className)}>
      {/* ───────────────────────────────────────────────────────────────────────
          OVERALL CONDITION
      ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="systems-overall-condition" className={labelStyles}>
          Overall Condition
        </label>
        <select
          id="systems-overall-condition"
          value={data.overall_condition ?? ''}
          onChange={handleConditionChange}
          disabled={disabled}
          className={inputStyles}
          aria-describedby="systems-overall-condition-hint"
        >
          <option value="">Select condition...</option>
          {PROPERTY_CONDITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p id="systems-overall-condition-hint" className="sr-only">
          Select the overall condition of the property
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          DEFERRED MAINTENANCE
      ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="systems-deferred-maintenance" className={labelStyles}>
          Deferred Maintenance
        </label>
        <select
          id="systems-deferred-maintenance"
          value={data.deferred_maintenance_level ?? ''}
          onChange={handleMaintenanceChange}
          disabled={disabled}
          className={inputStyles}
          aria-describedby="systems-deferred-maintenance-hint"
        >
          <option value="">Select level...</option>
          {DEFERRED_MAINTENANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p id="systems-deferred-maintenance-hint" className="sr-only">
          Select the level of deferred maintenance
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ROOF YEAR
      ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="systems-roof-year" className={labelStyles}>
          Roof Year Installed
          <span className={hintStyles}>({SYSTEM_LIFE_HINTS.roof})</span>
        </label>
        <input
          id="systems-roof-year"
          type="number"
          inputMode="numeric"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={data.roof_year_installed ?? ''}
          onChange={handleYearChange('roof_year_installed')}
          disabled={disabled}
          placeholder="e.g. 2015"
          className={inputStyles}
          aria-describedby="systems-roof-year-hint"
        />
        <p id="systems-roof-year-hint" className="sr-only">
          Enter the year the roof was installed, expected life is 25 years
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          HVAC YEAR
      ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="systems-hvac-year" className={labelStyles}>
          HVAC Year Installed
          <span className={hintStyles}>({SYSTEM_LIFE_HINTS.hvac})</span>
        </label>
        <input
          id="systems-hvac-year"
          type="number"
          inputMode="numeric"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={data.hvac_year_installed ?? ''}
          onChange={handleYearChange('hvac_year_installed')}
          disabled={disabled}
          placeholder="e.g. 2018"
          className={inputStyles}
          aria-describedby="systems-hvac-year-hint"
        />
        <p id="systems-hvac-year-hint" className="sr-only">
          Enter the year the HVAC was installed, expected life is 15 years
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          WATER HEATER YEAR
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="md:col-span-2 md:max-w-[calc(50%-12px)]">
        <label htmlFor="systems-water-heater-year" className={labelStyles}>
          Water Heater Year Installed
          <span className={hintStyles}>({SYSTEM_LIFE_HINTS.water_heater})</span>
        </label>
        <input
          id="systems-water-heater-year"
          type="number"
          inputMode="numeric"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={data.water_heater_year_installed ?? ''}
          onChange={handleYearChange('water_heater_year_installed')}
          disabled={disabled}
          placeholder="e.g. 2020"
          className={inputStyles}
          aria-describedby="systems-water-heater-year-hint"
        />
        <p id="systems-water-heater-year-hint" className="sr-only">
          Enter the year the water heater was installed, expected life is 12 years
        </p>
      </div>
    </div>
  );
}

SystemsStatusFields.displayName = 'SystemsStatusFields';
