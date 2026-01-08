import React from "react";
import AddressAutocomplete, { type AddressSelection } from "../ui/AddressAutocomplete";
import type { NewDealFormState } from "@/lib/deals";
import { CheckIcon, Loader2Icon, UserIcon, HomeIcon } from "lucide-react";

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

// Section header - refined, minimal with Lucide icons
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// Shared input classes - refined, premium feel
const inputClasses = `
  w-full
  h-11
  px-3.5
  bg-slate-800/60
  border border-slate-600/40
  rounded-lg
  text-sm text-white
  placeholder:text-slate-500
  transition-all duration-150
  focus:outline-none
  focus:border-sky-500/70
  focus:ring-1
  focus:ring-sky-500/20
  focus:bg-slate-800/80
`;

// Form field wrapper
function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

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

  const handleAddressSelect = (selection: AddressSelection) => {
    onChange({
      ...values,
      propertyStreet: selection.street || selection.formattedAddress,
      propertyCity: selection.city || values.propertyCity,
      propertyState: selection.state || values.propertyState,
      propertyPostalCode: selection.postalCode || values.propertyPostalCode,
    });
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {/* Client Information Section */}
      <section>
        <SectionHeader icon={UserIcon} title="Client Information" />
        <div className="space-y-4">
          <FormField label="Client Name" required>
            <input
              type="text"
              value={values.clientName}
              onChange={update("clientName")}
              placeholder="Enter client full name"
              className={inputClasses}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone Number">
              <input
                type="tel"
                value={values.clientPhone}
                onChange={update("clientPhone")}
                placeholder="(555) 000-0000"
                className={inputClasses}
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={values.clientEmail}
                onChange={update("clientEmail")}
                placeholder="client@email.com"
                className={inputClasses}
              />
            </FormField>
          </div>
        </div>
      </section>

      {/* Property Information Section */}
      <section>
        <SectionHeader icon={HomeIcon} title="Property Information" />
        <div className="space-y-4">
          <FormField label="Property Street" required>
            <AddressAutocomplete
              label=""
              value={values.propertyStreet}
              onValueChange={(next) => onChange({ ...values, propertyStreet: next })}
              onSelect={handleAddressSelect}
              placeholder="Search for an address"
              inputClassName={`
                !h-11
                !px-3.5
                !bg-slate-800/60
                !border-slate-600/40
                !rounded-lg
                !text-sm !text-white
                !placeholder:text-slate-500
                !transition-all !duration-150
                focus:!outline-none
                focus:!border-sky-500/70
                focus:!ring-1
                focus:!ring-sky-500/20
                focus:!bg-slate-800/80
              `}
            />
          </FormField>
          <div className="grid grid-cols-[1fr_80px_100px] gap-3">
            <FormField label="City">
              <input
                type="text"
                value={values.propertyCity}
                onChange={update("propertyCity")}
                placeholder="City"
                className={inputClasses}
              />
            </FormField>
            <FormField label="State">
              <input
                type="text"
                value={values.propertyState}
                onChange={update("propertyState")}
                placeholder="FL"
                className={inputClasses}
              />
            </FormField>
            <FormField label="ZIP">
              <input
                type="text"
                value={values.propertyPostalCode}
                onChange={update("propertyPostalCode")}
                placeholder="00000"
                className={inputClasses}
              />
            </FormField>
          </div>
        </div>
      </section>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Footer with action buttons */}
      <div className="pt-4 border-t border-slate-700/30 flex justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="
              px-4 py-2
              text-sm font-medium
              text-slate-300
              hover:text-white
              hover:bg-slate-700/50
              rounded-lg
              transition-colors
            "
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="
            px-5 py-2
            text-sm font-medium
            text-white
            bg-sky-600
            hover:bg-sky-500
            rounded-lg
            shadow-lg shadow-sky-500/20
            transition-all duration-150
            disabled:opacity-50
            disabled:cursor-not-allowed
            flex items-center gap-2
          "
        >
          {submitting ? (
            <>
              <Loader2Icon className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default NewDealForm;
