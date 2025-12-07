import React from "react";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | null | undefined;
  onValueChange?: (value: number | null) => void;
}

/**
 * Lightweight numeric input that treats empty as truly empty (null) and
 * never propagates NaN. Uses type="text" + inputMode="decimal" to avoid
 * browser number quirks while keeping mobile numeric keyboards.
 */
export function NumericInput({
  value,
  onValueChange,
  onFocus,
  className = "",
  ...rest
}: NumericInputProps) {
  const displayValue =
    typeof value === "number" && !Number.isNaN(value) ? String(value) : "";

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={`dark-input ${className}`}
      value={displayValue}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw.trim() === "") {
          onValueChange?.(null);
          return;
        }
        const next = Number(raw.replace(/,/g, ""));
        if (Number.isNaN(next)) {
          return;
        }
        onValueChange?.(next);
      }}
      onFocus={(event) => {
        event.target.select();
        if (typeof onFocus === "function") {
          onFocus(event);
        }
      }}
    />
  );
}

export default NumericInput;
