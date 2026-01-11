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
      className="inline-flex items-center gap-1.5 text-xs text-slate-400"
      title={tooltip}
      data-testid="autosave-status"
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
