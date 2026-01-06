"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ColumnMapping,
  ImportJob,
  FileType,
  SourceRoute,
} from "@hps-internal/contracts";
import {
  parseFile,
  detectFileType,
  autoMapColumns,
  checkMappingCompleteness,
  normalizeRows,
  validateRows,
  computeDedupeKeyFromRow,
  type ParsedFile,
  type NormalizedRow,
  type BatchValidationResult,
} from "@/lib/import";

// =============================================================================
// TYPES
// =============================================================================

export type WizardStep = "upload" | "type" | "mapping" | "validate" | "commit";

export interface WizardState {
  currentStep: WizardStep;

  // Step 1: Upload
  file: File | null;
  fileHash: string | null;

  // Step 2: Type (auto-detected, can override)
  fileType: FileType | null;

  // Parsed data
  parsedFile: ParsedFile | null;
  parseError: string | null;

  // Step 3: Mapping
  columnMapping: ColumnMapping;
  mappingComplete: boolean;

  // Step 4: Validate (computed from mapping)
  normalizedRows: Array<NormalizedRow & { dedupeKey: string }>;
  validationResult: BatchValidationResult | null;

  // Step 5: Commit
  job: ImportJob | null;

  // UI state
  isProcessing: boolean;
  processingPhase: string | null;
}

export interface WizardActions {
  // Navigation
  goToStep: (step: WizardStep) => void;
  canGoToStep: (step: WizardStep) => boolean;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1
  setFile: (file: File | null) => Promise<void>;

  // Step 2
  setFileType: (type: FileType) => void;

  // Step 3
  updateColumnMapping: (mapping: ColumnMapping) => void;
  setColumnMapping: (sourceColumn: string, targetField: string | null) => void;
  resetMapping: () => void;

  // Step 4
  processRows: () => Promise<void>;

  // Step 5
  setJob: (job: ImportJob) => void;

  // Reset
  reset: () => void;
}

const STEP_ORDER: WizardStep[] = [
  "upload",
  "type",
  "mapping",
  "validate",
  "commit",
];

const INITIAL_STATE: WizardState = {
  currentStep: "upload",
  file: null,
  fileHash: null,
  fileType: null,
  parsedFile: null,
  parseError: null,
  columnMapping: {},
  mappingComplete: false,
  normalizedRows: [],
  validationResult: null,
  job: null,
  isProcessing: false,
  processingPhase: null,
};

// LocalStorage key for persisted mapping
const MAPPING_STORAGE_KEY = "hps-import-column-mapping";

// =============================================================================
// HOOK
// =============================================================================

export function useImportWizard(
  _sourceRoute: SourceRoute = "import"
): [WizardState, WizardActions] {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  // Load persisted mapping on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (saved) {
        JSON.parse(saved);
        // Will be applied when headers are available
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Persist mapping changes
  useEffect(() => {
    if (Object.keys(state.columnMapping).length > 0) {
      try {
        localStorage.setItem(
          MAPPING_STORAGE_KEY,
          JSON.stringify(state.columnMapping)
        );
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [state.columnMapping]);

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const canGoToStep = useCallback(
    (step: WizardStep): boolean => {
      switch (step) {
        case "upload":
          return true;
        case "type":
          return state.file !== null && state.parsedFile !== null;
        case "mapping":
          return (
            state.file !== null &&
            state.parsedFile !== null &&
            state.fileType !== null
          );
        case "validate":
          return state.mappingComplete;
        case "commit":
          return (
            state.validationResult !== null &&
            state.validationResult.validCount > 0
          );
        default:
          return false;
      }
    },
    [state]
  );

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (canGoToStep(step)) {
        setState((prev) => ({ ...prev, currentStep: step }));
      }
    },
    [canGoToStep]
  );

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const next = STEP_ORDER[currentIndex + 1];
      goToStep(next);
    }
  }, [state.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const prev = STEP_ORDER[currentIndex - 1];
      goToStep(prev);
    }
  }, [state.currentStep, goToStep]);

  // ==========================================================================
  // STEP 1: FILE UPLOAD
  // ==========================================================================

  const setFile = useCallback(async (file: File | null) => {
    if (!file) {
      setState((prev) => ({
        ...prev,
        file: null,
        fileHash: null,
        fileType: null,
        parsedFile: null,
        parseError: null,
        columnMapping: {},
        mappingComplete: false,
        normalizedRows: [],
        validationResult: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      processingPhase: "Reading file...",
      parseError: null,
    }));

    try {
      // Detect file type
      const detectedType = detectFileType(file);
      if (!detectedType) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          processingPhase: null,
          parseError: `Unsupported file type. Please upload CSV, XLSX, or JSON.`,
        }));
        return;
      }

      // Parse file
      setState((prev) => ({ ...prev, processingPhase: "Parsing file..." }));
      const parseResult = await parseFile(file);

      if (!parseResult.success) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          processingPhase: null,
          parseError: parseResult.error.message,
        }));
        return;
      }

      // Compute file hash
      setState((prev) => ({
        ...prev,
        processingPhase: "Computing file hash...",
      }));
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer()
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Auto-map columns
      const autoMapping = autoMapColumns(parseResult.data.headers);

      // Try to restore persisted mapping for matching headers
      let finalMapping = autoMapping;
      try {
        const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
        if (saved) {
          const savedMapping = JSON.parse(saved);
          // Only use saved mappings for headers that exist in this file
          for (const header of parseResult.data.headers) {
            if (savedMapping[header] !== undefined) {
              finalMapping[header] = savedMapping[header];
            }
          }
        }
      } catch {
        // Use auto-mapping
      }

      const completeness = checkMappingCompleteness(finalMapping);

      setState((prev) => ({
        ...prev,
        file,
        fileHash,
        fileType: detectedType,
        parsedFile: parseResult.data,
        parseError: null,
        columnMapping: finalMapping,
        mappingComplete: completeness.isComplete,
        isProcessing: false,
        processingPhase: null,
        currentStep: "type", // Auto-advance to type step
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        processingPhase: null,
        parseError:
          error instanceof Error ? error.message : "Failed to parse file",
      }));
    }
  }, []);

  // ==========================================================================
  // STEP 2: FILE TYPE
  // ==========================================================================

  const setFileType = useCallback((type: FileType) => {
    setState((prev) => ({ ...prev, fileType: type }));
  }, []);

  // ==========================================================================
  // STEP 3: COLUMN MAPPING
  // ==========================================================================

  const updateColumnMapping = useCallback((mapping: ColumnMapping) => {
    const completeness = checkMappingCompleteness(mapping);
    setState((prev) => ({
      ...prev,
      columnMapping: mapping,
      mappingComplete: completeness.isComplete,
    }));
  }, []);

  const setColumnMapping = useCallback(
    (sourceColumn: string, targetField: string | null) => {
      setState((prev) => {
        const newMapping = { ...prev.columnMapping };

        // If assigning to a field, clear any other column mapped to that field
        if (targetField) {
          for (const [col, field] of Object.entries(newMapping)) {
            if (field === targetField && col !== sourceColumn) {
              newMapping[col] = null;
            }
          }
        }

        newMapping[sourceColumn] = targetField as ColumnMapping[string];
        const completeness = checkMappingCompleteness(newMapping);

        return {
          ...prev,
          columnMapping: newMapping,
          mappingComplete: completeness.isComplete,
        };
      });
    },
    []
  );

  const resetMapping = useCallback(() => {
    if (state.parsedFile) {
      const autoMapping = autoMapColumns(state.parsedFile.headers);
      const completeness = checkMappingCompleteness(autoMapping);
      setState((prev) => ({
        ...prev,
        columnMapping: autoMapping,
        mappingComplete: completeness.isComplete,
      }));
    }
  }, [state.parsedFile]);

  // ==========================================================================
  // STEP 4: PROCESS ROWS
  // ==========================================================================

  const processRows = useCallback(async () => {
    if (!state.parsedFile || !state.mappingComplete) return;

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      processingPhase: "Normalizing rows...",
    }));

    try {
      // Normalize all rows
      const normalized = normalizeRows(
        state.parsedFile.rows as Record<string, unknown>[],
        state.columnMapping,
        1 // Start row numbering at 1
      );

      setState((prev) => ({
        ...prev,
        processingPhase: "Computing dedupe keys...",
      }));

      // Compute dedupe keys
      const withDedupeKeys = await Promise.all(
        normalized.map(async (row) => ({
          ...row,
          dedupeKey: await computeDedupeKeyFromRow(row.normalized),
        }))
      );

      setState((prev) => ({
        ...prev,
        processingPhase: "Validating rows...",
      }));

      // Validate all rows
      const validationResult = validateRows(withDedupeKeys);

      setState((prev) => ({
        ...prev,
        normalizedRows: withDedupeKeys,
        validationResult,
        isProcessing: false,
        processingPhase: null,
        currentStep: "validate",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        processingPhase: null,
        parseError:
          error instanceof Error ? error.message : "Failed to process rows",
      }));
    }
  }, [state.parsedFile, state.columnMapping, state.mappingComplete]);

  // ==========================================================================
  // STEP 5: COMMIT
  // ==========================================================================

  const setJob = useCallback((job: ImportJob) => {
    setState((prev) => ({ ...prev, job }));
  }, []);

  // ==========================================================================
  // RESET
  // ==========================================================================

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  const actions: WizardActions = {
    goToStep,
    canGoToStep,
    nextStep,
    prevStep,
    setFile,
    setFileType,
    updateColumnMapping,
    setColumnMapping,
    resetMapping,
    processRows,
    setJob,
    reset,
  };

  return [state, actions];
}
