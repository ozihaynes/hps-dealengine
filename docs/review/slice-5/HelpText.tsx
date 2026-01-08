"use client";

import { type ReactNode, memo } from "react";
import { HelpTooltip } from "./HelpTooltip";

interface HelpTextProps {
  /** Help content to display */
  children: ReactNode;
  /** Display variant */
  variant?: "icon" | "text" | "inline";
}

/**
 * Help text indicator with tooltip
 *
 * Icon variant uses 44px touch target for mobile accessibility.
 */
export const HelpText = memo(function HelpText({
  children,
  variant = "icon",
}: HelpTextProps) {
  if (variant === "inline") {
    return (
      <span className="text-xs text-slate-500 ml-1" role="note">
        {children}
      </span>
    );
  }

  if (variant === "text") {
    return (
      <p className="text-xs text-slate-500 mt-1" role="note">
        {children}
      </p>
    );
  }

  // Icon variant with 44px touch target (WCAG compliant)
  return (
    <HelpTooltip content={children} position="top">
      <button
        type="button"
        className="inline-flex items-center justify-center w-11 h-11 -m-3.5 text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50 rounded-full"
        aria-label="Help information"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </HelpTooltip>
  );
});

interface LabelWithHelpProps {
  /** Label text */
  label: string;
  /** ID of the associated input */
  htmlFor?: string;
  /** Help text content */
  help?: string;
  /** Whether field is required */
  required?: boolean;
}

/**
 * Label with integrated help tooltip
 *
 * @example
 * <LabelWithHelp
 *   label="Display Name"
 *   htmlFor="display-name"
 *   help="This name will be shown to other team members"
 *   required
 * />
 */
export const LabelWithHelp = memo(function LabelWithHelp({
  label,
  htmlFor,
  help,
  required = false,
}: LabelWithHelpProps) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">
        {label}
        {required && (
          <span className="text-red-400 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>
      {help && <HelpText>{help}</HelpText>}
    </div>
  );
});
