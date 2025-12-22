// apps/hps-dealengine/app/repairs/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { computeSectionTotals } from "@/lib/repairsMath";
import { AutosaveIndicator } from "@/components/shared/AutosaveIndicator";

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

const USD_0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const USD_2 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function fmtUsd0(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number.isFinite(value) ? USD_0.format(value) : "—";
}

function fmtUsd2(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number.isFinite(value) ? USD_2.format(value) : "—";
}

function fmtInt(value: number | null | undefined): string {
  if (value == null) return "-";
  return Number.isFinite(value) ? String(Math.round(value)) : "-";
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
    dbDeal,
    autosaveStatus,
    saveWorkingStateNow,
  } = useDealSession();
  console.log("[Repairs] render", {
    activeRepairProfileId,
    activeRepairProfileName: activeRepairProfile?.name ?? null,
    repairRates,
  });

  const [estimatorState, setEstimatorState] = useState<EstimatorState>(() =>
    createInitialEstimatorState(),
  );
  const estimatorHydratedKeyRef = useRef<string | null>(null);

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
    const currentProfile = rates?.profileId ?? activeRepairProfileId ?? "default";
    const hydrationKey = `${dbDeal?.id ?? "none"}|${currentProfile}`;
    if (estimatorHydratedKeyRef.current === hydrationKey) return;

    const savedEstimator = (deal as any)?.repairs?.estimatorState;
    const savedProfileId = (deal as any)?.repairs?.estimatorProfileId ?? null;

    if (savedEstimator && savedProfileId === currentProfile) {
      setEstimatorState(savedEstimator as EstimatorState);
    } else {
      setEstimatorState(
        createInitialEstimatorState((rates?.lineItemRates as any) ?? undefined),
      );
    }
    setHasUnsavedChanges(false);
    estimatorHydratedKeyRef.current = hydrationKey;
  }, [
    dbDeal?.id,
    rates?.profileId,
    rates?.marketCode,
    rates?.posture,
    rates?.lineItemRates,
    activeRepairProfileId,
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

  const quickEstimateApplied = (deal as any)?.repairs?.quickEstimate?.total ?? null;

  const { sectionTotals, totalRepairCost } = useMemo(
    () =>
      computeSectionTotals(
        estimatorState.costs,
        estimatorState.quantities,
        (rates?.lineItemRates as any) ?? undefined,
      ),
    [estimatorState, rates?.lineItemRates],
  );

  useEffect(() => {
    const profileIdToPersist = rates?.profileId ?? activeRepairProfileId ?? null;
    const appliedTotal =
      totalRepairCost > 0
        ? totalRepairCost
        : quickEstimateApplied != null
        ? Number(quickEstimateApplied)
        : 0;

    const currentApplied = (deal as any)?.costs?.repairs_base ?? null;
    const savedEstimator = (deal as any)?.repairs?.estimatorState;
    const savedProfileId = (deal as any)?.repairs?.estimatorProfileId ?? null;

    const estimatorChanged =
      JSON.stringify(savedEstimator ?? {}) !==
      JSON.stringify(estimatorState ?? {});
    const shouldUpdateTotals = currentApplied !== appliedTotal;
    const shouldUpdateProfile = savedProfileId !== profileIdToPersist;

    if (!(shouldUpdateTotals || estimatorChanged || shouldUpdateProfile)) {
      return;
    }

    setDealValue("repairs.estimatorState", estimatorState);
    setDealValue("repairs.estimatorProfileId", profileIdToPersist);
    setDealValue("repairs.total", appliedTotal);
    setDealValue("repairs_total", appliedTotal);
    setDealValue("repairsTotal", appliedTotal);
    setDealValue("costs.repairs_base", appliedTotal);
    setDealValue("costs.repairs", appliedTotal);
  }, [
    estimatorState,
    totalRepairCost,
    quickEstimateApplied,
    rates?.profileId,
    activeRepairProfileId,
    setDealValue,
    deal,
  ]);
const resolvedSqft = useMemo(() => {
  const base = getCurrentSqft(deal as Deal, calc);
  if (base > 0) return base;
  const n = Number(String(localSqft ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}, [deal, calc, localSqft]);

const appliedTotal = useMemo(() => {
  if (isNoRepairsNeeded) return 0;
  if (totalRepairCost > 0) return totalRepairCost;
  if (quickEstimateApplied != null) {
    const n = Number(quickEstimateApplied);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}, [isNoRepairsNeeded, totalRepairCost, quickEstimateApplied]);

const repairsPerSqft = useMemo(() => {
  if (!resolvedSqft || resolvedSqft <= 0) return null;
  if (!appliedTotal || appliedTotal <= 0) return null;
  return appliedTotal / resolvedSqft;
}, [appliedTotal, resolvedSqft]);

const sectionBreakdown = useMemo(() => {
  const entries = Object.entries(sectionTotals)
    .map(([key, total]) => ({ key, total }))
    .filter((row) => Number.isFinite(row.total) && row.total > 0.5)
    .sort((a, b) => b.total - a.total);

  return entries;
}, [sectionTotals]);


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
          <AutosaveIndicator
            state={autosaveStatus.state}
            lastSavedAt={autosaveStatus.lastSavedAt}
            error={autosaveStatus.error}
          />
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


<div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
  {/* Left rail (desktop): meta + key inputs/totals. Mobile/tablet remains unchanged. */}
  <div className="lg:col-span-3">
    <div className="space-y-6 lg:sticky lg:top-24">
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
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
            {sqftSaved && (
              <Check
                size={14}
                className="text-emerald-400"
                aria-hidden="true"
              />
            )}
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

        <div className="mt-3 hidden lg:grid lg:grid-cols-2 lg:gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Applied total
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {fmtUsd0(appliedTotal)}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              $ / sqft
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {repairsPerSqft != null ? fmtUsd2(repairsPerSqft) : "—"}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Desktop-only: keep the rail intentional + information-dense */}
      <div className="hidden lg:block space-y-6">
        <GlassCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase text-text-secondary">
                Rate profile
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-text-primary">
                {profileName ?? "Repair rates"}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                {(repairMeta?.marketCode ?? marketCode).toUpperCase()} · posture{" "}
                {(repairMeta?.posture ?? posture) || "base"}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                ratesStatus === "loaded"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : ratesStatus === "loading"
                  ? "border-white/15 bg-white/5 text-text-secondary"
                  : ratesStatus === "error"
                  ? "border-red-400/30 bg-red-400/10 text-red-200"
                  : "border-white/15 bg-white/5 text-text-secondary"
              }`}
            >
              {ratesStatus === "loaded"
                ? "Rates loaded"
                : ratesStatus === "loading"
                ? "Loading"
                : ratesStatus === "error"
                ? "Rates error"
                : "Rates idle"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                As of
              </div>
              <div className="mt-0.5 text-xs text-text-primary">
                {repairMeta?.asOf ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                Source
              </div>
              <div className="mt-0.5 truncate text-xs text-text-primary">
                {repairMeta?.source ?? "—"}
              </div>
            </div>
          </div>

          {repairRatesError && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {repairRatesError}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase text-text-secondary">
                Key totals
              </div>
              <div className="mt-1 text-lg font-semibold text-text-primary">
                {fmtUsd0(appliedTotal)}
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Detailed estimator: {fmtUsd0(totalRepairCost)}
                {quickEstimateApplied != null && totalRepairCost === 0
                  ? ` · Quick estimate: ${fmtUsd0(
                      Number(quickEstimateApplied),
                    )}`
                  : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-text-secondary">
                Sqft
              </div>
              <div className="mt-1 text-sm font-semibold text-text-primary">
                {resolvedSqft > 0 ? fmtInt(resolvedSqft) : "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                Sections
              </div>
              <div className="mt-0.5 text-xs text-text-primary">
                {sectionBreakdown.length}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                Status
              </div>
              <div className="mt-0.5 text-xs text-text-primary">
                {isNoRepairsNeeded ? "No repairs needed" : "Estimator active"}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>

  {/* Center rail: primary repairs workflow */}
  <div className="lg:col-span-6 xl:col-span-7">
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
        repairMeta?.profileName ?? activeRepairProfile?.name ?? undefined
      }
      posture={repairMeta?.posture ?? posture}
      ratesStatus={ratesStatus}
      ratesError={repairRatesError ?? undefined}
      meta={repairMeta ?? undefined}
      onQuickApply={() => {
        void saveWorkingStateNow().catch(() => {
          /* status indicator handles error */
        });
      }}
      onDetailedApply={() => {
        void saveWorkingStateNow().catch(() => {
          /* status indicator handles error */
        });
      }}
    />
  </div>

  {/* Right rail (desktop): breakdown + alerts */}
  <div className="hidden lg:block lg:col-span-3 xl:col-span-2">
    <div className="space-y-6 lg:sticky lg:top-24">
      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase text-text-secondary">
              Breakdown
            </div>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              By section
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-text-secondary">
              Total
            </div>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              {fmtUsd0(totalRepairCost)}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {sectionBreakdown.length === 0 && (
            <div className="text-xs text-text-secondary">
              No detailed line items yet. Use Quick Estimate or add costs to see a breakdown.
            </div>
          )}

          {sectionBreakdown.slice(0, 8).map((row) => {
            const section = (estimatorSections as Record<string, { title?: string; label?: string }>)[row.key];
            const label =
              section?.title ??
              section?.label ??
              row.key.replace(/_/g, " ");
            const pct =
              totalRepairCost > 0
                ? Math.min(100, (row.total / totalRepairCost) * 100)
                : 0;

            return (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-text-secondary">
                    {label}
                  </span>
                  <span className="shrink-0 font-medium text-text-primary">
                    {fmtUsd0(row.total)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent-blue/60"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-xs uppercase text-text-secondary">
          Alerts & sanity checks
        </div>
        <div className="mt-3 space-y-3 text-xs">
          {resolvedSqft <= 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-200">
              Add square footage to unlock accurate Quick Estimate PSF math.
            </div>
          )}
          {ratesStatus === "error" && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-200">
              Repair unit rates failed to load. You can still enter custom costs.
            </div>
          )}
          {isNoRepairsNeeded && (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-200">
              Repairs are marked as $0. Toggle off if you need line items.
            </div>
          )}
          {!isNoRepairsNeeded && appliedTotal === 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-text-secondary">
              Start with Quick Estimate (PSF tiers + Big 5) or add line items to compute totals.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  </div>
</div>
    </div>
  );
}
