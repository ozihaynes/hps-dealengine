import React, { InputHTMLAttributes } from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix"> {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  helper,
  prefix,
  suffix,
  className = "",
  ...props
}) => {
  const hasPrefix = Boolean(prefix);
  const hasSuffix = Boolean(suffix);
  const validationClass = error ? "input-error" : success ? "input-success" : "";

  return (
    <div className="w-full">
      {label ? (
        <label className="block mb-2 text-sm font-medium text-text-primary">{label}</label>
      ) : null}

      <div className={`input-wrapper ${hasPrefix ? "has-prefix" : ""} ${hasSuffix ? "has-suffix" : ""}`}>
        {hasPrefix ? <span className="input-prefix">{prefix}</span> : null}
        <input className={`input-base ${validationClass} ${className}`} {...props} />
        {hasSuffix ? <span className="input-suffix">{suffix}</span> : null}
      </div>

      {error ? (
        <p className="input-error-message mt-1">{error}</p>
      ) : success ? (
        <p className="input-success-message mt-1">{success}</p>
      ) : helper ? (
        <p className="input-helper mt-1">{helper}</p>
      ) : null}
    </div>
  );
};
