// apps/hps-dealengine/app/repairs/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Deal, EngineCalculations, EstimatorState } from "../../../types";
import RepairsTab from "@/components/repairs/RepairsTab";
import { useDealSession } from "@/lib/dealSessionContext";
import { estimatorSections } from "../../../lib/ui-v2-constants";
import type { RepairRates } from "@hps-internal/contracts";
import { createInitialEstimatorState } from "@/lib/repairsEstimator";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import { Button, GlassCard } from "@/components/ui";
import { Check } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Safely set a nested property on the Deal by a dotted path, e.g. "market.arv".
 */
function setDealPath(prev: Deal, path: string, value: unknown): Deal {
  if (!prev || typeof prev !== "object") return prev;

  const clone: any =
    typeof structuredClone === "function"
      ? structuredClone(prev as any)
      : JSON.parse(JSON.stringify(prev));

  const parts = path.split(".");
  let cursor: any = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
  return clone as Deal;
}

/**
 * FIXED: Get current sqft from deal/calc
 */
function getCurrentSqft(deal: Deal, calc: EngineCalculations): number {
  const d = deal as any;
  const c = calc as any;

  const candidates = [
    c?.subject_sqft,
    c?.subject?.sqft,
    c?.property?.sqft,
    d?.property?.sqft,
    d?.subject?.sqft,
    d?.sqft,
  ];

  for (const cand of candidates) {
    if (typeof cand === "number" && !isNaN(cand) && cand > 0) {
      return cand;
    }
    if (typeof cand === "string" && cand.trim() !== "") {
      const n = Number(cand.replace(/[^\d.]/g, ""));
      if (!isNaN(n) && n > 0) {
        return n;
      }
    }
  }
  return 0;
}

function deriveMarketCode(deal: Deal): string {
  const market: any = (deal as any)?.market ?? {};
  return (
    market.market_code ||
    market.market ||
    market.code ||
    market.msa ||
    "ORL"
  );
}

export default function RepairsPage() {
  const {
    deal,
    setDeal,
    posture,
    refreshRepairRates,
    activeRepairProfile,
    activeRepairProfileId,
    lastAnalyzeResult,
    repairRates,
    repairRatesLoading,
    repairRatesError,
  } = useDealSession();
  console.log("[Repairs] render", {
    activeRepairProfileId,
    activeRepairProfileName: activeRepairProfile?.name ?? null,
    repairRates,
  });

  const [estimatorState, setEstimatorState] = useState<EstimatorState>(() =>
    createInitialEstimatorState(),
  );

  const [localSqft, setLocalSqft] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sqftSaved, setSqftSaved] = useState(false);

  useUnsavedChanges(hasUnsavedChanges);

  const marketCode = deriveMarketCode(deal as Deal).toUpperCase();
  const rates: RepairRates | null = repairRates ?? null;
  const ratesStatus: "idle" | "loading" | "loaded" | "error" = repairRatesLoading
    ? "loading"
    : repairRatesError
    ? "error"
    : rates
    ? "loaded"
    : "idle";
  const repairMeta = rates
    ? {
        profileId: rates.profileId ?? null,
        profileName: rates.profileName ?? null,
        marketCode: rates.marketCode ?? marketCode,
        posture: rates.posture ?? posture,
        asOf: rates.asOf ?? undefined,
        source: rates.source ?? null,
        version: rates.version ?? undefined,
      }
    : activeRepairProfile
    ? {
        profileId: activeRepairProfile.id ?? null,
        profileName: activeRepairProfile.name ?? null,
        marketCode: activeRepairProfile.marketCode ?? marketCode,
        posture: activeRepairProfile.posture ?? posture,
        asOf: activeRepairProfile.asOf ?? undefined,
        source: activeRepairProfile.source ?? null,
        version: activeRepairProfile.version ?? undefined,
      }
    : null;
  const profileName =
    repairMeta?.profileName ?? activeRepairProfile?.name;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[RepairsPage] refreshing repair rates", {
        marketCode,
        posture,
        activeRepairProfileId,
      });
    }
    void refreshRepairRates({
      profileId: activeRepairProfileId,
      marketCode,
      posture,
    });
  }, [refreshRepairRates, activeRepairProfileId, marketCode, posture]);

  const calc: EngineCalculations = useMemo(() => {
    const persisted = lastAnalyzeResult as any;
    return {
      ...(persisted?.calculations ?? {}),
      ...(persisted?.outputs ?? {}),
    } as EngineCalculations;
  }, [lastAnalyzeResult]);

  useEffect(() => {
    const currentSqft = getCurrentSqft(deal as Deal, calc);
    if (currentSqft > 0 && !localSqft) {
      setLocalSqft(String(currentSqft));
    }
  }, [deal, calc, localSqft]);

  useEffect(() => {
    setEstimatorState(
      createInitialEstimatorState((rates?.lineItemRates as any) ?? undefined),
    );
    setHasUnsavedChanges(false);
  }, [
    rates?.profileId,
    rates?.marketCode,
    rates?.posture,
    JSON.stringify(rates?.lineItemRates ?? {}),
  ]);

  const setDealValue = useCallback(
    (path: string, value: unknown) => {
      setDeal((prev) => setDealPath(prev as Deal, path, value));
      setHasUnsavedChanges(true);
    },
    [setDeal],
  );

  const handleCostChange = useCallback(
    (
      sectionKey: string,
      itemKey: string,
      field: string,
      value: any,
    ) => {
      setEstimatorState((prev) => {
        const next: any =
          typeof structuredClone === "function"
            ? structuredClone(prev as any)
            : JSON.parse(JSON.stringify(prev));

        if (!next.costs) next.costs = {};
        if (!next.costs[sectionKey]) next.costs[sectionKey] = {};

        const item = (next.costs[sectionKey][itemKey] ?? {}) as any;
        item[field] = value;
        next.costs[sectionKey][itemKey] = item;

        return next;
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handleQuantityChange = useCallback((itemKey: string, qty: number) => {
    setEstimatorState((prev) => {
      const next: any =
        typeof structuredClone === "function"
          ? structuredClone(prev as any)
          : JSON.parse(JSON.stringify(prev));

      if (!next.quantities) next.quantities = {};
      next.quantities[itemKey] = qty;

      return next;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleReset = useCallback(() => {
    setEstimatorState(
      createInitialEstimatorState((rates?.lineItemRates as any) ?? undefined),
    );
    setHasUnsavedChanges(false);
  }, [rates?.lineItemRates]);

  const handleSqftSave = () => {
    const sqft = Number(localSqft.replace(/[^\d.]/g, ""));
    if (!isNaN(sqft) && sqft > 0) {
      setDealValue("property.sqft", sqft);
      setHasUnsavedChanges(false);
    }
  };

  const isNoRepairsNeeded = Boolean((deal as any)?.meta?.noRepairsNeeded);

  const handleMarkNoRepairs = useCallback(() => {
    const next = !Boolean((deal as any)?.meta?.noRepairsNeeded);
    setDealValue("meta.noRepairsNeeded", next);
    if (next) {
      setDealValue("repairs.total", 0);
      setDealValue("repairs_total", 0);
      setDealValue("repairsTotal", 0);
      setDealValue("quickEstimate.total", 0);
    }
    setEstimatorState((prev) => {
      const next: any =
        typeof structuredClone === "function"
          ? structuredClone(prev as any)
          : JSON.parse(JSON.stringify(prev));
      if (next) {
        next.costs = {};
        next.quantities = {};
      }
      return next;
    });
    setHasUnsavedChanges(true);
  }, [deal, setDealValue]);

  const effectiveSqft = getCurrentSqft(deal as Deal, calc) || Number(localSqft) || 0;
  const handleSqftChange = useCallback(
    (value: string) => {
      setLocalSqft(value);
      const sqft = Number(value.replace(/[^\d.]/g, ""));
      if (!isNaN(sqft) && sqft > 0) {
        setDealValue("property.sqft", sqft);
        setHasUnsavedChanges(false);
        setSqftSaved(true);
      } else {
        setHasUnsavedChanges(true);
        setSqftSaved(false);
      }
    },
    [setDealValue],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Repairs
          </h1>
          <Tooltip
            content="Quick PSF tiers, Big 5 budget killers, and a detailed line-item estimator, all wired to the same deal session as Underwrite."
            side="top"
            align="start"
          >
            <button
              type="button"
              aria-label="Repairs info"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-text-secondary transition hover:border-white/25 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
            >
              i
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant={isNoRepairsNeeded ? "primary" : "neutral"}
            size="sm"
            className="mt-1 flex items-center gap-2"
            onClick={handleMarkNoRepairs}
          >
            {isNoRepairsNeeded && <Check size={14} />}
            No Repairs Needed
          </Button>
          {isNoRepairsNeeded && (
            <span className="text-[12px] text-emerald-200">Repairs are set to $0</span>
          )}
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-white">
            <span>Property Square Footage</span>
            <Tooltip
              content="Square footage is required for Quick Estimate calculator. Please enter it above."
              side="top"
              align="start"
            >
              <button
                type="button"
                aria-label="Square footage info"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-text-secondary transition hover:border-white/25 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
              >
                i
              </button>
            </Tooltip>
            {sqftSaved && <Check size={14} className="text-emerald-400" aria-hidden="true" />}
          </label>
          <input
            type="number"
            value={localSqft}
            onChange={(e) => handleSqftChange(e.target.value)}
            placeholder="Enter sqft"
            className="w-32 rounded-md border bg-transparent px-2 py-1 text-sm text-white placeholder:text-text-secondary/70 focus:outline-none"
            style={{ borderColor: "var(--accent-color)" }}
          />
        </div>
      </GlassCard>

      <RepairsTab
        key={rates?.profileId ?? "repairs-tab"}
        deal={deal as Deal}
        setDealValue={setDealValue}
        calc={calc}
        estimatorState={estimatorState}
        onCostChange={handleCostChange}
        onQuantityChange={handleQuantityChange}
        onReset={handleReset}
        repairRates={rates ?? undefined}
        marketCode={repairMeta?.marketCode ?? marketCode}
        activeProfileName={
          repairMeta?.profileName ??
          activeRepairProfile?.name ??
          undefined
        }
        posture={repairMeta?.posture ?? posture}
        ratesStatus={ratesStatus}
        ratesError={repairRatesError ?? undefined}
        meta={repairMeta ?? undefined}
      />
    </div>
  );
}
