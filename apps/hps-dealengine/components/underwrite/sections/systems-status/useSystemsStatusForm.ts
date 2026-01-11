/**
 * useSystemsStatusForm - Form state hook for property systems
 * @module components/underwrite/sections/systems-status/useSystemsStatusForm
 * @slice 18 of 22
 *
 * Manages form state for property systems section with:
 * - 5 form fields (condition, maintenance, roof/hvac/water heater years)
 * - Debounced engine computation
 * - Type-safe field updates
 *
 * Principles Applied:
 * - Single Responsibility: Form state only
 * - Type Safety: Explicit field types
 * - Performance: Memoization, debounced callbacks (150ms)
 */

'use client';

import * as React from 'react';
import { computeSystemsStatus } from '@/lib/engine';
import type {
  SystemsStatusInput,
  SystemsStatusOutput,
  PropertyCondition,
  DeferredMaintenance,
} from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemsStatusFormData {
  overall_condition: PropertyCondition | null;
  deferred_maintenance_level: DeferredMaintenance | null;
  roof_year_installed: number | null;
  hvac_year_installed: number | null;
  water_heater_year_installed: number | null;
}

export interface UseSystemsStatusFormOptions {
  /** Initial form data */
  initialData?: Partial<SystemsStatusFormData>;
  /** Callback when form data changes */
  onChange?: (data: SystemsStatusFormData) => void;
  /** Debounce delay for engine computation (ms) */
  debounceMs?: number;
}

export interface UseSystemsStatusFormReturn {
  /** Current form data */
  data: SystemsStatusFormData;
  /** Computed output from engine */
  output: SystemsStatusOutput | null;
  /** Whether computation is pending */
  isComputing: boolean;
  /** Set a single field value */
  setField: <K extends keyof SystemsStatusFormData>(
    field: K,
    value: SystemsStatusFormData[K]
  ) => void;
  /** Reset form to initial state */
  reset: () => void;
  /** Count of completed fields */
  completedFields: number;
  /** Total fields */
  totalFields: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_FORM_DATA: SystemsStatusFormData = {
  overall_condition: null,
  deferred_maintenance_level: null,
  roof_year_installed: null,
  hvac_year_installed: null,
  water_heater_year_installed: null,
};

const TOTAL_FIELDS = 5;
const DEFAULT_DEBOUNCE_MS = 150;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useSystemsStatusForm(
  options: UseSystemsStatusFormOptions = {}
): UseSystemsStatusFormReturn {
  const {
    initialData,
    onChange,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const [data, setData] = React.useState<SystemsStatusFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  }));

  const [output, setOutput] = React.useState<SystemsStatusOutput | null>(null);
  const [isComputing, setIsComputing] = React.useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERNAL COMPUTATION FUNCTION
  // ─────────────────────────────────────────────────────────────────────────────

  const computeStatusInternal = React.useCallback(
    (formData: SystemsStatusFormData) => {
      // Only compute if we have at least one year field filled
      const hasYearData =
        formData.roof_year_installed !== null ||
        formData.hvac_year_installed !== null ||
        formData.water_heater_year_installed !== null;

      if (!hasYearData) {
        setOutput(null);
        setIsComputing(false);
        return;
      }

      // Build input for engine
      const input: SystemsStatusInput = {
        roof_year_installed: formData.roof_year_installed,
        hvac_year_installed: formData.hvac_year_installed,
        water_heater_year_installed: formData.water_heater_year_installed,
        overall_condition: formData.overall_condition,
        deferred_maintenance_level: formData.deferred_maintenance_level,
      };

      const result = computeSystemsStatus(input);
      setOutput(result);
      setIsComputing(false);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DEBOUNCED COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────────

  // Debounce timer ref
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const computeStatus = React.useCallback(
    (formData: SystemsStatusFormData) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Set new debounced calculation
      debounceTimerRef.current = setTimeout(() => {
        computeStatusInternal(formData);
      }, debounceMs);
    },
    [computeStatusInternal, debounceMs]
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
  // FIELD UPDATE
  // ─────────────────────────────────────────────────────────────────────────────

  const setField = React.useCallback(
    <K extends keyof SystemsStatusFormData>(
      field: K,
      value: SystemsStatusFormData[K]
    ) => {
      setData((prev) => {
        const next = { ...prev, [field]: value };
        // Note: onChange is handled via useEffect in the Section component
        // to avoid setState during render cascade
        setIsComputing(true);
        // Trigger debounced computation
        computeStatus(next);
        return next;
      });
    },
    [computeStatus]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────────

  const reset = React.useCallback(() => {
    const resetData = { ...DEFAULT_FORM_DATA, ...initialData };
    setData(resetData);
    setOutput(null);
    setIsComputing(false);
    onChange?.(resetData);
  }, [initialData, onChange]);

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLETED FIELDS COUNT
  // ─────────────────────────────────────────────────────────────────────────────

  const completedFields = React.useMemo(() => {
    return [
      data.overall_condition,
      data.deferred_maintenance_level,
      data.roof_year_installed,
      data.hvac_year_installed,
      data.water_heater_year_installed,
    ].filter((v) => v !== null).length;
  }, [data]);

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIAL COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    computeStatus(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    output,
    isComputing,
    setField,
    reset,
    completedFields,
    totalFields: TOTAL_FIELDS,
  };
}
