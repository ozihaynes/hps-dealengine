import React from "react";
import { getGlossaryEntry, type GlossaryKey } from "@/lib/glossary";
import { Tooltip } from "./tooltip";

export interface InfoTooltipProps {
  helpKey: GlossaryKey;
  className?: string;
  /** Optional override for aria-label on the icon button */
  ariaLabel?: string;
}

export function InfoTooltip({
  helpKey,
  className = "",
  ariaLabel,
}: InfoTooltipProps): JSX.Element | null {
  const entry = getGlossaryEntry(helpKey);
  if (!entry) return null;

  const label =
    ariaLabel ??
    (entry.shortLabel
      ? `What does ${entry.shortLabel} mean?`
      : `What does ${entry.term} mean?`);

  return (
    <Tooltip content={entry.description} side="top" align="start">
      <button
        type="button"
        aria-label={label}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-text-secondary transition hover:border-white/25 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/60 ${className}`}
      >
        i
      </button>
    </Tooltip>
  );
}
