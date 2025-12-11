"use client";

import { useMemo } from "react";
import { deriveOfferChecklist } from "./derive";
import { computeEditedFieldsSinceRun } from "./editDiff";
import { useDealSession } from "../dealSessionContext";

/**
 * Scenario type passed into the checklist. Ideally this comes from engine output
 * (e.g., recommended disposition on the last Analyze run).
 */
export type OfferScenario = "flip" | "wholetail" | "as_is";

export function useOfferChecklist(dealId: string | null) {
  const { deal, lastAnalyzeResult } = useDealSession();

  const run: any = lastAnalyzeResult ?? null;

  const scenario: OfferScenario = useMemo(() => {
    if (!run) return "flip";

    const disposition = (run as any).output?.disposition ?? (run as any).output?.strategy ?? null;
    const recommended = disposition?.recommended ?? disposition?.type ?? null;

    if (!recommended) return "flip";

    const lower = String(recommended).toLowerCase();
    if (lower.includes("wholetail")) return "wholetail";
    if (lower.includes("as_is") || lower.includes("as-is") || lower.includes("as is")) {
      return "as_is";
    }
    return "flip";
  }, [run]);

  const editedFieldsSinceRun = useMemo(
    () =>
      computeEditedFieldsSinceRun(
        (deal as any) ?? null,
        run ? ((run as any).input_snapshot ?? null) : null,
      ),
    [deal, run],
  );

  const checklist = useMemo(
    () =>
      deriveOfferChecklist({
        run,
        scenario,
        editedFieldsSinceRun,
      }),
    [run, scenario, editedFieldsSinceRun],
  );

  return {
    checklist,
    isLoading: false,
    error: null as string | null,
    deal,
    editedFields: editedFieldsSinceRun,
  };
}
