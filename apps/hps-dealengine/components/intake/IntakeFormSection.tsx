"use client";

import React from "react";
import type { IntakeSectionApi } from "@/lib/intakePublic";
import { IntakeFormField } from "./IntakeFormField";

type IntakeFormSectionProps = {
  section: IntakeSectionApi;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
};

export function IntakeFormSection({
  section,
  values,
  errors,
  onChange,
}: IntakeFormSectionProps) {
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

      {/* Fields */}
      <div className="space-y-4">
        {(section.fields ?? []).map((field) => (
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
