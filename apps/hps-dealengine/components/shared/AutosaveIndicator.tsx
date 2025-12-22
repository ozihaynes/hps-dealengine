import React from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type AutosaveState = "idle" | "saving" | "saved" | "error";

export function AutosaveIndicator({
  state,
  lastSavedAt,
  error,
}: {
  state: AutosaveState;
  lastSavedAt?: string | null;
  error?: string | null;
}) {
  const label =
    state === "saving"
      ? "Saving..."
      : state === "saved"
      ? lastSavedAt
        ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
        : "Saved"
      : state === "error"
      ? "Autosave failed"
      : "Autosave ready";

  const icon =
    state === "saving" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : state === "saved" ? (
      <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
    ) : state === "error" ? (
      <AlertCircle className="h-3.5 w-3.5 text-accent-orange" />
    ) : null;

  const tooltip = state === "error" && error ? error : undefined;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-secondary"
      title={tooltip}
      data-testid="autosave-status"
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
