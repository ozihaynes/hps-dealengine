"use client";

import React from "react";
import type { IntakeFieldApi } from "@/lib/intakePublic";
import AddressAutocomplete, { type AddressSelection } from "@/components/ui/AddressAutocomplete";

type IntakeFormFieldProps = {
  field: IntakeFieldApi;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  onAddressSelect?: (selection: AddressSelection) => void;
  error?: string;
};

/**
 * Safely extract a displayable string from a value that might be:
 * - A string
 * - A number
 * - An object with {label, value} or {value} shape
 * - null/undefined
 */
function safeStringValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.value === "string") return obj.value;
    if (typeof obj.label === "string") return obj.label;
  }
  return "";
}

/**
 * Extract option value and label from an option that might be:
 * - A string (use as both value and label)
 * - An object with {label, value}
 */
function extractOption(opt: unknown): { value: string; label: string } {
  if (typeof opt === "string") {
    return { value: opt, label: opt };
  }
  if (typeof opt === "object" && opt !== null) {
    const obj = opt as Record<string, unknown>;
    const value = typeof obj.value === "string" ? obj.value : String(obj.value ?? "");
    const label = typeof obj.label === "string" ? obj.label : value;
    return { value, label };
  }
  return { value: "", label: "" };
}

export function IntakeFormField({
  field,
  value,
  onChange,
  onAddressSelect,
  error,
}: IntakeFormFieldProps) {
  const handleChange = (newValue: unknown) => {
    onChange(field.key, newValue);
  };

  const baseInputClass = `
    w-full rounded-lg border bg-slate-800/60 px-3 py-2.5
    text-sm text-white
    placeholder:text-slate-500
    focus:outline-none focus:ring-1 focus:ring-sky-500/20 focus:border-sky-500/70
    transition-all duration-150
    ${error ? "border-red-400/50" : "border-slate-600/40 focus:bg-slate-800/80"}
  `;

  const renderField = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <input
            type={field.type === "phone" ? "tel" : field.type}
            value={safeStringValue(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            pattern={field.pattern}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              handleChange(e.target.value ? Number(e.target.value) : null)
            }
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className={baseInputClass}
          />
        );

      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              $
            </span>
            <input
              type="number"
              value={(value as number) ?? ""}
              onChange={(e) =>
                handleChange(e.target.value ? Number(e.target.value) : null)
              }
              placeholder={field.placeholder ?? "0.00"}
              min={field.min ?? 0}
              max={field.max}
              step="0.01"
              className={`${baseInputClass} pl-7`}
            />
          </div>
        );

      case "date":
        return (
          <input
            type="date"
            value={safeStringValue(value)}
            onChange={(e) => handleChange(e.target.value)}
            className={baseInputClass}
          />
        );

      case "select":
        return (
          <select
            value={safeStringValue(value)}
            onChange={(e) => handleChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">
              {field.placeholder ?? "Select an option..."}
            </option>
            {field.options?.map((option, idx) => {
              const { value: optValue, label: optLabel } = extractOption(option);
              return (
                <option key={optValue || idx} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );

      case "multiselect": {
        // Value should be an array of selected option values
        const selectedValues = Array.isArray(value) ? value : [];

        const handleMultiSelectChange = (optValue: string, checked: boolean) => {
          if (checked) {
            // Add to selection (if not "none", remove "none")
            if (optValue === "none") {
              handleChange(["none"]);
            } else {
              handleChange([...selectedValues.filter(v => v !== "none"), optValue]);
            }
          } else {
            // Remove from selection
            handleChange(selectedValues.filter(v => v !== optValue));
          }
        };

        return (
          <div className="space-y-2 rounded-lg border border-slate-600/40 bg-slate-800/60 p-3">
            {field.options?.map((option, idx) => {
              const { value: optValue, label: optLabel } = extractOption(option);
              const isChecked = selectedValues.includes(optValue);
              return (
                <label
                  key={optValue || idx}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleMultiSelectChange(optValue, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 accent-sky-500"
                  />
                  <span className="text-sm text-white">
                    {optLabel}
                  </span>
                </label>
              );
            })}
          </div>
        );
      }

      case "boolean":
        return (
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={field.key}
                checked={value === true}
                onChange={() => handleChange(true)}
                className="h-4 w-4 accent-sky-500"
              />
              <span className="text-sm text-white">
                Yes
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={field.key}
                checked={value === false}
                onChange={() => handleChange(false)}
                className="h-4 w-4 accent-sky-500"
              />
              <span className="text-sm text-white">
                No
              </span>
            </label>
          </div>
        );

      case "textarea":
        return (
          <textarea
            value={safeStringValue(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseInputClass} resize-y`}
          />
        );

      case "address":
        return (
          <AddressAutocomplete
            value={safeStringValue(value)}
            label=""
            placeholder={field.placeholder ?? "Start typing address..."}
            onValueChange={(val) => handleChange(val)}
            onSelect={(selection) => {
              // Set the street address as the field value
              handleChange(selection.street || selection.formattedAddress);
              // Call parent callback to populate city/state/zip
              onAddressSelect?.(selection);
            }}
            className="w-full"
            inputClassName={`
              w-full rounded-lg border bg-slate-800/60 px-3 py-2.5
              text-sm text-white
              placeholder:text-slate-500
              focus:outline-none focus:ring-1 focus:ring-sky-500/20 focus:border-sky-500/70
              transition-all duration-150
              ${error ? "border-red-400/50" : "border-slate-600/40 focus:bg-slate-800/80"}
            `}
          />
        );

      default:
        return (
          <input
            type="text"
            value={safeStringValue(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {field.label}
        {field.required && (
          <span className="ml-0.5 text-red-400">*</span>
        )}
      </label>
      {renderField()}
      {field.helpText && !error && (
        <p className="text-xs text-slate-500">
          {field.helpText}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

export default IntakeFormField;
