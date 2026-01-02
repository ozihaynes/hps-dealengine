"use client";

import React, { useMemo } from "react";
import type { IntakeSectionApi, IntakeFieldApi } from "@/lib/intakePublic";
import { IntakeFormField } from "./IntakeFormField";

type IntakeFormSectionProps = {
  section: IntakeSectionApi;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
};

/**
 * Check if a field's condition is satisfied based on current form values.
 * Returns true if the field should be shown.
 */
function isFieldVisible(field: IntakeFieldApi, values: Record<string, unknown>): boolean {
  // If no condition, always visible
  if (!field.condition) {
    return true;
  }

  const { field: conditionField, equals: conditionValue } = field.condition;
  const currentValue = values[conditionField];

  // Handle boolean comparison
  if (typeof conditionValue === "boolean") {
    return currentValue === conditionValue;
  }

  // Handle string/value comparison
  return currentValue === conditionValue;
}

export function IntakeFormSection({
  section,
  values,
  errors,
  onChange,
}: IntakeFormSectionProps) {
  // Filter fields based on their conditions
  const visibleFields = useMemo(() => {
    return (section.fields ?? []).filter((field) => isFieldVisible(field, values));
  }, [section.fields, values]);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
          {section.title}
        </h2>
        {section.description && (
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            {section.description}
          </p>
        )}
      </div>

      {/* Fields - only show visible fields based on conditions */}
      <div className="space-y-4">
        {visibleFields.map((field) => (
          <IntakeFormField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={onChange}
            error={errors[field.key]}
          />
        ))}
      </div>
    </div>
  );
}

export default IntakeFormSection;
