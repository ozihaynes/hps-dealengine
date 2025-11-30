// apps/hps-dealengine/app/repairs/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Deal,
  EngineCalculations,
  EstimatorState,
} from "@ui-v2/types";
import RepairsTab from "@/components/repairs/RepairsTab";
import { useDealSession } from "@/lib/dealSessionContext";
import { HPSEngine } from "@/services/engine";
import { estimatorSections } from "../../../../../.tmp/ui-v2/constants";
import {
  useRepairRates,
  type RepairRates,
} from "@/lib/repairRates";

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

/**
 * CRITICAL FIX: Use the ACTUAL section keys from estimatorSections
 */
function createInitialEstimatorState(): EstimatorState {
  const costs: Record<string, Record<string, any>> = {};
  const quantities: Record<string, number> = {};

  for (const [sectionKey, section] of Object.entries(estimatorSections)) {
    costs[sectionKey] = {};

    for (const [itemKey, item] of Object.entries(section.items)) {
      const defaultCondition = item.options
        ? Object.keys(item.options)[0]
        : undefined;

      const defaultCost =
        item.options && defaultCondition
          ? item.options[defaultCondition]
          : 0;

      costs[sectionKey][itemKey] = {
        condition: defaultCondition,
        cost: defaultCost,
        notes: "",
      };

      if (item.isPerUnit) {
        quantities[itemKey] = 0;
      }
    }
  }

  return {
    costs,
    quantities,
  } as EstimatorState;
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
  const { deal, sandbox, setDeal } = useDealSession();

  const [estimatorState, setEstimatorState] = useState<EstimatorState>(() =>
    createInitialEstimatorState(),
  );

  // ADDITION: Local sqft override
  const [localSqft, setLocalSqft] = useState<string>("");

  const marketCode = deriveMarketCode(deal as Deal);
  const { data: rates, status: ratesStatus, error: ratesError, refresh } =
    useRepairRates(marketCode);

  const calc: EngineCalculations = useMemo(() => {
    const result: any = HPSEngine.runEngine({ deal }, sandbox);
    return (result?.calculations ?? {}) as EngineCalculations;
  }, [deal, sandbox]);

  // Get current sqft and set local input if empty
  useEffect(() => {
    const currentSqft = getCurrentSqft(deal as Deal, calc);
    if (currentSqft > 0 && !localSqft) {
      setLocalSqft(String(currentSqft));
    }
  }, [deal, calc, localSqft]);

  const setDealValue = useCallback(
    (path: string, value: unknown) => {
      setDeal((prev) => setDealPath(prev as Deal, path, value));
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
  }, []);

  const handleReset = useCallback(() => {
    setEstimatorState(createInitialEstimatorState());
  }, []);

  const handleSqftSave = () => {
    const sqft = Number(localSqft.replace(/[^\d.]/g, ""));
    if (!isNaN(sqft) && sqft > 0) {
      // Save to deal.property.sqft
      setDealValue("property.sqft", sqft);
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

      {/* Square Footage Input */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-amber-200 mb-1">
              Property Square Footage
            </label>
            <input
              type="number"
              value={localSqft}
              onChange={(e) => setLocalSqft(e.target.value)}
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

      {/* Live repair rates status strip */}
      <div className="rounded-xl border border-border/40 bg-surface/60 px-4 py-3 text-sm">
        {ratesStatus === "loading" && (
          <p className="text-text-secondary">
            Loading live repair rates for {marketCode} market.
          </p>
        )}

        {ratesStatus === "loaded" && rates && (
          <p className="text-text-secondary">
            Using live repair rates as of{" "}
            <span className="font-medium text-white">{rates.asOf}</span> for{" "}
            <span className="font-medium text-white">{rates.market}</span>{" "}
            (v{rates.version}).
            <button
              type="button"
              className="ml-3 text-xs text-accent-blue underline"
              onClick={() => void refresh()}
            >
              Refresh
            </button>
          </p>
        )}

        {ratesStatus === "error" && (
          <p className="text-amber-300">
            Could not load live repair rates
            {ratesError ? `: ${ratesError}` : ""}. Falling back to default
            investor rates in the UI.
            <button
              type="button"
              className="ml-3 text-xs text-accent-blue underline"
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </p>
        )}
      </div>

      <RepairsTab
        deal={deal as Deal}
        setDealValue={setDealValue}
        calc={calc}
        estimatorState={estimatorState}
        onCostChange={handleCostChange}
        onQuantityChange={handleQuantityChange}
        onReset={handleReset}
        repairRates={rates ?? undefined}
        marketCode={marketCode}
        ratesStatus={ratesStatus}
        ratesError={ratesError ?? undefined}
      />
    </div>
  );
}
