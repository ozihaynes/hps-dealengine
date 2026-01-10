/**
 * LienRiskFields - Form fields for Lien Risk
 * @module components/underwrite/sections/LienRiskFields
 * @slice 14 of 22
 *
 * Florida Statutes Referenced:
 * - FL 720.3085: Joint liability for HOA/CDD assessments
 *
 * Accessibility (WCAG 2.1 AA):
 * - All inputs have `<label>` with `htmlFor`
 * - Error messages linked via `aria-describedby`
 * - Invalid inputs marked with `aria-invalid="true"`
 * - Error messages use `role="alert"` for screen reader announcement
 * - Touch targets >= 44px (h-11 class)
 * - Fieldset/legend for grouped fields
 *
 * Principles Applied:
 * - Form UX: Currency formatting, grouped fields
 * - FL Law: Joint liability warning
 * - Design Tokens: All styling from tokens
 */

'use client';

import * as React from 'react';
import { cn, card, focus, typography, colors } from '../utils';
import type { LienRiskFormData, LienRiskFormState } from './useLienRiskForm';
import { LIEN_STATUS_OPTIONS } from './useLienRiskForm';

// ═══════════════════════════════════════════════════════════════════════════════
// STYLING CONSTANTS (from design tokens)
// ═══════════════════════════════════════════════════════════════════════════════

const inputStyles = cn(card.input, focus.input, 'w-full px-3');
const selectStyles = cn(
  card.select,
  focus.input,
  'w-full px-3 appearance-none cursor-pointer'
);
const labelStyles = cn(typography.label, colors.text.secondary, 'block mb-1.5');
const errorStyles = cn('text-sm mt-1', colors.text.error);
const legendStyles = cn(typography.h5, colors.text.primary, 'mb-3');
const hintStyles = cn(typography.caption, 'ml-2');

const checkboxStyles = cn(
  'h-5 w-5',
  'rounded',
  card.base, // Use token for background
  'border',
  colors.border.default, // Use token for border
  'text-emerald-500', // Accent color intentional
  'cursor-pointer',
  focus.ring
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LienRiskFieldsProps {
  /** Current form data */
  data: LienRiskFormData;
  /** Validation errors */
  errors: LienRiskFormState['errors'];
  /** Which fields have been touched */
  touched: LienRiskFormState['touched'];
  /** Handler for field value changes */
  onFieldChange: <K extends keyof LienRiskFormData>(
    field: K,
    value: LienRiskFormData[K]
  ) => void;
  /** Handler for field blur (touch) */
  onFieldBlur: (field: keyof LienRiskFormData) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENCY INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CurrencyInputProps {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur: () => void;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  label: string;
}

function CurrencyInput({
  id,
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder = '0',
  label,
}: CurrencyInputProps): React.JSX.Element {
  const showError = Boolean(error && touched);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={labelStyles}>
        {label}
      </label>
      <div className="relative">
        <span
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2',
            colors.text.muted,
            'pointer-events-none'
          )}
          aria-hidden="true"
        >
          $
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="100"
          value={value ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          onBlur={onBlur}
          placeholder={placeholder}
          aria-describedby={showError ? errorId : undefined}
          aria-invalid={showError ? true : undefined}
          className={cn(
            inputStyles,
            'pl-8',
            showError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
      </div>
      {showError && (
        <p id={errorId} className={errorStyles} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LienRiskFields({
  data,
  errors,
  touched,
  onFieldChange,
  onFieldBlur,
}: LienRiskFieldsProps): React.JSX.Element {
  return (
    <div className="space-y-8">
      {/* ───────────────────────────────────────────────────────────────────────
          HOA SECTION
          FL 720.3085 - Buyer joint liability for unpaid assessments
      ─────────────────────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className={legendStyles}>
          HOA / Homeowners Association
          <span className={cn(hintStyles, colors.text.warning)}>
            (FL 720.3085 - Joint Liability)
          </span>
        </legend>

        <div className="grid gap-6 md:grid-cols-3">
          {/* HOA Status */}
          <div>
            <label htmlFor="hoa_status" className={labelStyles}>
              Status
            </label>
            <select
              id="hoa_status"
              value={data.hoa_status ?? ''}
              onChange={(e) =>
                onFieldChange(
                  'hoa_status',
                  (e.target.value as LienRiskFormData['hoa_status']) || null
                )
              }
              onBlur={() => onFieldBlur('hoa_status')}
              className={selectStyles}
            >
              <option value="">Select status...</option>
              {LIEN_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* HOA Arrears */}
          <CurrencyInput
            id="hoa_arrears_amount"
            label="Arrears Amount"
            value={data.hoa_arrears_amount}
            onChange={(v) => onFieldChange('hoa_arrears_amount', v)}
            onBlur={() => onFieldBlur('hoa_arrears_amount')}
            error={errors.hoa_arrears_amount}
            touched={touched.hoa_arrears_amount}
          />

          {/* HOA Monthly */}
          <CurrencyInput
            id="hoa_monthly_assessment"
            label="Monthly Assessment"
            value={data.hoa_monthly_assessment}
            onChange={(v) => onFieldChange('hoa_monthly_assessment', v)}
            onBlur={() => onFieldBlur('hoa_monthly_assessment')}
            error={errors.hoa_monthly_assessment}
            touched={touched.hoa_monthly_assessment}
          />
        </div>
      </fieldset>

      {/* ───────────────────────────────────────────────────────────────────────
          CDD SECTION
      ─────────────────────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className={legendStyles}>
          CDD / Community Development District
          <span className={cn(hintStyles, colors.text.warning)}>
            (FL 720.3085 - Joint Liability)
          </span>
        </legend>

        <div className="grid gap-6 md:grid-cols-2">
          {/* CDD Status */}
          <div>
            <label htmlFor="cdd_status" className={labelStyles}>
              Status
            </label>
            <select
              id="cdd_status"
              value={data.cdd_status ?? ''}
              onChange={(e) =>
                onFieldChange(
                  'cdd_status',
                  (e.target.value as LienRiskFormData['cdd_status']) || null
                )
              }
              onBlur={() => onFieldBlur('cdd_status')}
              className={selectStyles}
            >
              <option value="">Select status...</option>
              {LIEN_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* CDD Arrears */}
          <CurrencyInput
            id="cdd_arrears_amount"
            label="Arrears Amount"
            value={data.cdd_arrears_amount}
            onChange={(v) => onFieldChange('cdd_arrears_amount', v)}
            onBlur={() => onFieldBlur('cdd_arrears_amount')}
            error={errors.cdd_arrears_amount}
            touched={touched.cdd_arrears_amount}
          />
        </div>
      </fieldset>

      {/* ───────────────────────────────────────────────────────────────────────
          PROPERTY TAX SECTION
      ─────────────────────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className={legendStyles}>Property Taxes</legend>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Tax Status */}
          <div>
            <label htmlFor="property_tax_status" className={labelStyles}>
              Status
            </label>
            <select
              id="property_tax_status"
              value={data.property_tax_status ?? ''}
              onChange={(e) =>
                onFieldChange(
                  'property_tax_status',
                  (e.target.value as LienRiskFormData['property_tax_status']) ||
                    null
                )
              }
              onBlur={() => onFieldBlur('property_tax_status')}
              className={selectStyles}
            >
              <option value="">Select status...</option>
              {LIEN_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tax Arrears */}
          <CurrencyInput
            id="property_tax_arrears"
            label="Arrears Amount"
            value={data.property_tax_arrears}
            onChange={(v) => onFieldChange('property_tax_arrears', v)}
            onBlur={() => onFieldBlur('property_tax_arrears')}
            error={errors.property_tax_arrears}
            touched={touched.property_tax_arrears}
          />
        </div>
      </fieldset>

      {/* ───────────────────────────────────────────────────────────────────────
          MUNICIPAL LIENS SECTION
      ─────────────────────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className={legendStyles}>Municipal Liens</legend>

        <div className="space-y-4">
          {/* Municipal Liens Present Checkbox */}
          <div className="flex items-center gap-3">
            <input
              id="municipal_liens_present"
              type="checkbox"
              checked={data.municipal_liens_present}
              onChange={(e) =>
                onFieldChange('municipal_liens_present', e.target.checked)
              }
              className={checkboxStyles}
            />
            <label
              htmlFor="municipal_liens_present"
              className={cn(
                typography.body,
                colors.text.secondary,
                'cursor-pointer'
              )}
            >
              Municipal liens present (code violations, utility liens, etc.)
            </label>
          </div>

          {/* Municipal Lien Amount - Conditional */}
          {data.municipal_liens_present && (
            <div className="md:w-1/2">
              <CurrencyInput
                id="municipal_lien_amount"
                label="Total Municipal Lien Amount"
                value={data.municipal_lien_amount}
                onChange={(v) => onFieldChange('municipal_lien_amount', v)}
                onBlur={() => onFieldBlur('municipal_lien_amount')}
                error={errors.municipal_lien_amount}
                touched={touched.municipal_lien_amount}
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* ───────────────────────────────────────────────────────────────────────
          TITLE SEARCH SECTION
      ─────────────────────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className={legendStyles}>Title Search</legend>

        <div className="space-y-4">
          {/* Title Search Completed Checkbox */}
          <div className="flex items-center gap-3">
            <input
              id="title_search_completed"
              type="checkbox"
              checked={data.title_search_completed}
              onChange={(e) =>
                onFieldChange('title_search_completed', e.target.checked)
              }
              className={checkboxStyles}
            />
            <label
              htmlFor="title_search_completed"
              className={cn(
                typography.body,
                colors.text.secondary,
                'cursor-pointer'
              )}
            >
              Title search completed
            </label>
          </div>

          {/* Title Issues Notes */}
          <div>
            <label htmlFor="title_issues_notes" className={labelStyles}>
              Title Issues / Notes
            </label>
            <textarea
              id="title_issues_notes"
              value={data.title_issues_notes}
              onChange={(e) =>
                onFieldChange('title_issues_notes', e.target.value)
              }
              onBlur={() => onFieldBlur('title_issues_notes')}
              placeholder="Any title issues, encumbrances, or notes..."
              rows={3}
              className={cn(inputStyles, 'py-2 resize-none h-auto min-h-[88px]')}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}

LienRiskFields.displayName = 'LienRiskFields';
