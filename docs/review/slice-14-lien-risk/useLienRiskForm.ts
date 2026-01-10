/**
 * useLienRiskForm - Form state management for Lien Risk
 * @module components/underwrite/sections/useLienRiskForm
 * @slice 14 of 22
 *
 * Florida Statutes Referenced:
 * - FL 720.3085: Joint liability for HOA/CDD assessments
 * - FL 718.116: Condominium association lien priority
 *
 * Principles Applied:
 * - Form UX: Currency fields, grouped validation
 * - FL Law: Joint liability warnings
 * - State Management: Immutable updates, computed fields
 * - Performance: Memoization, debounced callbacks (150ms)
 * - Integration: Uses computeLienRisk from engine
 */

'use client';

import * as React from 'react';
import {
  computeLienRisk,
  type LienAccountStatus,
  type LienRiskInput,
  type LienRiskLevel,
} from '@/lib/engine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Re-export LienAccountStatus from engine for convenience.
 */
export type { LienAccountStatus, LienRiskLevel };

/**
 * Form data structure for Lien Risk.
 * Matches database schema columns.
 */
export interface LienRiskFormData {
  hoa_status: LienAccountStatus | null;
  hoa_arrears_amount: number | null;
  hoa_monthly_assessment: number | null;
  cdd_status: LienAccountStatus | null;
  cdd_arrears_amount: number | null;
  property_tax_status: LienAccountStatus | null;
  property_tax_arrears: number | null;
  municipal_liens_present: boolean;
  municipal_lien_amount: number | null;
  title_search_completed: boolean;
  title_issues_notes: string;
}

/**
 * Lien preview output for display (subset of LienRiskOutput).
 */
export interface LienPreview {
  total_surviving_liens: number;
  risk_level: LienRiskLevel;
  blocking_gate_triggered: boolean;
  joint_liability_warning: boolean;
  joint_liability_statute: string | null;
  breakdown: {
    hoa: number;
    cdd: number;
    property_tax: number;
    municipal: number;
  };
  evidence_needed: string[];
}

/**
 * Form state including computed values.
 */
export interface LienRiskFormState {
  data: LienRiskFormData;
  errors: Partial<Record<keyof LienRiskFormData, string>>;
  touched: Partial<Record<keyof LienRiskFormData, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  completedFields: number;
  totalFields: number;
  lienPreview: LienPreview | null;
}

/**
 * Hook return type.
 */
export interface UseLienRiskFormReturn {
  state: LienRiskFormState;
  setField: <K extends keyof LienRiskFormData>(
    field: K,
    value: LienRiskFormData[K]
  ) => void;
  setTouched: (field: keyof LienRiskFormData) => void;
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_DATA: LienRiskFormData = {
  hoa_status: null,
  hoa_arrears_amount: null,
  hoa_monthly_assessment: null,
  cdd_status: null,
  cdd_arrears_amount: null,
  property_tax_status: null,
  property_tax_arrears: null,
  municipal_liens_present: false,
  municipal_lien_amount: null,
  title_search_completed: false,
  title_issues_notes: '',
};

/** Total number of fields in this form */
const TOTAL_FIELDS = 11;

/** Debounce delay for lien calculation (ms) */
const DEBOUNCE_DELAY = 150;

/** Currency fields that must be non-negative */
const CURRENCY_FIELDS: (keyof LienRiskFormData)[] = [
  'hoa_arrears_amount',
  'hoa_monthly_assessment',
  'cdd_arrears_amount',
  'property_tax_arrears',
  'municipal_lien_amount',
];

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN STATUS OPTIONS (for export to Fields component)
// ═══════════════════════════════════════════════════════════════════════════════

export const LIEN_STATUS_OPTIONS: Array<{
  value: LienAccountStatus;
  label: string;
  description?: string;
}> = [
  { value: 'current', label: 'Current', description: 'All payments up to date' },
  { value: 'delinquent', label: 'Delinquent', description: 'Past due payments' },
  { value: 'unknown', label: 'Unknown', description: 'Status not verified' },
  {
    value: 'not_applicable',
    label: 'Not Applicable',
    description: 'No HOA/CDD exists',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to manage Lien Risk form state.
 *
 * @param initialData - Optional initial form data
 * @returns Form state and actions
 *
 * @example
 * ```tsx
 * const { state, setField, setTouched } = useLienRiskForm(existingData);
 * ```
 */
export function useLienRiskForm(
  initialData?: Partial<LienRiskFormData>
): UseLienRiskFormReturn {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const [data, setData] = React.useState<LienRiskFormData>(() => ({
    ...INITIAL_DATA,
    ...initialData,
  }));

  const [errors, setErrors] = React.useState<LienRiskFormState['errors']>({});
  const [touched, setTouchedState] = React.useState<
    LienRiskFormState['touched']
  >({});
  const [lienPreview, setLienPreview] = React.useState<LienPreview | null>(
    null
  );

  // Memoize initial data for dirty check
  const initialDataRef = React.useRef({ ...INITIAL_DATA, ...initialData });

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────

  const completedFields = React.useMemo(() => {
    let count = 0;

    // Status fields (select)
    if (data.hoa_status !== null) count++;
    if (data.cdd_status !== null) count++;
    if (data.property_tax_status !== null) count++;

    // Currency fields - count if entered
    if (data.hoa_arrears_amount !== null) count++;
    if (data.hoa_monthly_assessment !== null) count++;
    if (data.cdd_arrears_amount !== null) count++;
    if (data.property_tax_arrears !== null) count++;

    // Boolean fields (always count as completed since they have defaults)
    count++; // municipal_liens_present
    count++; // title_search_completed

    // Conditional: municipal amount only if liens present
    if (!data.municipal_liens_present || data.municipal_lien_amount !== null) {
      count++;
    }

    // Title notes (optional, count if any text or search completed)
    if (data.title_issues_notes.trim() !== '' || data.title_search_completed) {
      count++;
    }

    return Math.min(count, TOTAL_FIELDS);
  }, [data]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialDataRef.current);
  }, [data]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  const validate = React.useCallback(
    (formData: LienRiskFormData): LienRiskFormState['errors'] => {
      const newErrors: LienRiskFormState['errors'] = {};

      // Validate all currency fields are non-negative
      CURRENCY_FIELDS.forEach((field) => {
        const value = formData[field];
        if (value !== null && typeof value === 'number') {
          if (Number.isNaN(value) || !Number.isFinite(value)) {
            newErrors[field] = 'Please enter a valid number';
          } else if (value < 0) {
            newErrors[field] = 'Amount cannot be negative';
          } else if (value > 10_000_000) {
            // $10M max sanity check
            newErrors[field] = 'Amount exceeds maximum';
          }
        }
      });

      return newErrors;
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LIEN CALCULATION (DEBOUNCED)
  // ─────────────────────────────────────────────────────────────────────────────

  const calculateLienInternal = React.useCallback(
    (formData: LienRiskFormData) => {
      try {
        const input: LienRiskInput = {
          hoa_status: formData.hoa_status ?? 'unknown',
          hoa_arrears_amount: formData.hoa_arrears_amount,
          hoa_monthly_assessment: formData.hoa_monthly_assessment,
          cdd_status: formData.cdd_status ?? 'unknown',
          cdd_arrears_amount: formData.cdd_arrears_amount,
          property_tax_status: formData.property_tax_status ?? 'unknown',
          property_tax_arrears: formData.property_tax_arrears,
          municipal_liens_present: formData.municipal_liens_present,
          municipal_lien_amount: formData.municipal_lien_amount,
          title_search_completed: formData.title_search_completed,
          title_issues_notes: formData.title_issues_notes || null,
        };

        const result = computeLienRisk(input);

        setLienPreview({
          total_surviving_liens: result.total_surviving_liens,
          risk_level: result.risk_level,
          blocking_gate_triggered: result.blocking_gate_triggered,
          joint_liability_warning: result.joint_liability_warning,
          joint_liability_statute: result.joint_liability_statute,
          breakdown: result.breakdown,
          evidence_needed: result.evidence_needed,
        });
      } catch (error) {
        // Engine error - don't crash the form
        if (process.env.NODE_ENV !== 'production') {
          console.error('Lien calculation failed:', error);
        }
        setLienPreview(null);
      }
    },
    []
  );

  // Debounce timer ref
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const calculateLien = React.useCallback(
    (formData: LienRiskFormData) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Set new debounced calculation
      debounceTimerRef.current = setTimeout(() => {
        calculateLienInternal(formData);
      }, DEBOUNCE_DELAY);
    },
    [calculateLienInternal]
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
    <K extends keyof LienRiskFormData>(
      field: K,
      value: LienRiskFormData[K]
    ) => {
      setData((prev) => {
        let next = { ...prev, [field]: value };

        // Clear municipal amount if liens not present
        if (field === 'municipal_liens_present' && value === false) {
          next = { ...next, municipal_lien_amount: null };
          // Clear touched for hidden field
          setTouchedState((prevTouched) => {
            const newTouched = { ...prevTouched };
            delete newTouched.municipal_lien_amount;
            return newTouched;
          });
        }

        // Validate and update errors
        const newErrors = validate(next);
        setErrors(newErrors);

        // Trigger debounced lien calculation
        calculateLien(next);

        return next;
      });
    },
    [validate, calculateLien]
  );

  const setTouched = React.useCallback(
    (field: keyof LienRiskFormData) => {
      setTouchedState((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const reset = React.useCallback(() => {
    setData({ ...INITIAL_DATA, ...initialData });
    setErrors({});
    setTouchedState({});
    setLienPreview(null);
  }, [initialData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Calculate lien on mount
  React.useEffect(() => {
    calculateLienInternal(data);
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
      totalFields: TOTAL_FIELDS,
      lienPreview,
    },
    setField,
    setTouched,
    reset,
  };
}
