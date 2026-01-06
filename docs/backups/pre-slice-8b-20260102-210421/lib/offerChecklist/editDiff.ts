"use client";

import type { AnalyzeInput } from "@hps-internal/contracts";

/**
 * Compute which field keys have changed between the current underwriting inputs
 * and the input snapshot associated with the last Analyze run.
 *
 * We intentionally keep this shallow and keyed by the same string names used
 * in the checklist schema's `fields` arrays (e.g. 'arvEstimate', 'repairsTotal').
 */
export function computeEditedFieldsSinceRun(
  current: AnalyzeInput | null | undefined,
  snapshot: AnalyzeInput | null | undefined,
): Set<string> {
  const edited = new Set<string>();

  if (!current || !snapshot) {
    // With no snapshot we say "no edited fields" — the stale banner logic will still
    // treat "no run" separately. We don't want every field to be considered "edited"
    // just because there's no prior run.
    return edited;
  }

  const keys = new Set<string>([
    ...Object.keys(current as Record<string, unknown>),
    ...Object.keys(snapshot as Record<string, unknown>),
  ]);

  for (const key of keys) {
    const currVal = (current as any)[key];
    const snapVal = (snapshot as any)[key];

    // To avoid false positives from different object identity, stringify primitives.
    const currNorm =
      currVal !== null && typeof currVal === "object"
        ? currVal
        : currVal === undefined
          ? null
          : String(currVal);
    const snapNorm =
      snapVal !== null && typeof snapVal === "object"
        ? snapVal
        : snapVal === undefined
          ? null
          : String(snapVal);

    if (JSON.stringify(currNorm) !== JSON.stringify(snapNorm)) {
      edited.add(key);
    }
  }

  return edited;
}
