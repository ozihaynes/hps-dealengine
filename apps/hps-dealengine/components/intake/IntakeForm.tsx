"use client";

import React, { useCallback, useMemo, useState } from "react";
import { IntakeProgressBar } from "./IntakeProgressBar";
import { IntakeFormSection } from "./IntakeFormSection";
import { FileUploadZone, type UploadFile } from "./FileUploadZone";
import { useIntakeAutoSave } from "@/hooks/useIntakeAutoSave";
import {
  submitIntake,
  startIntakeUpload,
  completeIntakeUpload,
  type IntakeSchemaApi,
  type IntakeFieldApi,
} from "@/lib/intakePublic";
import type { AddressSelection } from "@/components/ui/AddressAutocomplete";

/**
 * Check if a field's condition is satisfied based on current form values.
 * Returns true if the field should be shown/validated.
 */
function isFieldVisible(field: IntakeFieldApi, values: Record<string, unknown>): boolean {
  if (!field.condition) {
    return true;
  }
  const { field: conditionField, equals: conditionValue } = field.condition;
  const currentValue = values[conditionField];
  if (typeof conditionValue === "boolean") {
    return currentValue === conditionValue;
  }
  return currentValue === conditionValue;
}

type EvidenceUploadConfig = {
  key: string;
  label: string;
  description?: string;
  accept?: string[];
  max_files?: number;
  required?: boolean;
};

type IntakeFormProps = {
  token: string;
  linkId: string;
  schema: IntakeSchemaApi;
  initialPayload: Record<string, unknown> | null;
  /** Pre-fill data for form fields (contact info, address, etc.) */
  prefillData?: Record<string, string> | null;
  onSubmitSuccess: () => void;
};

export function IntakeForm({
  token,
  linkId,
  schema,
  initialPayload,
  prefillData,
  onSubmitSuccess,
}: IntakeFormProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Initialize form values: existing payload > prefill data > empty
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    console.log("[IntakeForm DEBUG] Initializing state:");
    console.log("[IntakeForm DEBUG] prefillData received:", prefillData);
    console.log("[IntakeForm DEBUG] initialPayload received:", initialPayload);

    const initial: Record<string, unknown> = {};

    // Apply prefill data first (lowest priority)
    if (prefillData) {
      Object.entries(prefillData).forEach(([key, value]) => {
        if (value && typeof value === "string" && value.trim()) {
          initial[key] = value;
        }
      });
    }

    // Apply initial payload on top (higher priority - user's saved data)
    if (initialPayload) {
      Object.entries(initialPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          initial[key] = value;
        }
      });
    }

    console.log("[IntakeForm DEBUG] Final initial state:", initial);
    return initial;
  });

  // Track if contact info was pre-filled
  const hasPrefilledContact = useMemo(() => {
    if (!prefillData) return false;
    // Check if any contact field was prefilled AND not overwritten by initialPayload
    const contactFields = ["contact_name", "contact_email", "contact_phone"];
    return contactFields.some((key) => {
      const prefillValue = prefillData[key];
      const currentValue = values[key];
      return prefillValue && currentValue === prefillValue;
    });
  }, [prefillData, values]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File upload state - keyed by upload config key
  const [uploadFiles, setUploadFiles] = useState<Record<string, UploadFile[]>>({});

  // Get evidence uploads config from schema
  const evidenceUploads = useMemo(() => {
    return (schema.evidence_uploads ?? []) as EvidenceUploadConfig[];
  }, [schema.evidence_uploads]);

  const hasEvidenceUploads = evidenceUploads.length > 0;

  // Defensive: ensure sections is always an array
  const sections = schema.sections ?? [];
  const currentSection = sections[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === sections.length - 1;

  // Auto-save hook - must be called unconditionally (Rules of Hooks)
  const { status: autoSaveStatus, scheduleAutoSave } = useIntakeAutoSave({
    token,
    linkId,
    debounceMs: 30000,
    enabled: true,
  });

  // Handle field change
  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      setValues((prev) => {
        const newValues = { ...prev, [key]: value };
        // Schedule auto-save
        scheduleAutoSave(newValues);
        return newValues;
      });
      // Clear error for this field
      setErrors((prev) => {
        if (prev[key]) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    },
    [scheduleAutoSave],
  );

  // Handle address selection - auto-populate city/state/zip fields
  const handleAddressSelect = useCallback(
    (selection: AddressSelection) => {
      setValues((prev) => {
        const newValues = { ...prev };
        // Auto-populate city, state, zip if the selection has them
        if (selection.city) {
          newValues["city"] = selection.city;
        }
        if (selection.state) {
          newValues["state"] = selection.state;
        }
        if (selection.postalCode) {
          newValues["zip"] = selection.postalCode;
        }
        // Schedule auto-save with the updated values
        scheduleAutoSave(newValues);
        return newValues;
      });
    },
    [scheduleAutoSave],
  );

  // Validate current section
  const validateCurrentSection = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Defensive: ensure fields is an array
    const fields = currentSection?.fields ?? [];
    for (const field of fields) {
      // Skip validation for hidden conditional fields
      if (!isFieldVisible(field, values)) {
        continue;
      }

      if (field.required) {
        const value = values[field.key];
        // Check for empty values, including empty arrays for multiselect
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          newErrors[field.key] = "This field is required";
          isValid = false;
        }
      }

      // Additional validation based on field type
      const value = values[field.key];
      if (value !== undefined && value !== null && value !== "") {
        if (field.type === "email" && typeof value === "string") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.key] = "Please enter a valid email address";
            isValid = false;
          }
        }

        if (field.type === "number" || field.type === "currency") {
          const numValue = Number(value);
          if (field.min !== undefined && numValue < field.min) {
            newErrors[field.key] = `Value must be at least ${field.min}`;
            isValid = false;
          }
          if (field.max !== undefined && numValue > field.max) {
            newErrors[field.key] = `Value must be at most ${field.max}`;
            isValid = false;
          }
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [currentSection?.fields, values]);

  // Handle file upload start
  const handleUploadStart = useCallback(
    async (file: File, uploadKey: string) => {
      const result = await startIntakeUpload(token, linkId, {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadKey,
      });
      return {
        fileId: result.fileId,
        uploadUrl: result.uploadUrl,
        uploadToken: result.uploadToken,
      };
    },
    [token, linkId],
  );

  // Handle file upload complete
  const handleUploadComplete = useCallback(
    async (fileId: string) => {
      const result = await completeIntakeUpload(token, linkId, fileId);
      return {
        scanStatus: result.scanStatus,
        storageState: result.storageState,
      };
    },
    [token, linkId],
  );

  // Handle files change for a specific upload key
  const handleFilesChange = useCallback((uploadKey: string, files: UploadFile[]) => {
    setUploadFiles((prev) => ({
      ...prev,
      [uploadKey]: files,
    }));
  }, []);

  // Navigate to next section
  const handleNext = useCallback(() => {
    if (!validateCurrentSection()) {
      return;
    }
    if (!isLastSection) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isLastSection, validateCurrentSection]);

  // Navigate to previous section
  const handleBack = useCallback(() => {
    if (!isFirstSection) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isFirstSection]);

  // Navigate to specific section
  const handleSectionClick = useCallback(
    (index: number) => {
      // Only allow navigating to completed or current sections
      if (index <= currentSectionIndex) {
        setCurrentSectionIndex(index);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentSectionIndex],
  );

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentSection()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitIntake(token, linkId, values);
      onSubmitSuccess();
    } catch (err) {
      console.error("Submit error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to submit form";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [token, linkId, values, validateCurrentSection, onSubmitSuccess]);

  // Auto-save status indicator
  const autoSaveIndicator = useMemo(() => {
    switch (autoSaveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--accent-blue)]" />
            Saving...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Saved
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01"
              />
            </svg>
            Save failed
          </span>
        );
      default:
        return null;
    }
  }, [autoSaveStatus]);

  // Safety check AFTER all hooks (Rules of Hooks compliance)
  if (sections.length === 0 || !currentSection) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6">
        <p className="text-sm text-red-300">
          Unable to load form sections. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <IntakeProgressBar
        sections={sections.map((s) => ({ id: s.id, title: s.title }))}
        currentSectionIndex={currentSectionIndex}
        onSectionClick={handleSectionClick}
      />

      {/* Form content */}
      <div className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 sm:p-6">
        <IntakeFormSection
          section={currentSection}
          values={values}
          errors={errors}
          onChange={handleFieldChange}
          onAddressSelect={handleAddressSelect}
        />

        {/* Pre-filled contact confirmation banner */}
        {hasPrefilledContact && currentSectionIndex === 0 && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-2 text-sm text-emerald-300">
              <svg
                className="h-4 w-4 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Please confirm your contact information above is correct before continuing.
            </p>
          </div>
        )}
      </div>

      {/* File uploads - shown on last section */}
      {isLastSection && hasEvidenceUploads && (
        <div className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-[color:var(--text-primary)]">
            Supporting Documents
          </h3>
          <p className="mb-6 text-sm text-[color:var(--text-secondary)]">
            Upload any relevant documents to support your submission. Files are
            securely scanned before processing.
          </p>
          <div className="space-y-6">
            {evidenceUploads.map((config) => (
              <div key={config.key} className="space-y-1">
                <FileUploadZone
                  token={token}
                  linkId={linkId}
                  uploadKey={config.key}
                  label={config.label}
                  accept={config.accept}
                  maxFiles={config.max_files ?? 5}
                  files={uploadFiles[config.key] ?? []}
                  onFilesChange={(files) => handleFilesChange(config.key, files)}
                  onUploadStart={(file) => handleUploadStart(file, config.key)}
                  onUploadComplete={handleUploadComplete}
                  disabled={isSubmitting}
                />
                {config.description && (
                  <p className="text-xs text-[color:var(--text-secondary)] pl-1">
                    {config.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2">
          <p className="text-sm text-red-300">{submitError}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <div>
          {!isFirstSection && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-white/10 disabled:opacity-50"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Auto-save indicator */}
          {autoSaveIndicator}

          {isLastSection ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-[color:var(--accent-blue)] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[color:var(--accent-blue)]/20 transition hover:bg-[color:var(--accent-blue)]/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                "Submit"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-[color:var(--accent-blue)] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[color:var(--accent-blue)]/20 transition hover:bg-[color:var(--accent-blue)]/90"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Save & Continue Later hint */}
      <p className="text-center text-xs text-[color:var(--text-secondary)]">
        Your progress is automatically saved. You can close this page and return
        later using the same link.
      </p>
    </div>
  );
}

export default IntakeForm;
