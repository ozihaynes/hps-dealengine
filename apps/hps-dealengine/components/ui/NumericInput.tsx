import React, { useEffect, useMemo, useRef, useState } from "react";

export type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function countStepDecimals(step: number): number {
  if (!Number.isFinite(step)) return 0;
  const s = String(step);
  if (s.includes("e-")) {
    const [, exp] = s.split("e-");
    const expNum = Number(exp);
    return Number.isFinite(expNum) ? expNum : 0;
  }
  const idx = s.indexOf(".");
  return idx >= 0 ? s.length - idx - 1 : 0;
}

function formatNumber(value: number, step: number | null): string {
  if (step && step > 0) {
    const decimals = countStepDecimals(step);
    // Normalize float noise at the given step precision.
    const fixed = value.toFixed(decimals);
    // Trim trailing zeros.
    return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  return String(value);
}

export default function NumericInput({
  value,
  onValueChange,
  className = "",
  placeholder = "",
  min,
  max,
  step,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}: NumericInputProps) {
  const [text, setText] = useState<string>(value == null ? "" : String(value));
  const isFocusedRef = useRef(false);

  const minNum = useMemo(() => toNumber(min), [min]);
  const maxNum = useMemo(() => toNumber(max), [max]);
  const stepNum = useMemo(() => {
    const n = toNumber(step);
    return n != null && n > 0 ? n : null;
  }, [step]);

  const allowNegative = minNum == null ? true : minNum < 0;
  const allowedPattern = useMemo(() => {
    return allowNegative ? /^-?[\d,]*\.?\d*$/ : /^[\d,]*\.?\d*$/;
  }, [allowNegative]);

  useEffect(() => {
    // While editing, keep the user-typed text stable.
    if (isFocusedRef.current) return;
    setText(value == null ? "" : String(value));
  }, [value]);

  const clamp = (n: number) => {
    let next = n;
    if (minNum != null) next = Math.max(minNum, next);
    if (maxNum != null) next = Math.min(maxNum, next);
    return next;
  };

  const commit = (raw: string) => {
    const cleaned = raw.replace(/,/g, "").trim();

    // Empty or incomplete -> null.
    if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") {
      onValueChange(null);
      setText("");
      return;
    }

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) {
      onValueChange(null);
      setText("");
      return;
    }

    let next = clamp(parsed);

    // Snap to step *on commit* (blur/enter) to respect precision without fighting typing.
    if (stepNum != null) {
      const snapped = Math.round(next / stepNum) * stepNum;
      const decimals = countStepDecimals(stepNum);
      next = Number(snapped.toFixed(decimals));
    }

    onValueChange(next);
    setText(formatNumber(next, stepNum));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (!allowedPattern.test(raw)) return;

    setText(raw);

    const cleaned = raw.replace(/,/g, "").trim();

    if (cleaned === "") {
      onValueChange(null);
      return;
    }

    // Allow partial numeric states while typing (e.g. "-", "1.", ".5")
    if (cleaned === "-" || cleaned === "." || cleaned === "-." || cleaned.endsWith(".")) {
      return;
    }

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return;

    // Live-update without clamping/step-snapping to avoid fighting user input.
    onValueChange(parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    commit(text);
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    // Preserve prior behavior: highlight the field for quick overwrite.
    e.currentTarget.select();
    onFocus?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Commit on blur for spreadsheet-like UX, without double-committing.
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    }
    onKeyDown?.(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full rounded-md border bg-transparent px-3 py-2 text-base text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-white/20 text-right text-numeric ${className}`}
      {...rest}
    />
  );
}
