"use client";

import React from "react";
import type { IntakeFieldApi } from "@/lib/intakePublic";

type IntakeFormFieldProps = {
  field: IntakeFieldApi;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  error?: string;
};

export function IntakeFormField({
  field,
  value,
  onChange,
  error,
}: IntakeFormFieldProps) {
  const handleChange = (newValue: unknown) => {
    onChange(field.key, newValue);
  };

  const baseInputClass = `
    w-full rounded-lg border bg-[color:var(--glass-bg)] px-3 py-2
    text-sm text-[color:var(--text-primary)]
    placeholder:text-[color:var(--text-secondary)]/50
    focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-blue)]/50
    transition-all
    ${error ? "border-red-400/50" : "border-white/10 focus:border-[color:var(--accent-blue)]/50"}
  `;

  const renderField = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <input
            type={field.type === "phone" ? "tel" : field.type}
            value={(value as string) ?? ""}
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-secondary)]">
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
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            className={baseInputClass}
          />
        );

      case "select":
        return (
          <select
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">
              {field.placeholder ?? "Select an option..."}
            </option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={field.key}
                checked={value === true}
                onChange={() => handleChange(true)}
                className="h-4 w-4 accent-[color:var(--accent-blue)]"
              />
              <span className="text-sm text-[color:var(--text-primary)]">
                Yes
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={field.key}
                checked={value === false}
                onChange={() => handleChange(false)}
                className="h-4 w-4 accent-[color:var(--accent-blue)]"
              />
              <span className="text-sm text-[color:var(--text-primary)]">
                No
              </span>
            </label>
          </div>
        );

      case "textarea":
        return (
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseInputClass} resize-y`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[color:var(--text-primary)]">
        {field.label}
        {field.required && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </label>
      {renderField()}
      {field.helpText && !error && (
        <p className="text-xs text-[color:var(--text-secondary)]">
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
