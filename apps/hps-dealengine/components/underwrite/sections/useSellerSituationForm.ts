/**
 * useSellerSituationForm - Form state management for Seller Situation
 * @module components/underwrite/sections/useSellerSituationForm
 * @slice 12 of 22
 *
 * Principles Applied:
 * - Form UX: Controlled inputs, debounced validation
 * - State Management: Immutable updates, computed fields
 * - Performance: Memoization, debounced callbacks (150ms)
 * - Integration: Uses computeMotivationScore from engine
 */

'use client';

import * as React from 'react';
import { computeMotivationScore } from '@/lib/engine';
import type {
  ReasonForSelling,
  SellerTimeline,
  DecisionMakerStatus,
  MotivationLevel,
  ConfidenceLevel,
} from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Form data structure for Seller Situation.
 * Matches database schema columns.
 */
export interface SellerSituationFormData {
  reason_for_selling: ReasonForSelling | null;
  seller_timeline: SellerTimeline | null;
  lowest_acceptable_price: number | null;
  decision_maker_status: DecisionMakerStatus | null;
  mortgage_delinquent: boolean;
  listed_with_agent: boolean;
  seller_notes: string;
}

/**
 * Motivation score output (minimal for preview).
 */
export interface MotivationPreview {
  motivation_score: number;
  motivation_level: MotivationLevel;
  confidence: ConfidenceLevel;
  red_flags: string[];
}

/**
 * Form state including computed values.
 */
export interface SellerSituationFormState {
  data: SellerSituationFormData;
  errors: Partial<Record<keyof SellerSituationFormData, string>>;
  touched: Partial<Record<keyof SellerSituationFormData, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  completedFields: number;
  totalFields: number;
  motivationPreview: MotivationPreview | null;
}

/**
 * Hook return type.
 */
export interface UseSellerSituationFormReturn {
  state: SellerSituationFormState;
  setField: <K extends keyof SellerSituationFormData>(
    field: K,
    value: SellerSituationFormData[K]
  ) => void;
  setTouched: (field: keyof SellerSituationFormData) => void;
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_DATA: SellerSituationFormData = {
  reason_for_selling: null,
  seller_timeline: null,
  lowest_acceptable_price: null,
  decision_maker_status: null,
  mortgage_delinquent: false,
  listed_with_agent: false,
  seller_notes: '',
};

/** Total number of fields for completion tracking */
const TOTAL_FIELDS = 7;

/** Debounce delay for motivation calculation (ms) */
const DEBOUNCE_DELAY = 150;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to manage Seller Situation form state.
 *
 * @param initialData - Optional initial form data
 * @param foreclosureBoost - Boost from foreclosure timeline (0-25)
 * @returns Form state and actions
 *
 * @example
 * ```tsx
 * const { state, setField, setTouched } = useSellerSituationForm(
 *   existingData,
 *   foreclosureBoost
 * );
 * ```
 */
export function useSellerSituationForm(
  initialData?: Partial<SellerSituationFormData>,
  foreclosureBoost: number = 0
): UseSellerSituationFormReturn {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const [data, setData] = React.useState<SellerSituationFormData>(() => ({
    ...INITIAL_DATA,
    ...initialData,
  }));

  const [errors, setErrors] = React.useState<SellerSituationFormState['errors']>(
    {}
  );
  const [touched, setTouchedState] = React.useState<
    SellerSituationFormState['touched']
  >({});
  const [motivationPreview, setMotivationPreview] =
    React.useState<MotivationPreview | null>(null);

  // Memoize initial data for dirty check
  const initialDataRef = React.useRef({ ...INITIAL_DATA, ...initialData });

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────

  const completedFields = React.useMemo(() => {
    let count = 0;
    if (data.reason_for_selling !== null) count++;
    if (data.seller_timeline !== null) count++;
    if (data.lowest_acceptable_price !== null) count++;
    if (data.decision_maker_status !== null) count++;
    // Booleans always count as "set" (they have explicit values)
    count++; // mortgage_delinquent
    count++; // listed_with_agent
    if (data.seller_notes.trim().length > 0) count++;
    return count;
  }, [data]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialDataRef.current);
  }, [data]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  const validate = React.useCallback(
    (formData: SellerSituationFormData): SellerSituationFormState['errors'] => {
      const newErrors: SellerSituationFormState['errors'] = {};

      // Validate lowest_acceptable_price
      if (formData.lowest_acceptable_price !== null) {
        if (
          typeof formData.lowest_acceptable_price !== 'number' ||
          Number.isNaN(formData.lowest_acceptable_price)
        ) {
          newErrors.lowest_acceptable_price = 'Please enter a valid number';
        } else if (formData.lowest_acceptable_price < 0) {
          newErrors.lowest_acceptable_price = 'Price cannot be negative';
        } else if (formData.lowest_acceptable_price > 100_000_000) {
          newErrors.lowest_acceptable_price = 'Price exceeds maximum allowed';
        }
      }

      return newErrors;
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MOTIVATION CALCULATION (DEBOUNCED)
  // ─────────────────────────────────────────────────────────────────────────────

  const calculateMotivationInternal = React.useCallback(
    (formData: SellerSituationFormData, boost: number) => {
      try {
        const result = computeMotivationScore({
          reason_for_selling: formData.reason_for_selling,
          seller_timeline: formData.seller_timeline,
          decision_maker_status: formData.decision_maker_status,
          mortgage_delinquent: formData.mortgage_delinquent,
          foreclosure_boost: boost,
        });

        setMotivationPreview({
          motivation_score: result.motivation_score,
          motivation_level: result.motivation_level,
          confidence: result.confidence,
          red_flags: result.red_flags,
        });
      } catch (error) {
        // Engine error - don't crash the form
        if (process.env.NODE_ENV !== 'production') {
          console.error('Motivation calculation failed:', error);
        }
        setMotivationPreview(null);
      }
    },
    []
  );

  // Debounce timer ref
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateMotivation = React.useCallback(
    (formData: SellerSituationFormData) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Set new debounced calculation
      debounceTimerRef.current = setTimeout(() => {
        calculateMotivationInternal(formData, foreclosureBoost);
      }, DEBOUNCE_DELAY);
    },
    [calculateMotivationInternal, foreclosureBoost]
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
    <K extends keyof SellerSituationFormData>(
      field: K,
      value: SellerSituationFormData[K]
    ) => {
      setData((prev) => {
        const next = { ...prev, [field]: value };
        // Validate and update errors
        const newErrors = validate(next);
        setErrors(newErrors);
        // Trigger debounced motivation calculation
        calculateMotivation(next);
        return next;
      });
    },
    [validate, calculateMotivation]
  );

  const setTouched = React.useCallback(
    (field: keyof SellerSituationFormData) => {
      setTouchedState((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const reset = React.useCallback(() => {
    setData({ ...INITIAL_DATA, ...initialData });
    setErrors({});
    setTouchedState({});
    setMotivationPreview(null);
  }, [initialData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Calculate motivation on mount and when foreclosureBoost changes
  React.useEffect(() => {
    calculateMotivationInternal(data, foreclosureBoost);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreclosureBoost]);

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
      totalFields: TOTAL_FIELDS,
      motivationPreview,
    },
    setField,
    setTouched,
    reset,
  };
}

// Re-export types for convenience
export type { ReasonForSelling, SellerTimeline, DecisionMakerStatus };
