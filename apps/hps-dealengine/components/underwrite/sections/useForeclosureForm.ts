/**
 * useForeclosureForm - Form state management for Foreclosure Details
 * @module components/underwrite/sections/useForeclosureForm
 * @slice 13 of 22
 *
 * Florida Statutes Referenced:
 * - FL 702.10: Foreclosure timeline procedures
 * - FL 45.031: Judicial sale requirements
 * - FL 45.0315: Right of redemption
 *
 * Principles Applied:
 * - Form UX: Conditional fields, progressive disclosure
 * - FL Law: Date sequence matches foreclosure progression
 * - State Management: Immutable updates, computed fields
 * - Performance: Memoization, debounced callbacks (150ms)
 * - Integration: Uses computeForeclosureTimeline from engine
 */

'use client';

import * as React from 'react';
import {
  computeForeclosureTimeline,
  type ForeclosureTimelineInput,
  type ForeclosureStatusExtended,
} from '@/lib/engine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Foreclosure status enum - matches database.
 * Progression: none → pre_foreclosure → lis_pendens_filed → judgment_entered → sale_scheduled → post_sale_redemption
 */
export type ForeclosureStatus =
  | 'none'
  | 'pre_foreclosure'
  | 'lis_pendens_filed'
  | 'judgment_entered'
  | 'sale_scheduled'
  | 'post_sale_redemption'
  | 'reo_bank_owned';

/**
 * Form data structure for Foreclosure Details.
 * Matches database schema columns.
 */
export interface ForeclosureFormData {
  foreclosure_status: ForeclosureStatus | null;
  days_delinquent: number | null;
  first_missed_payment_date: string | null;
  lis_pendens_date: string | null;
  judgment_date: string | null;
  auction_date: string | null;
}

/**
 * Timeline preview output (subset of ForeclosureTimelineOutput).
 */
export interface TimelinePreview {
  days_until_estimated_sale: number | null;
  auction_date_source: string;
  urgency_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  seller_motivation_boost: number;
  statute_reference: string | null;
}

/**
 * Form state including computed values.
 */
export interface ForeclosureFormState {
  data: ForeclosureFormData;
  errors: Partial<Record<keyof ForeclosureFormData, string>>;
  touched: Partial<Record<keyof ForeclosureFormData, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  completedFields: number;
  totalFields: number;
  visibleFields: (keyof ForeclosureFormData)[];
  timelinePreview: TimelinePreview | null;
}

/**
 * Hook return type.
 */
export interface UseForeclosureFormReturn {
  state: ForeclosureFormState;
  setField: <K extends keyof ForeclosureFormData>(
    field: K,
    value: ForeclosureFormData[K]
  ) => void;
  setTouched: (field: keyof ForeclosureFormData) => void;
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_DATA: ForeclosureFormData = {
  foreclosure_status: null,
  days_delinquent: null,
  first_missed_payment_date: null,
  lis_pendens_date: null,
  judgment_date: null,
  auction_date: null,
};

/** Debounce delay for timeline calculation (ms) */
const DEBOUNCE_DELAY = 150;

/** Status progression order for field visibility */
const STATUS_ORDER: ForeclosureStatus[] = [
  'none',
  'pre_foreclosure',
  'lis_pendens_filed',
  'judgment_entered',
  'sale_scheduled',
  'post_sale_redemption',
  'reo_bank_owned',
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine which fields should be visible based on foreclosure status.
 * Progressive disclosure: more severe status shows more fields.
 */
export function getVisibleFields(
  status: ForeclosureStatus | null
): (keyof ForeclosureFormData)[] {
  const base: (keyof ForeclosureFormData)[] = ['foreclosure_status'];

  if (!status || status === 'none') {
    return base;
  }

  const statusIndex = STATUS_ORDER.indexOf(status);

  // Pre-foreclosure and beyond: add delinquency info
  if (statusIndex >= STATUS_ORDER.indexOf('pre_foreclosure')) {
    base.push('days_delinquent', 'first_missed_payment_date');
  }

  // Lis pendens and beyond: add lis pendens date
  if (statusIndex >= STATUS_ORDER.indexOf('lis_pendens_filed')) {
    base.push('lis_pendens_date');
  }

  // Judgment and beyond: add judgment date
  if (statusIndex >= STATUS_ORDER.indexOf('judgment_entered')) {
    base.push('judgment_date');
  }

  // Sale scheduled and beyond: add auction date
  if (statusIndex >= STATUS_ORDER.indexOf('sale_scheduled')) {
    base.push('auction_date');
  }

  return base;
}

/**
 * Validate date sequence: dates must progress in order.
 * first_missed < lis_pendens < judgment < auction
 */
function validateDateSequence(
  formData: ForeclosureFormData
): ForeclosureFormState['errors'] {
  const errors: ForeclosureFormState['errors'] = {};

  const dateFields: Array<{
    field: keyof ForeclosureFormData;
    value: string | null;
    label: string;
  }> = [
    {
      field: 'first_missed_payment_date',
      value: formData.first_missed_payment_date,
      label: 'first missed payment',
    },
    {
      field: 'lis_pendens_date',
      value: formData.lis_pendens_date,
      label: 'lis pendens',
    },
    {
      field: 'judgment_date',
      value: formData.judgment_date,
      label: 'judgment',
    },
    {
      field: 'auction_date',
      value: formData.auction_date,
      label: 'auction',
    },
  ];

  // Filter to only dates with values
  const datesWithValues = dateFields.filter((d) => d.value);

  // Check each pair for proper sequence
  for (let i = 1; i < datesWithValues.length; i++) {
    const prev = datesWithValues[i - 1];
    const curr = datesWithValues[i];

    const prevDate = new Date(prev.value as string);
    const currDate = new Date(curr.value as string);

    if (currDate < prevDate) {
      errors[curr.field] = `Must be after ${prev.label}`;
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to manage Foreclosure Details form state.
 *
 * @param initialData - Optional initial form data
 * @returns Form state and actions
 *
 * @example
 * ```tsx
 * const { state, setField, setTouched } = useForeclosureForm(existingData);
 * ```
 */
export function useForeclosureForm(
  initialData?: Partial<ForeclosureFormData>
): UseForeclosureFormReturn {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const [data, setData] = React.useState<ForeclosureFormData>(() => ({
    ...INITIAL_DATA,
    ...initialData,
  }));

  const [errors, setErrors] = React.useState<ForeclosureFormState['errors']>({});
  const [touched, setTouchedState] = React.useState<
    ForeclosureFormState['touched']
  >({});
  const [timelinePreview, setTimelinePreview] =
    React.useState<TimelinePreview | null>(null);

  // Memoize initial data for dirty check
  const initialDataRef = React.useRef({ ...INITIAL_DATA, ...initialData });

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────

  const visibleFields = React.useMemo(
    () => getVisibleFields(data.foreclosure_status),
    [data.foreclosure_status]
  );

  const totalFields = visibleFields.length;

  const completedFields = React.useMemo(() => {
    let count = 0;
    visibleFields.forEach((field) => {
      const value = data[field];
      if (value !== null && value !== undefined && value !== '') {
        count++;
      }
    });
    return count;
  }, [data, visibleFields]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialDataRef.current);
  }, [data]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  const validate = React.useCallback(
    (formData: ForeclosureFormData): ForeclosureFormState['errors'] => {
      const newErrors: ForeclosureFormState['errors'] = {};

      // Validate days_delinquent
      if (formData.days_delinquent !== null) {
        if (
          typeof formData.days_delinquent !== 'number' ||
          Number.isNaN(formData.days_delinquent)
        ) {
          newErrors.days_delinquent = 'Please enter a valid number';
        } else if (formData.days_delinquent < 0) {
          newErrors.days_delinquent = 'Days cannot be negative';
        } else if (formData.days_delinquent > 3650) {
          // 10 years max
          newErrors.days_delinquent = 'Days exceeds maximum (3650)';
        }
      }

      // Validate date sequence
      const dateErrors = validateDateSequence(formData);
      Object.assign(newErrors, dateErrors);

      return newErrors;
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TIMELINE CALCULATION (DEBOUNCED)
  // ─────────────────────────────────────────────────────────────────────────────

  const calculateTimelineInternal = React.useCallback(
    (formData: ForeclosureFormData) => {
      // Don't calculate if no foreclosure status or status is 'none'
      if (
        !formData.foreclosure_status ||
        formData.foreclosure_status === 'none'
      ) {
        setTimelinePreview(null);
        return;
      }

      try {
        const input: ForeclosureTimelineInput = {
          foreclosure_status:
            formData.foreclosure_status as ForeclosureStatusExtended,
          days_delinquent: formData.days_delinquent,
          first_missed_payment_date: formData.first_missed_payment_date,
          lis_pendens_date: formData.lis_pendens_date,
          judgment_date: formData.judgment_date,
          auction_date: formData.auction_date,
        };

        const result = computeForeclosureTimeline(input);

        setTimelinePreview({
          days_until_estimated_sale: result.days_until_estimated_sale,
          auction_date_source: result.auction_date_source,
          urgency_level: result.urgency_level,
          seller_motivation_boost: result.seller_motivation_boost,
          statute_reference: result.statute_reference,
        });
      } catch (error) {
        // Engine error - don't crash the form
        if (process.env.NODE_ENV !== 'production') {
          console.error('Timeline calculation failed:', error);
        }
        setTimelinePreview(null);
      }
    },
    []
  );

  // Debounce timer ref
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const calculateTimeline = React.useCallback(
    (formData: ForeclosureFormData) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Set new debounced calculation
      debounceTimerRef.current = setTimeout(() => {
        calculateTimelineInternal(formData);
      }, DEBOUNCE_DELAY);
    },
    [calculateTimelineInternal]
  );

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const setField = React.useCallback(
    <K extends keyof ForeclosureFormData>(
      field: K,
      value: ForeclosureFormData[K]
    ) => {
      setData((prev) => {
        let next = { ...prev, [field]: value };

        // When status changes, clear fields that become invisible
        if (field === 'foreclosure_status') {
          const newVisibleFields = getVisibleFields(
            value as ForeclosureStatus | null
          );
          const allFields: (keyof ForeclosureFormData)[] = [
            'foreclosure_status',
            'days_delinquent',
            'first_missed_payment_date',
            'lis_pendens_date',
            'judgment_date',
            'auction_date',
          ];

          allFields.forEach((f) => {
            if (!newVisibleFields.includes(f) && f !== 'foreclosure_status') {
              next = { ...next, [f]: null };
            }
          });

          // Also clear touched state for hidden fields
          setTouchedState((prevTouched) => {
            const newTouched = { ...prevTouched };
            allFields.forEach((f) => {
              if (!newVisibleFields.includes(f)) {
                delete newTouched[f];
              }
            });
            return newTouched;
          });
        }

        // Validate and update errors
        const newErrors = validate(next);
        setErrors(newErrors);

        // Trigger debounced timeline calculation
        calculateTimeline(next);

        return next;
      });
    },
    [validate, calculateTimeline]
  );

  const setTouched = React.useCallback(
    (field: keyof ForeclosureFormData) => {
      setTouchedState((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const reset = React.useCallback(() => {
    setData({ ...INITIAL_DATA, ...initialData });
    setErrors({});
    setTouchedState({});
    setTimelinePreview(null);
  }, [initialData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Calculate timeline on mount
  React.useEffect(() => {
    calculateTimelineInternal(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────────

  const isValid = Object.keys(errors).length === 0;

  return {
    state: {
      data,
      errors,
      touched,
      isDirty,
      isValid,
      completedFields,
      totalFields,
      visibleFields,
      timelinePreview,
    },
    setField,
    setTouched,
    reset,
  };
}
