"use client";

// Underwrite header/actions live here; main form is components/underwrite/UnderwriteTab.tsx and overrides UI lives in components/underwrite/OverridesPanel.tsx + components/underwrite/RequestOverrideModal.tsx.

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UnderwriteTab from "@/components/underwrite/UnderwriteTab";
import { Button } from "@/components/ui";
import RequestOverrideModal from "@/components/underwrite/RequestOverrideModal";
import { useDealSession } from "@/lib/dealSessionContext";
import type { Deal } from "../../../types";
import { Tooltip } from "@/components/ui/tooltip";
import { AutosaveIndicator } from "@/components/shared/AutosaveIndicator";

import { getSupabase } from "@/lib/supabaseClient";
import { publishAnalyzeResult } from "@/lib/analyzeBus";
import { analyze, saveRun } from "@/lib/edge";
import { EvidenceUpload } from "@/components/shared/EvidenceUpload";
import OverridesPanel from "@/components/underwrite/OverridesPanel";
import {
  buildAnalyzeRequestPayload,
  mergePostureAwareValues,
} from "@/lib/sandboxPolicy";
import { listEvidence } from "@/lib/evidence";
import {
  buildEvidenceStatus,
  evidenceLabel,
  type EvidenceKind,
} from "@/lib/evidenceFreshness";
import { canEditGoverned } from "@/constants/governedTokens";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import { Info, CheckCircle } from "lucide-react";
import {
  fetchLatestValuationRun,
  invokeValuationRun,
  type ValuationRunResponse,
  applySuggestedArv,
  overrideMarketValue,
} from "@/lib/valuation";
import type { PropertySnapshot, ValuationRun } from "@hps-internal/contracts";

type RunSaveResponse =
  | {
      ok: true;
      run: {
        id: string;
        org_id: string;
        posture: string;
        input_hash?: string | null;
        output_hash?: string | null;
        policy_hash?: string | null;
        created_at: string;
      };
      deduped?: boolean;
    }
  | {
      ok: false;
      error:
        | string
        | {
            message?: string;
            code?: string;
            details?: unknown;
            issues?: unknown;
          };
    };

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

export default function UnderwritePage() {
  const supabase = getSupabase();

  const {
    deal,
    sandbox,
    setDeal,
    setLastAnalyzeResult,
    lastAnalyzeResult,
    lastRunId,
  setLastRunId,
  setLastRunAt,
  dbDeal,
  setDbDeal,
  posture,
  sandboxLoading,
  sandboxError,
    repairRates,
    membershipRole,
    hasUnsavedDealChanges,
    setHasUnsavedDealChanges,
    autosaveStatus,
  } = useDealSession();
  const [orgId, setOrgId] = useState<string>("");
  const canEditPolicy = useMemo(
    () => canEditGoverned(membershipRole),
    [membershipRole],
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const [saveRunStatus, setSaveRunStatus] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overridePrefill, setOverridePrefill] = useState<{
    tokenKey: string;
    newValue: unknown;
    oldValue: unknown;
  } | null>(null);
  const [overrideRefreshKey, setOverrideRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [evidenceStatus, setEvidenceStatus] = useState<
    ReturnType<typeof buildEvidenceStatus>
  >([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const checklistRef = useRef<HTMLDivElement | null>(null);
  const [valuationRun, setValuationRun] = useState<ValuationRun | null>(null);
  const [valuationSnapshot, setValuationSnapshot] = useState<PropertySnapshot | null>(null);
  const [minClosedComps, setMinClosedComps] = useState<number | null>(null);
  const [isRefreshingValuation, setIsRefreshingValuation] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);
  const [valuationStatus, setValuationStatus] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [applyingSuggestedArv, setApplyingSuggestedArv] = useState(false);
  const hasPrefilledArvRef = useRef(false);
  useUnsavedChanges(hasUnsavedDealChanges);

  // Load org_id:
  // 1) Prefer the selected dbDeal.org_id (from /deals)
  // 2) Fallback to first memberships row if no deal is selected
  useEffect(() => {
    let cancelled = false;

    // If we have a selected deal in session, trust its org_id
    if (dbDeal?.org_id) {
      setOrgId(dbDeal.org_id);
      return () => {
        cancelled = true;
      };
    }

    // Fallback: derive org_id from memberships
    supabase
      .from("memberships")
      .select("org_id")
      .limit(1)
      .single()
      .then((res: any) => {
        const { data, error: dbError } = res as any;
        if (cancelled) return;
        if (!dbError && data?.org_id) {
          setOrgId(data.org_id);
        }
      })
      .catch(() => {
        // silent; we'll surface real errors during analyze
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, dbDeal]);

  // Local engine calculations (stub / optimistic math for UI); canonical numbers come from Edge.
  const effectiveSandbox = useMemo(
    () => mergePostureAwareValues(sandbox, posture),
    [sandbox, posture],
  );

  const calc: any = useMemo(() => {
    const local = analysisResult as any;
    const persisted = lastAnalyzeResult as any;
    return {
      ...(persisted?.calculations ?? {}),
      ...(persisted?.outputs ?? {}),
      ...(local?.calculations ?? {}),
      ...(local?.outputs ?? {}),
    };
  }, [analysisResult, lastAnalyzeResult]);

  // Seed from the last persisted run when reopening a deal
  useEffect(() => {
    if (lastAnalyzeResult && !analysisResult) {
      setAnalysisResult(lastAnalyzeResult as any);
      publishAnalyzeResult(lastAnalyzeResult as any);
    }
  }, [analysisResult, lastAnalyzeResult]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!showChecklist) return;
      if (checklistRef.current && !checklistRef.current.contains(e.target as Node)) {
        setShowChecklist(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setShowChecklist(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showChecklist]);

  // Load evidence for banners (run-scoped when available)
  const refreshEvidence = useCallback(async () => {
    if (!dbDeal?.id) {
      setEvidenceStatus([]);
      return;
    }
    try {
      setEvidenceError(null);
      const rows = await listEvidence({
        dealId: dbDeal.id,
        runId: lastRunId ?? undefined,
      });
      const kinds: EvidenceKind[] = [
        "payoff_letter",
        "title_quote",
        "insurance_quote",
        "repair_bid",
      ];
      setEvidenceStatus(buildEvidenceStatus(rows, kinds));
    } catch (err: unknown) {
      setEvidenceError(
        err instanceof Error ? err.message : "Failed to load evidence",
      );
      setEvidenceStatus([]);
    }
  }, [dbDeal?.id, lastRunId]);

  useEffect(() => {
    void refreshEvidence();
  }, [refreshEvidence]);

  // Clear unsaved marker when switching deals
  useEffect(() => {
    setHasUnsavedDealChanges(false);
  }, [dbDeal?.id, setHasUnsavedDealChanges]);

  const hydrateValuation = useCallback(async () => {
    if (!dbDeal?.id) {
      setValuationRun(null);
      setValuationSnapshot(null);
      setMinClosedComps(null);
      setValuationStatus(null);
      return;
    }
    try {
      setValuationError(null);
      const latest = await fetchLatestValuationRun(dbDeal.id);
      if (latest) {
        setValuationRun(latest as ValuationRun);
        const snapshot = (latest as any)?.property_snapshots ?? null;
        setValuationSnapshot(snapshot ?? null);
        const minComps =
          (latest as any)?.input?.min_closed_comps_required ??
          (latest as any)?.provenance?.min_closed_comps_required ??
          null;
        setMinClosedComps(typeof minComps === "number" && Number.isFinite(minComps) ? minComps : null);
      } else {
        setValuationRun(null);
        setValuationSnapshot(null);
        setMinClosedComps(null);
      }
    } catch (err: any) {
      setValuationError(err?.message ?? "Failed to load valuation");
    }
  }, [dbDeal?.id]);

  useEffect(() => {
    void hydrateValuation();
  }, [hydrateValuation]);

  const handleRefreshValuation = useCallback(async (forceRefresh: boolean = false) => {
    if (!dbDeal?.id) {
      setValuationError("Select a deal before refreshing valuation.");
      return;
    }
    setIsRefreshingValuation(true);
    setValuationError(null);
    setValuationStatus(null);
    try {
      const data = (await invokeValuationRun(dbDeal.id, posture, { forceRefresh })) as ValuationRunResponse;
      setValuationRun(data.valuation_run);
      setValuationSnapshot(data.snapshot);
      const minComps =
        (data.valuation_run as any)?.input?.min_closed_comps_required ?? null;
      setMinClosedComps(
        typeof minComps === "number" && Number.isFinite(minComps) ? minComps : null,
      );
    } catch (err: any) {
      setValuationError(err?.message ?? "Valuation refresh failed");
    } finally {
      setIsRefreshingValuation(false);
    }
  }, [dbDeal?.id, posture]);

  // Wire UnderwriteTab's setDealValue helper
  const handleSetDealValue = useCallback(
    (path: string, value: unknown) => {
      setDeal((prev) => setDealPath(prev, path, value));
      setHasUnsavedDealChanges(true);
    },
    [setDeal, setHasUnsavedDealChanges],
  );

  const handleApplySuggestedArv = useCallback(async () => {
    if (!dbDeal?.id) {
      setValuationError("Select a deal before applying valuation.");
      return;
    }
    if (!valuationRun?.id) {
      setValuationError("No valuation run available to apply.");
      return;
    }
    setValuationError(null);
    setValuationStatus(null);
    setApplyingSuggestedArv(true);
    try {
      const resp = await applySuggestedArv(dbDeal.id, valuationRun.id);
      const payload: any = (resp as any)?.deal?.payload ?? null;
      const nextMarket = payload && typeof payload === "object" ? (payload as any).market ?? null : null;
      if (nextMarket) {
        setDeal((prev) => {
          const prevMarket = (prev as any)?.market ?? {};
          return {
            ...(prev as any),
            market: { ...prevMarket, ...nextMarket },
          } as any;
        });
      }
      if (payload && dbDeal) {
        setDbDeal({ ...dbDeal, payload } as any);
      }
      setValuationStatus("Suggested ARV applied and saved to deal.");
    } catch (err: any) {
      setValuationError(err?.message ?? "Failed to apply suggested ARV");
    } finally {
      setApplyingSuggestedArv(false);
    }
  }, [dbDeal?.id, valuationRun?.id, setDeal, setDbDeal]);

  const handleOverrideMarketValue = useCallback(
    async (
      field: "arv" | "as_is_value",
      value: number,
      reason: string,
      valuationRunId?: string | null,
    ) => {
      if (!dbDeal?.id) {
        setOverrideError("Select a deal before overriding market values.");
        return;
      }
      setOverrideSaving(true);
      setOverrideError(null);
      setOverrideStatus(null);
      try {
        const resp = await overrideMarketValue({
          dealId: dbDeal.id,
          field,
          value,
          reason,
          valuationRunId: valuationRunId ?? null,
        });
        const payload: any = (resp as any)?.deal?.payload ?? null;
        const incomingMarket = payload && typeof payload === "object" ? (payload as any).market ?? {} : {};
        if (dbDeal) {
          const existingPayload = (dbDeal as any).payload ?? {};
          const existingMarket = (existingPayload as any).market ?? {};
          const nextPayload = {
            ...existingPayload,
            market: { ...existingMarket, ...incomingMarket },
          };
          setDbDeal({ ...dbDeal, payload: nextPayload } as any);
          setDeal((prev) => {
            const prevMarket = (prev as any)?.market ?? {};
            return {
              ...(prev as any),
              market: { ...prevMarket, ...incomingMarket },
            } as any;
          });
        }
        setHasUnsavedDealChanges(false);
        setOverrideStatus("Override saved to deal.");
      } catch (err: any) {
        setOverrideError(err?.message ?? "Failed to save override");
      } finally {
        setOverrideSaving(false);
      }
    },
    [dbDeal, setDbDeal, setDeal, setHasUnsavedDealChanges],
  );

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setSaveRunStatus(null);
    setOverrideStatus(null);
    setAnalysisResult(null);

    if (!orgId) {
      setError(
        "org_id is empty - select a deal and ensure memberships is seeded for this user.",
      );
      return;
    }

    if (!dbDeal?.id) {
      setError("Select a deal first on /deals before running analyze.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const analyzePayload = buildAnalyzeRequestPayload({
        orgId,
        posture,
        dbDealId: dbDeal.id,
        deal,
        sandbox: effectiveSandbox,
        repairRates: repairRates ?? undefined,
      });

      const envelope = await analyze(analyzePayload);

      if (!envelope) {
        throw new Error("No result returned from v1-analyze.");
      }

      publishAnalyzeResult(envelope as any);
      setAnalysisResult(envelope as any);
      setLastAnalyzeResult(envelope as any);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [deal, orgId, posture, setLastAnalyzeResult, dbDeal, effectiveSandbox]);

  // ?? Listen for the global header "Analyze" event and route it here
  useEffect(() => {
    const listener = () => {
      void handleAnalyze();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("hps:analyze-now", listener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("hps:analyze-now", listener);
      }
    };
  }, [handleAnalyze]);

  const handleSaveRun = useCallback(async () => {
    setError(null);
    setSaveRunStatus(null);
    setOverrideStatus(null);

    if (!orgId) {
      setError(
        "org_id is empty - load it from memberships or selected deal first.",
      );
      return;
    }

    if (!dbDeal?.id) {
      setError("Select a deal on /deals before saving runs.");
      return;
    }

    const canonicalResult = (analysisResult ?? lastAnalyzeResult) as any;

    if (!canonicalResult) {
      setError("Run Analyze with Engine before saving a run or reopen a saved run.");
      return;
    }

    setIsSavingRun(true);

    try {
      const resultAny = canonicalResult;

      const outputs = resultAny?.outputs ?? null;

      const traceRaw: unknown = resultAny?.trace ?? [];
      const trace: Array<Record<string, unknown>> = Array.isArray(traceRaw)
        ? (traceRaw as Array<Record<string, unknown>>)
        : Array.isArray((traceRaw as any)?.frames)
        ? ((traceRaw as any).frames as Array<Record<string, unknown>>)
        : [];

      const metaRaw = (resultAny?.meta ?? {}) as {
        engineVersion?: string;
        policyVersion?: string;
        durationMs?: number;
      };

      const payloadMeta: {
        engineVersion?: string;
        policyVersion?: string | null;
        source?: string;
        durationMs?: number;
      } = { source: "ui-underwrite" };

      if (typeof metaRaw.engineVersion === "string") {
        payloadMeta.engineVersion = metaRaw.engineVersion;
      }
      if (typeof metaRaw.policyVersion === "string") {
        payloadMeta.policyVersion = metaRaw.policyVersion;
      }
      if (typeof metaRaw.durationMs === "number") {
        payloadMeta.durationMs = metaRaw.durationMs;
      }

      const response = (await saveRun({
        orgId,
        dealId: dbDeal.id,
        deal,
        sandbox: effectiveSandbox,
        posture,
        outputs,
        trace: trace as any,
        meta: payloadMeta,
        repairProfile: repairRates ?? undefined,
        policySnapshot: (resultAny as any).policySnapshot,
      })) as RunSaveResponse;

      if (!response.ok) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : response.error?.message ?? "Unknown error saving run",
        );
      }

      const dedupedLabel =
        typeof response.deduped === "boolean"
          ? response.deduped
            ? " (deduped)"
            : ""
          : "";

      const runId = response.run?.id ?? null;
      setLastRunId(runId);
      setLastRunAt(response.run?.created_at ?? new Date().toISOString());
      setSaveRunStatus(`Run saved${dedupedLabel}. id=${runId ?? "unknown"}`);
      setHasUnsavedDealChanges(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      setError(`Save run failed: ${message}`);
    } finally {
      setIsSavingRun(false);
    }
  }, [
    analysisResult,
    lastAnalyzeResult,
    deal,
    orgId,
    posture,
    effectiveSandbox,
    dbDeal,
    repairRates,
  ]);

  const handleOverrideRequested = useCallback(
    (result: any) => {
      setOverrideStatus(
        `Override request submitted (status: ${result.status}). id=${result.overrideId}`,
      );
      setOverrideRefreshKey((key) => key + 1);
    },
    [setOverrideRefreshKey],
  );

  const openOverrideModal = useCallback(
    (tokenKey: string, currentValue: unknown) => {
      setOverridePrefill({
        tokenKey,
        newValue: currentValue,
        oldValue: currentValue,
      });
      setIsOverrideModalOpen(true);
    },
    [],
  );

  // Prefill ARV once from suggested valuation if empty
  useEffect(() => {
    if (hasPrefilledArvRef.current) return;
    if (!valuationRun) return;
    const suggested = (valuationRun as any)?.output?.suggested_arv;
    if (
      (deal as any)?.market?.arv == null &&
      suggested != null &&
      Number.isFinite(Number(suggested))
    ) {
      handleSetDealValue("market.arv", suggested);
      hasPrefilledArvRef.current = true;
    }
  }, [deal, handleSetDealValue, valuationRun]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">Underwrite</h1>
            <Tooltip
              content="Tweak the deal inputs, then run the engine to publish results across the app."
              side="top"
              align="start"
            >
              <button
                type="button"
                aria-label="Underwrite info"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-text-secondary transition hover:border-white/25 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
              >
                i
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <AutosaveIndicator
              state={autosaveStatus.state}
              lastSavedAt={autosaveStatus.lastSavedAt}
              error={autosaveStatus.error}
            />
            <Button
              size="sm"
              variant="primary"
              disabled={isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Deal"}
            </Button>
          </div>
        </div>
      </div>

      {(evidenceStatus.length > 0 || evidenceError) && (
        <div className="relative mb-2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Evidence checklist"
            onClick={() => setShowChecklist((prev) => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#FF4500]/40 bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500]/20 transition"
          >
            <Info size={14} />
          </button>
          <span className="text-[11px] text-text-secondary">Evidence checklist</span>
          {showChecklist && (
            <div
              ref={checklistRef}
              className="absolute z-20 top-9 left-0 min-w-[260px] rounded-lg border border-[#FF4500]/50 bg-[color:var(--glass-bg,strong)]/95 px-3 py-3 text-[11px] text-text-primary shadow-xl backdrop-blur"
            >
              <div className="mb-2 font-semibold text-[#FF4500]">
                Evidence checklist for this deal {lastRunId ? " / run" : ""}
              </div>
              {evidenceError && (
                <div className="text-red-200">Evidence load error: {evidenceError}</div>
              )}
              {!evidenceError && evidenceStatus.length === 0 && (
                <div className="text-text-secondary">No evidence found yet.</div>
              )}
              <div className="space-y-1">
                {evidenceStatus.map((row) => {
                  const label = evidenceLabel(row.kind);
                  if (row.status === "missing") {
                    return (
                      <div key={row.kind} className="text-amber-200">
                        {label}: missing - upload before offer.
                      </div>
                    );
                  }
                  if (row.status === "stale") {
                    return (
                      <div key={row.kind} className="text-amber-200">
                        {label}: stale (last updated {new Date(row.updatedAt).toLocaleDateString()}) - refresh.
                      </div>
                    );
                  }
                  return (
                    <div key={row.kind} className="flex items-center gap-1 text-emerald-200">
                      <CheckCircle size={12} className="text-emerald-300" />
                      <span>
                        {label}: fresh as of {new Date(row.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {saveRunStatus && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
          {saveRunStatus}
        </div>
      )}

      {overrideStatus && (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-xs text-blue-200">
          {overrideStatus}
        </div>
      )}

      {sandboxError && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          {sandboxError}
        </div>
      )}
      {sandboxLoading && (
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
          Loading sandbox settings...
        </div>
      )}

      {!orgId && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          org_id not yet loaded from memberships or selected deal. Make sure you
          are signed in as a dev user with a memberships row and/or have chosen
          a deal from the Deals page.
        </div>
      )}

      <div className="space-y-6">
        <UnderwriteTab
          deal={deal}
          calc={calc}
          setDealValue={handleSetDealValue}
          sandbox={effectiveSandbox}
          canEditPolicy={canEditPolicy}
          onRequestOverride={openOverrideModal}
          valuationRun={valuationRun}
          valuationSnapshot={valuationSnapshot}
          minClosedComps={minClosedComps}
          onRefreshValuation={(force) => handleRefreshValuation(Boolean(force))}
          refreshingValuation={isRefreshingValuation}
          valuationError={valuationError}
          onApplySuggestedArv={handleApplySuggestedArv}
          applyingSuggestedArv={applyingSuggestedArv}
          valuationStatus={valuationStatus}
          onOverrideMarketValue={handleOverrideMarketValue}
          overrideStatus={overrideStatus}
          overrideError={overrideError}
          overrideSaving={overrideSaving}
          autosaveStatus={autosaveStatus}
        />

        <OverridesPanel
          orgId={orgId || null}
          dealId={dbDeal?.id ?? null}
          posture={posture}
          lastRunId={lastRunId}
          refreshKey={overrideRefreshKey}
          membershipRole={membershipRole}
        />

        {dbDeal?.id && (
          <EvidenceUpload
            dealId={dbDeal.id}
            runId={lastRunId}
            title="Evidence for this deal/run"
            onUploadComplete={() => {
              void refreshEvidence();
            }}
          />
        )}
      </div>

      <RequestOverrideModal
        open={isOverrideModalOpen}
        posture={posture}
        lastRunId={lastRunId}
        defaultTokenKey={overridePrefill?.tokenKey}
        defaultNewValue={overridePrefill?.newValue}
        defaultOldValue={overridePrefill?.oldValue}
        dealId={dbDeal?.id}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverridePrefill(null);
        }}
        onRequested={handleOverrideRequested}
      />
    </div>
  );
}
