/**
 * SellerSituationFields - Form fields for Seller Situation
 * @module components/underwrite/sections/SellerSituationFields
 * @slice 12 of 22
 *
 * Accessibility (WCAG 2.1 AA):
 * - All inputs have `<label>` with `htmlFor`
 * - Error messages linked via `aria-describedby`
 * - Invalid inputs marked with `aria-invalid="true"`
 * - Error messages use `role="alert"` for screen reader announcement
 * - Touch targets >= 44px (h-11 class)
 *
 * Principles Applied:
 * - Form UX: Inline validation, clear error messages
 * - Design Tokens: All styling from tokens (no hardcoded colors)
 * - Touch Targets: >= 44px for mobile
 */

'use client';

import * as React from 'react';
import { cn, card, focus, typography, colors } from '../utils';
import {
  REASON_FOR_SELLING_OPTIONS,
  SELLER_TIMELINE_OPTIONS,
  DECISION_MAKER_OPTIONS,
} from '@hps-internal/contracts';
import type {
  SellerSituationFormData,
  SellerSituationFormState,
  ReasonForSelling,
  SellerTimeline,
  DecisionMakerStatus,
} from './useSellerSituationForm';

// ═══════════════════════════════════════════════════════════════════════════════
// STYLING CONSTANTS (from design tokens)
// ═══════════════════════════════════════════════════════════════════════════════

const inputStyles = cn(
  card.input,
  focus.input,
  'w-full px-3'
);

const selectStyles = cn(
  card.select,
  focus.input,
  'w-full px-3 appearance-none cursor-pointer'
);

const labelStyles = cn(typography.label, colors.text.secondary, 'block mb-1.5');

const errorStyles = cn('text-sm mt-1', colors.text.error);

const checkboxWrapperStyles = cn(
  'flex items-center gap-3',
  'h-11' // 44px touch target
);

const checkboxStyles = cn(
  'h-5 w-5',
  'rounded',
  colors.bg.input, // Use token for background
  'border',
  colors.border.default, // Use token for border
  'text-emerald-500', // Accent color intentional
  'cursor-pointer',
  focus.ring
);

const textareaStyles = cn(
  card.textarea,
  focus.input,
  'w-full px-3 py-2'
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SellerSituationFieldsProps {
  /** Current form data */
  data: SellerSituationFormData;
  /** Validation errors */
  errors: SellerSituationFormState['errors'];
  /** Which fields have been touched */
  touched: SellerSituationFormState['touched'];
  /** Handler for field value changes */
  onFieldChange: <K extends keyof SellerSituationFormData>(
    field: K,
    value: SellerSituationFormData[K]
  ) => void;
  /** Handler for field blur (touch) */
  onFieldBlur: (field: keyof SellerSituationFormData) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SellerSituationFields({
  data,
  errors,
  touched,
  onFieldChange,
  onFieldBlur,
}: SellerSituationFieldsProps): React.JSX.Element {
  // Helper to show error only if field is touched
  const showError = (field: keyof SellerSituationFormData): boolean =>
    Boolean(errors[field] && touched[field]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ───────────────────────────────────────────────────────────────────────
          ROW 1: Reason for Selling + Seller Timeline
      ─────────────────────────────────────────────────────────────────────── */}

      {/* Reason for Selling */}
      <div>
        <label htmlFor="reason_for_selling" className={labelStyles}>
          Reason for Selling
        </label>
        <select
          id="reason_for_selling"
          value={data.reason_for_selling ?? ''}
          onChange={(e) =>
            onFieldChange(
              'reason_for_selling',
              (e.target.value as ReasonForSelling) || null
            )
          }
          onBlur={() => onFieldBlur('reason_for_selling')}
          className={selectStyles}
        >
          <option value="">Select reason...</option>
          {REASON_FOR_SELLING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Seller Timeline */}
      <div>
        <label htmlFor="seller_timeline" className={labelStyles}>
          Closing Timeline
        </label>
        <select
          id="seller_timeline"
          value={data.seller_timeline ?? ''}
          onChange={(e) =>
            onFieldChange(
              'seller_timeline',
              (e.target.value as SellerTimeline) || null
            )
          }
          onBlur={() => onFieldBlur('seller_timeline')}
          className={selectStyles}
        >
          <option value="">Select timeline...</option>
          {SELLER_TIMELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 2: Lowest Price + Decision Maker
      ─────────────────────────────────────────────────────────────────────── */}

      {/* Lowest Acceptable Price */}
      <div>
        <label htmlFor="lowest_acceptable_price" className={labelStyles}>
          Lowest Acceptable Price
        </label>
        <div className="relative">
          <span
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
              colors.text.muted
            )}
          >
            $
          </span>
          <input
            id="lowest_acceptable_price"
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            value={data.lowest_acceptable_price ?? ''}
            onChange={(e) =>
              onFieldChange(
                'lowest_acceptable_price',
                e.target.value ? Number(e.target.value) : null
              )
            }
            onBlur={() => onFieldBlur('lowest_acceptable_price')}
            placeholder="Enter amount"
            aria-describedby={
              showError('lowest_acceptable_price')
                ? 'lowest_acceptable_price-error'
                : undefined
            }
            aria-invalid={showError('lowest_acceptable_price') ? true : undefined}
            className={cn(
              inputStyles,
              'pl-8',
              showError('lowest_acceptable_price') &&
                'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            )}
          />
        </div>
        {showError('lowest_acceptable_price') && (
          <p
            id="lowest_acceptable_price-error"
            className={errorStyles}
            role="alert"
          >
            {errors.lowest_acceptable_price}
          </p>
        )}
      </div>

      {/* Decision Maker Status */}
      <div>
        <label htmlFor="decision_maker_status" className={labelStyles}>
          Decision Maker
        </label>
        <select
          id="decision_maker_status"
          value={data.decision_maker_status ?? ''}
          onChange={(e) =>
            onFieldChange(
              'decision_maker_status',
              (e.target.value as DecisionMakerStatus) || null
            )
          }
          onBlur={() => onFieldBlur('decision_maker_status')}
          className={selectStyles}
        >
          <option value="">Select status...</option>
          {DECISION_MAKER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 3: Checkboxes
      ─────────────────────────────────────────────────────────────────────── */}

      {/* Mortgage Delinquent */}
      <div className={checkboxWrapperStyles}>
        <input
          id="mortgage_delinquent"
          type="checkbox"
          checked={data.mortgage_delinquent}
          onChange={(e) => onFieldChange('mortgage_delinquent', e.target.checked)}
          className={checkboxStyles}
        />
        <label
          htmlFor="mortgage_delinquent"
          className={cn(typography.label, colors.text.secondary, 'cursor-pointer')}
        >
          Mortgage Delinquent
        </label>
      </div>

      {/* Listed with Agent */}
      <div className={checkboxWrapperStyles}>
        <input
          id="listed_with_agent"
          type="checkbox"
          checked={data.listed_with_agent}
          onChange={(e) => onFieldChange('listed_with_agent', e.target.checked)}
          className={checkboxStyles}
        />
        <label
          htmlFor="listed_with_agent"
          className={cn(typography.label, colors.text.secondary, 'cursor-pointer')}
        >
          Listed with Agent
        </label>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ROW 4: Seller Notes (Full Width)
      ─────────────────────────────────────────────────────────────────────── */}

      <div className="md:col-span-2">
        <label htmlFor="seller_notes" className={labelStyles}>
          Seller Notes
        </label>
        <textarea
          id="seller_notes"
          value={data.seller_notes}
          onChange={(e) => onFieldChange('seller_notes', e.target.value)}
          onBlur={() => onFieldBlur('seller_notes')}
          placeholder="Additional notes about seller situation..."
          rows={3}
          className={textareaStyles}
        />
      </div>
    </div>
  );
}

SellerSituationFields.displayName = 'SellerSituationFields';
