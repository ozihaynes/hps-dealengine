/**
 * ForeclosureFields - Form fields for Foreclosure Details
 * @module components/underwrite/sections/ForeclosureFields
 * @slice 13 of 22
 *
 * Florida Statutes Referenced:
 * - FL 702.10: Foreclosure timeline procedures
 * - FL 45.031: Judicial sale requirements
 * - FL 45.0315: Right of redemption
 *
 * Accessibility (WCAG 2.1 AA):
 * - All inputs have `<label>` with `htmlFor`
 * - Error messages linked via `aria-describedby`
 * - Invalid inputs marked with `aria-invalid="true"`
 * - Error messages use `role="alert"` for screen reader announcement
 * - Touch targets >= 44px (h-11 class)
 *
 * Principles Applied:
 * - Form UX: Progressive disclosure, inline validation
 * - FL Law: Date sequence matches foreclosure progression
 * - Design Tokens: All styling from tokens (no hardcoded colors)
 */

'use client';

import * as React from 'react';
import { cn, card, focus, typography, colors } from '../utils';
import type {
  ForeclosureFormData,
  ForeclosureFormState,
  ForeclosureStatus,
} from './useForeclosureForm';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Foreclosure status options with FL statute references.
 * Order matches legal progression.
 */
const FORECLOSURE_STATUS_OPTIONS: Array<{
  value: ForeclosureStatus;
  label: string;
  description?: string;
}> = [
  { value: 'none', label: 'No Foreclosure' },
  {
    value: 'pre_foreclosure',
    label: 'Pre-Foreclosure',
    description: 'Notice of default sent',
  },
  {
    value: 'lis_pendens_filed',
    label: 'Lis Pendens Filed',
    description: 'FL 702.10 - Lawsuit commenced',
  },
  {
    value: 'judgment_entered',
    label: 'Judgment Entered',
    description: 'FL 45.031 - Court judgment',
  },
  {
    value: 'sale_scheduled',
    label: 'Sale Scheduled',
    description: 'FL 45.031 - Auction pending',
  },
  {
    value: 'post_sale_redemption',
    label: 'Post-Sale Redemption',
    description: 'FL 45.0315 - Redemption period',
  },
  {
    value: 'reo_bank_owned',
    label: 'REO (Bank Owned)',
    description: 'Foreclosure complete',
  },
];

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

const labelHintStyles = cn(typography.caption, 'ml-1');

const errorStyles = cn('text-sm mt-1', colors.text.error);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForeclosureFieldsProps {
  /** Current form data */
  data: ForeclosureFormData;
  /** Validation errors */
  errors: ForeclosureFormState['errors'];
  /** Which fields have been touched */
  touched: ForeclosureFormState['touched'];
  /** Which fields are visible (based on status) */
  visibleFields: (keyof ForeclosureFormData)[];
  /** Handler for field value changes */
  onFieldChange: <K extends keyof ForeclosureFormData>(
    field: K,
    value: ForeclosureFormData[K]
  ) => void;
  /** Handler for field blur (touch) */
  onFieldBlur: (field: keyof ForeclosureFormData) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ForeclosureFields({
  data,
  errors,
  touched,
  visibleFields,
  onFieldChange,
  onFieldBlur,
}: ForeclosureFieldsProps): React.JSX.Element {
  // Helper to check if field is visible
  const isVisible = (field: keyof ForeclosureFormData): boolean =>
    visibleFields.includes(field);

  // Helper to show error only if field is touched
  const showError = (field: keyof ForeclosureFormData): boolean =>
    Boolean(errors[field] && touched[field]);

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────────────────
          ROW 1: Foreclosure Status (Always Visible)
      ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="foreclosure_status" className={labelStyles}>
          Foreclosure Status
        </label>
        <select
          id="foreclosure_status"
          value={data.foreclosure_status ?? ''}
          onChange={(e) =>
            onFieldChange(
              'foreclosure_status',
              (e.target.value as ForeclosureStatus) || null
            )
          }
          onBlur={() => onFieldBlur('foreclosure_status')}
          className={selectStyles}
        >
          <option value="">Select status...</option>
          {FORECLOSURE_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.description ? ` — ${opt.description}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 2: Days Delinquent + First Missed Payment
          (Visible: pre_foreclosure and beyond)
      ─────────────────────────────────────────────────────────────────────── */}
      {(isVisible('days_delinquent') ||
        isVisible('first_missed_payment_date')) && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Days Delinquent */}
          {isVisible('days_delinquent') && (
            <div>
              <label htmlFor="days_delinquent" className={labelStyles}>
                Days Delinquent
              </label>
              <input
                id="days_delinquent"
                type="number"
                inputMode="numeric"
                min="0"
                max="3650"
                value={data.days_delinquent ?? ''}
                onChange={(e) =>
                  onFieldChange(
                    'days_delinquent',
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                onBlur={() => onFieldBlur('days_delinquent')}
                placeholder="Enter days"
                aria-describedby={
                  showError('days_delinquent')
                    ? 'days_delinquent-error'
                    : undefined
                }
                aria-invalid={showError('days_delinquent') ? true : undefined}
                className={cn(
                  inputStyles,
                  showError('days_delinquent') && focus.error
                )}
              />
              {showError('days_delinquent') && (
                <p
                  id="days_delinquent-error"
                  className={errorStyles}
                  role="alert"
                >
                  {errors.days_delinquent}
                </p>
              )}
            </div>
          )}

          {/* First Missed Payment Date */}
          {isVisible('first_missed_payment_date') && (
            <div>
              <label
                htmlFor="first_missed_payment_date"
                className={labelStyles}
              >
                First Missed Payment Date
              </label>
              <input
                id="first_missed_payment_date"
                type="date"
                value={data.first_missed_payment_date ?? ''}
                onChange={(e) =>
                  onFieldChange(
                    'first_missed_payment_date',
                    e.target.value || null
                  )
                }
                onBlur={() => onFieldBlur('first_missed_payment_date')}
                aria-describedby={
                  showError('first_missed_payment_date')
                    ? 'first_missed_payment_date-error'
                    : undefined
                }
                aria-invalid={
                  showError('first_missed_payment_date') ? true : undefined
                }
                className={cn(
                  inputStyles,
                  showError('first_missed_payment_date') && focus.error
                )}
              />
              {showError('first_missed_payment_date') && (
                <p
                  id="first_missed_payment_date-error"
                  className={errorStyles}
                  role="alert"
                >
                  {errors.first_missed_payment_date}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 3: Lis Pendens Date
          (Visible: lis_pendens_filed and beyond)
      ─────────────────────────────────────────────────────────────────────── */}
      {isVisible('lis_pendens_date') && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="lis_pendens_date" className={labelStyles}>
              Lis Pendens Filed Date
              <span className={labelHintStyles}>(FL 702.10)</span>
            </label>
            <input
              id="lis_pendens_date"
              type="date"
              value={data.lis_pendens_date ?? ''}
              onChange={(e) =>
                onFieldChange('lis_pendens_date', e.target.value || null)
              }
              onBlur={() => onFieldBlur('lis_pendens_date')}
              aria-describedby={
                showError('lis_pendens_date')
                  ? 'lis_pendens_date-error'
                  : undefined
              }
              aria-invalid={showError('lis_pendens_date') ? true : undefined}
              className={cn(
                inputStyles,
                showError('lis_pendens_date') && focus.error
              )}
            />
            {showError('lis_pendens_date') && (
              <p
                id="lis_pendens_date-error"
                className={errorStyles}
                role="alert"
              >
                {errors.lis_pendens_date}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 4: Judgment Date
          (Visible: judgment_entered and beyond)
      ─────────────────────────────────────────────────────────────────────── */}
      {isVisible('judgment_date') && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="judgment_date" className={labelStyles}>
              Judgment Date
              <span className={labelHintStyles}>(FL 45.031)</span>
            </label>
            <input
              id="judgment_date"
              type="date"
              value={data.judgment_date ?? ''}
              onChange={(e) =>
                onFieldChange('judgment_date', e.target.value || null)
              }
              onBlur={() => onFieldBlur('judgment_date')}
              aria-describedby={
                showError('judgment_date') ? 'judgment_date-error' : undefined
              }
              aria-invalid={showError('judgment_date') ? true : undefined}
              className={cn(
                inputStyles,
                showError('judgment_date') && focus.error
              )}
            />
            {showError('judgment_date') && (
              <p id="judgment_date-error" className={errorStyles} role="alert">
                {errors.judgment_date}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 5: Auction Date
          (Visible: sale_scheduled and beyond)
      ─────────────────────────────────────────────────────────────────────── */}
      {isVisible('auction_date') && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="auction_date" className={labelStyles}>
              Scheduled Auction Date
              <span className={labelHintStyles}>(FL 45.031)</span>
            </label>
            <input
              id="auction_date"
              type="date"
              value={data.auction_date ?? ''}
              onChange={(e) =>
                onFieldChange('auction_date', e.target.value || null)
              }
              onBlur={() => onFieldBlur('auction_date')}
              aria-describedby={
                showError('auction_date') ? 'auction_date-error' : undefined
              }
              aria-invalid={showError('auction_date') ? true : undefined}
              className={cn(
                inputStyles,
                showError('auction_date') && focus.error
              )}
            />
            {showError('auction_date') && (
              <p id="auction_date-error" className={errorStyles} role="alert">
                {errors.auction_date}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ForeclosureFields.displayName = 'ForeclosureFields';
