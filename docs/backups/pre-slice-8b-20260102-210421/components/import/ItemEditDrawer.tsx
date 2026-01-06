"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  XIcon,
  SaveIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";
import type { CanonicalField } from "@hps-internal/contracts";
import { validateRow } from "@/lib/import/validation";
import {
  normalizePhone,
  normalizeEmail,
  normalizeState,
  normalizeZip,
  normalizeStreet,
  normalizeCity,
} from "@/lib/import/normalization";
import { computeDedupeKey } from "@/lib/import/dedupeKey";
import {
  updateImportItem,
  type ImportItem,
  type ItemStatus,
} from "@/lib/import/importItemsApi";
import { ItemStatusBadge } from "./ItemStatusBadge";

// =============================================================================
// TYPES
// =============================================================================

interface ItemEditDrawerProps {
  item: ImportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedItem: ImportItem) => void;
}

interface FieldConfig {
  key: CanonicalField;
  label: string;
  required: boolean;
  type: "text" | "email" | "tel";
  placeholder: string;
  normalizer?: (value: unknown) => string;
}

// =============================================================================
// FIELD CONFIGURATION
// =============================================================================

const FIELDS: FieldConfig[] = [
  {
    key: "street",
    label: "Street Address",
    required: true,
    type: "text",
    placeholder: "123 Main St",
    normalizer: normalizeStreet,
  },
  {
    key: "city",
    label: "City",
    required: true,
    type: "text",
    placeholder: "Orlando",
    normalizer: normalizeCity,
  },
  {
    key: "state",
    label: "State",
    required: true,
    type: "text",
    placeholder: "FL",
    normalizer: normalizeState,
  },
  {
    key: "zip",
    label: "ZIP Code",
    required: true,
    type: "text",
    placeholder: "32801",
    normalizer: normalizeZip,
  },
  {
    key: "client_name",
    label: "Client Name",
    required: true,
    type: "text",
    placeholder: "John Doe",
  },
  {
    key: "client_phone",
    label: "Client Phone",
    required: true,
    type: "tel",
    placeholder: "4075551234",
    normalizer: normalizePhone,
  },
  {
    key: "client_email",
    label: "Client Email",
    required: true,
    type: "email",
    placeholder: "john@example.com",
    normalizer: normalizeEmail,
  },
  {
    key: "seller_name",
    label: "Seller Name",
    required: false,
    type: "text",
    placeholder: "Jane Smith",
  },
  {
    key: "seller_phone",
    label: "Seller Phone",
    required: false,
    type: "tel",
    placeholder: "4075559999",
    normalizer: normalizePhone,
  },
  {
    key: "seller_email",
    label: "Seller Email",
    required: false,
    type: "email",
    placeholder: "jane@example.com",
    normalizer: normalizeEmail,
  },
  {
    key: "tags",
    label: "Tags",
    required: false,
    type: "text",
    placeholder: "tag1, tag2",
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    type: "text",
    placeholder: "Additional notes...",
  },
  {
    key: "external_id",
    label: "External ID",
    required: false,
    type: "text",
    placeholder: "EXT-001",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ItemEditDrawer({
  item,
  isOpen,
  onClose,
  onSaved,
}: ItemEditDrawerProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      const payload = (item.payload_json as unknown as Record<string, unknown>) || {};
      const initialData: Record<string, string> = {};

      for (const field of FIELDS) {
        initialData[field.key] = String(payload[field.key] || "");
      }

      setFormData(initialData);
      setErrors({});
      setIsDirty(false);
      setSaveError(null);
    }
  }, [item]);

  // Validate form data
  const validationResult = useMemo(() => {
    const normalized: Record<string, string> = {};

    for (const field of FIELDS) {
      const value = formData[field.key] || "";
      normalized[field.key] = field.normalizer
        ? field.normalizer(value)
        : value.trim();
    }

    return validateRow(normalized);
  }, [formData]);

  // Convert validation errors to field map
  useEffect(() => {
    const errorMap: Record<string, string> = {};
    for (const err of validationResult.errors) {
      errorMap[err.field] = err.message;
    }
    setErrors(errorMap);
  }, [validationResult.errors]);

  // Handle field change
  const handleFieldChange = useCallback(
    (key: CanonicalField, value: string) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
      setSaveError(null);
    },
    []
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!item || !validationResult.isValid) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Normalize all fields
      const normalizedPayload: Record<string, string> = {};
      for (const field of FIELDS) {
        const value = formData[field.key] || "";
        normalizedPayload[field.key] = field.normalizer
          ? field.normalizer(value)
          : value.trim();
      }

      // Compute new dedupe key
      const dedupeKey = await computeDedupeKey(
        normalizedPayload.street || "",
        normalizedPayload.city || "",
        normalizedPayload.state || "",
        normalizedPayload.zip || ""
      );

      // Determine new status
      const newStatus: ItemStatus = validationResult.isValid
        ? "valid"
        : "needs_fix";

      // Update the item
      const result = await updateImportItem({
        item_id: item.id,
        normalized_payload: normalizedPayload,
        dedupe_key: dedupeKey,
        validation_errors: validationResult.errors,
        status: newStatus,
        skip_reason: null,
      });

      onSaved(result.item);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  }, [item, formData, validationResult, onSaved, onClose]);

  // Handle close with unsaved changes
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (
        window.confirm("You have unsaved changes. Are you sure you want to close?")
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Don't render if not open
  if (!isOpen || !item) return null;

  const canSave = isDirty && validationResult.isValid && !isSaving;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-900 border-l border-slate-700 z-50
                      transform transition-transform duration-300 ease-out overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Item</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 text-sm">
                Row {item.row_number}
              </span>
              <ItemStatusBadge status={item.status} size="sm" />
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Required Fields Section */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                Required Fields
              </h3>
              <div className="space-y-3">
                {FIELDS.filter((f) => f.required).map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {field.label}
                      <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className={`
                        w-full px-3 py-2 bg-slate-800 border rounded-lg text-white
                        placeholder-slate-500 focus:outline-none focus:ring-2
                        ${
                          errors[field.key]
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-600 focus:ring-blue-500"
                        }
                      `}
                    />
                    {errors[field.key] && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <AlertCircleIcon className="w-3.5 h-3.5" />
                        {errors[field.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                Optional Fields
              </h3>
              <div className="space-y-3">
                {FIELDS.filter((f) => !f.required).map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className={`
                        w-full px-3 py-2 bg-slate-800 border rounded-lg text-white
                        placeholder-slate-500 focus:outline-none focus:ring-2
                        ${
                          errors[field.key]
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-600 focus:ring-blue-500"
                        }
                      `}
                    />
                    {errors[field.key] && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <AlertCircleIcon className="w-3.5 h-3.5" />
                        {errors[field.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/50">
          {/* Validation Status */}
          <div className="flex items-center justify-between mb-4">
            {validationResult.isValid ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-sm">All fields valid</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircleIcon className="w-4 h-4" />
                <span className="text-sm">
                  {validationResult.errors.length} validation error(s)
                </span>
              </div>
            )}
            {isDirty && (
              <span className="text-slate-400 text-sm">Unsaved changes</span>
            )}
          </div>

          {/* Save Error */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4" />
                {saveError}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800
                         border border-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors
                ${
                  canSave
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }
              `}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
