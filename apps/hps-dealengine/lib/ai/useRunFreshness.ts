"use client";

import { useMemo } from "react";
import { useDealSession } from "../dealSessionContext";

export type RunFreshnessStatus = "fresh" | "stale" | "noRun" | "unknown";

/**
 * Indicates whether the current UI state has drifted from the last Analyze run.
 * Uses DealSession data (hasUnsavedDealChanges, lastRunAt, dbDeal.updated_at).
 */
export function useRunFreshness(): {
  status: RunFreshnessStatus;
  lastRunAt: string | null;
  lastEditAt: string | null;
} {
  const { hasUnsavedDealChanges, lastRunAt, dbDeal, lastRunId } = useDealSession();
  const lastEditAt = (dbDeal as any)?.updated_at ?? null;

  return useMemo(() => {
    if (!lastRunId) {
      return { status: "noRun" as RunFreshnessStatus, lastRunAt: null, lastEditAt };
    }

    if (hasUnsavedDealChanges) {
      return { status: "stale" as RunFreshnessStatus, lastRunAt, lastEditAt };
    }

    if (lastRunAt && lastEditAt) {
      const runTs = new Date(lastRunAt).getTime();
      const editTs = new Date(lastEditAt).getTime();
      if (!Number.isNaN(runTs) && !Number.isNaN(editTs)) {
        return {
          status: editTs > runTs ? ("stale" as RunFreshnessStatus) : ("fresh" as RunFreshnessStatus),
          lastRunAt,
          lastEditAt,
        };
      }
    }

    if (lastRunAt) {
      return { status: "fresh" as RunFreshnessStatus, lastRunAt, lastEditAt };
    }

    return { status: "unknown" as RunFreshnessStatus, lastRunAt, lastEditAt };
  }, [hasUnsavedDealChanges, lastEditAt, lastRunAt, lastRunId]);
}
