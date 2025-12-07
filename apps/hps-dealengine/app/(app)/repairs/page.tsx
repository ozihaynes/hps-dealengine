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

  const effectiveSqft = getCurrentSqft(deal as Deal, calc) || Number(localSqft) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Repairs
        </h1>
        <p className="mt-1 text-sm text-text-secondary/80">
          Quick PSF tiers, Big 5 budget killers, and a detailed line-item
          estimator, all wired to the same deal session as Underwrite.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-amber-200 mb-1">
              Property Square Footage
            </label>
            <input
              type="number"
              value={localSqft}
              onChange={(e) => {
                setLocalSqft(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Enter sqft (e.g., 1500)"
              className="w-full px-3 py-2 bg-surface/80 border border-border/40 rounded-lg text-white"
            />
          </div>
          <button
            onClick={handleSqftSave}
            className="mt-5 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium"
          >
            Save to Deal
          </button>
        </div>
        {effectiveSqft === 0 && (
          <p className="mt-2 text-xs text-amber-300">
            Square footage is required for Quick Estimate calculator. Please enter it above.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border/40 bg-surface/60 px-4 py-3 text-sm">
        {ratesStatus === "loading" && (
          <p className="text-text-secondary">
            Loading live repair rates for {marketCode} market.
          </p>
        )}

        {ratesStatus === "idle" && (
          <p className="text-amber-200">
            No live repair profile loaded yet for {marketCode}/{posture}. Activate a profile
            in Repairs Sandbox and sync to DealSession.
          </p>
        )}

        {ratesStatus === "loaded" && rates && (
          <p className="text-text-secondary">
            Using{" "}
            <span className="font-medium text-white">
              {profileName ?? "Active Profile"}
            </span>{" "}
            ({rates.posture}) in{" "}
            <span className="font-medium text-white">
              {rates.marketCode}
            </span>{" "}
            as of{" "}
            <span className="font-medium text-white">{rates.asOf}</span>{" "}
            - source {rates.source ?? "unknown"}, v{rates.version}.
            <button
              type="button"
              className="ml-3 text-xs text-accent-blue underline"
              onClick={() => void refreshRepairRates()}
            >
              Refresh
            </button>
          </p>
        )}

        {ratesStatus === "error" && (
          <div className="text-amber-300 space-y-1">
            <p>
              Could not load live repair rates for {marketCode}/{posture}.
              {repairRatesError ? ` ${repairRatesError}` : ""}
            </p>
            <p className="text-xs text-amber-200">
              No rates will be applied until a profile is active for this org/market/posture.
              Use Repairs Sandbox to activate one, then sync.
            </p>
            <button
              type="button"
              className="text-xs text-accent-blue underline"
              onClick={() => void refreshRepairRates()}
            >
              Retry
            </button>
          </div>
        )}
      </div>

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
