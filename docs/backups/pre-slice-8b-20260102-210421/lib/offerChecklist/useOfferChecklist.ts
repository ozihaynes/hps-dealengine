"use client";

import { useEffect, useMemo, useState } from "react";
import { deriveOfferChecklist } from "./derive";
import { computeEditedFieldsSinceRun } from "./editDiff";
import { useDealSession } from "../dealSessionContext";
import { listEvidence, type Evidence } from "../evidence";

/**
 * Scenario type passed into the checklist. Ideally this comes from engine output
 * (e.g., recommended disposition on the last Analyze run).
 */
export type OfferScenario = "flip" | "wholetail" | "as_is";

export function useOfferChecklist(dealId: string | null) {
  const { deal, lastAnalyzeResult } = useDealSession();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    setEvidenceError(null);
    setEvidenceLoading(true);
    listEvidence({ dealId })
      .then(setEvidence)
      .catch((err) => setEvidenceError(err.message))
      .finally(() => setEvidenceLoading(false));
  }, [dealId]);

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
        run: (() => {
          // Backfill payoff evidence + deal fields into the run surface for checklist derivation
          const payoffEvidence = evidence.filter((e) => e.kind === "payoff_letter");
          const newestPayoff = payoffEvidence.length
            ? payoffEvidence.reduce((latest, row) => {
                const ts = Date.parse(row.updatedAt ?? row.createdAt);
                return ts > latest.ts ? { ts, row } : latest;
              }, { ts: -Infinity, row: payoffEvidence[0] }).row
            : null;
          const payoffPresent = payoffEvidence.length > 0;
          const payoffGoodThru = newestPayoff?.updatedAt ?? newestPayoff?.createdAt ?? null;
          const runOutput = (run as any)?.output ?? {};
          const mergedOutput = {
            ...runOutput,
            payoffLetterPresent: runOutput.payoffLetterPresent ?? payoffPresent,
            goodThruDate: runOutput.goodThruDate ?? payoffGoodThru,
          };
          return {
            ...(run ?? {}),
            output: mergedOutput,
            input_snapshot: (run as any)?.input_snapshot ?? deal ?? null,
          };
        })(),
        scenario,
        editedFieldsSinceRun,
      }),
    [run, scenario, editedFieldsSinceRun, evidence, deal],
  );

  return {
    checklist,
    isLoading: evidenceLoading,
    error: evidenceError,
    deal,
    editedFields: editedFieldsSinceRun,
  };
}
