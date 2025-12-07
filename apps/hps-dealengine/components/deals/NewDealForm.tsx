import React from "react";
import { Button, InputField } from "../ui";
import type { NewDealFormState } from "@/lib/deals";

type NewDealFormProps = {
  values: NewDealFormState;
  onChange: (next: NewDealFormState) => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  error?: string | null;
  onCancel?: () => void;
  cancelLabel?: string;
};

export function NewDealForm({
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel = "Start Deal",
  error,
  onCancel,
  cancelLabel = "Cancel",
}: NewDealFormProps) {
  const update = (key: keyof NewDealFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [key]: e.target.value });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-3">
        <InputField
          label="Client Name"
          value={values.clientName}
          onChange={update("clientName")}
          placeholder="Enter client full name"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InputField
            label="Phone Number"
            value={values.clientPhone}
            onChange={update("clientPhone")}
            placeholder="(555) 000-0000"
          />
          <InputField
            label="Email"
            type="email"
            value={values.clientEmail}
            onChange={update("clientEmail")}
            placeholder="client@email.com"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <InputField
          label="Property Street"
          value={values.propertyStreet}
          onChange={update("propertyStreet")}
          placeholder="Street address"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InputField
            label="City"
            value={values.propertyCity}
            onChange={update("propertyCity")}
            placeholder="City"
          />
          <InputField
            label="State"
            value={values.propertyState}
            onChange={update("propertyState")}
            placeholder="State"
          />
          <InputField
            label="ZIP"
            value={values.propertyPostalCode}
            onChange={update("propertyPostalCode")}
            placeholder="ZIP"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel ? (
          <Button
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              onCancel();
            }}
          >
            {cancelLabel}
          </Button>
        ) : null}
        <Button variant="primary" disabled={submitting}>
          {submitting ? "Creating..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default NewDealForm;
