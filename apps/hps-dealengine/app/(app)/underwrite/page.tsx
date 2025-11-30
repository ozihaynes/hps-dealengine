"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import UnderwriteTab from "@/components/underwrite/UnderwriteTab";
import { Button } from "@/components/ui";
import RequestOverrideModal from "@/components/underwrite/RequestOverrideModal";
import { useDealSession } from "@/lib/dealSessionContext";
import type { Deal } from "@ui-v2/types";

import { HPSEngine } from "../../../services/engine";
import { getSupabase } from "@/lib/supabaseClient";
import { publishAnalyzeResult } from "@/lib/analyzeBus";
import { analyze, saveRun } from "@/lib/edge";
import { EvidenceUpload } from "@/components/shared/EvidenceUpload";
import OverridesPanel from "@/components/underwrite/OverridesPanel";

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

  const { deal, sandbox, setDeal, setLastAnalyzeResult, dbDeal } =
    useDealSession();
  const [orgId, setOrgId] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const canEditPolicy = useMemo(() => {
    const normalized = (role ?? "").toLowerCase();
    return ["manager", "vp", "owner"].includes(normalized);
  }, [role]);
  const [posture, setPosture] = useState<"conservative" | "base" | "aggressive">(
    "base",
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const [saveRunStatus, setSaveRunStatus] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overridePrefill, setOverridePrefill] = useState<{
    tokenKey: string;
    newValue: unknown;
  } | null>(null);
  const [overrideRefreshKey, setOverrideRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  // Load role for this org to gate policy editing
  useEffect(() => {
    if (!orgId) {
      setRole(null);
      return;
    }

    let cancelled = false;

    const loadRole = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
          if (!cancelled) setRole(null);
          return;
        }

        const { data, error: memError } = await supabase
          .from("memberships")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", userId)
          .limit(1);

        if (cancelled) return;
        if (memError) {
          setRole(null);
          return;
        }

        const roleVal = data?.[0]?.role ?? null;
        setRole(roleVal);
      } catch {
        if (!cancelled) setRole(null);
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [orgId, supabase]);

  // Local engine calculations (stub / optimistic math for UI); canonical numbers come from Edge.
  const calc: any = useMemo(() => {
    const result: any = HPSEngine.runEngine({ deal }, sandbox);
    return result?.calculations ?? {};
  }, [deal, sandbox]);

  // Wire UnderwriteTab's setDealValue helper
  const handleSetDealValue = useCallback(
    (path: string, value: unknown) => {
      setDeal((prev) => setDealPath(prev, path, value));
    },
    [setDeal],
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
      const anyDeal: any = deal ?? {};
      const market: any = anyDeal.market ?? {};

      const input = {
        org_id: orgId,
        posture,
        deal: {
          dealId: dbDeal.id,
          arv: Number(market.arv ?? market.arv_value ?? 0),
          aiv: Number(market.as_is_value ?? market.aiv ?? 0),
          dom_zip_days: Number(
            market.dom_zip ?? market.dom_zip_days ?? market.dom ?? 0,
          ),
          moi_zip_months: Number(
            market.moi_zip ??
              market.moi_zip_months ??
              market.months_of_inventory ??
              0,
          ),
          price_to_list_pct: Number(
            market["price-to-list-pct"] ??
              market.price_to_list_pct ??
              market.price_to_list_ratio ??
              0,
          ),
          local_discount_pct: Number(
            market.local_discount_20th_pct ??
              market.local_discount_pct ??
              0,
          ),
          options: { trace: true },
        },
      };

      const envelope = await analyze(input);

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
  }, [deal, orgId, posture, setLastAnalyzeResult, dbDeal]);

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

    if (!analysisResult) {
      setError("Run Analyze with Engine before saving a run.");
      return;
    }

    setIsSavingRun(true);

    try {
      const resultAny = analysisResult as any;

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
        sandbox,
        posture,
        outputs,
        trace: trace as any,
        meta: payloadMeta,
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
      setSaveRunStatus(`Run saved${dedupedLabel}. id=${runId ?? "unknown"}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      setError(message);
    } finally {
      setIsSavingRun(false);
    }
  }, [analysisResult, deal, orgId, posture, sandbox, supabase, dbDeal]);

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
    (tokenKey: string, newValue: unknown) => {
      setOverridePrefill({ tokenKey, newValue });
      setIsOverrideModalOpen(true);
    },
    [],
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Underwrite
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tweak the deal inputs, then run the engine to publish results across
            the app.
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Role: {role ?? "loading..."} | Policy edits:{" "}
            {canEditPolicy ? "allowed (manager/vp/owner)" : "locked (analyst)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Posture</span>
            <select
              className="rounded border border-border-subtle bg-surface-elevated px-2 py-1 text-xs"
              value={posture}
              onChange={(e) =>
                setPosture(
                  e.target.value as "conservative" | "base" | "aggressive",
                )
              }
            >
              <option value="conservative">Conservative</option>
              <option value="base">Base</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>

          <Button
            size="sm"
            variant="primary"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? "Analyzing." : "Analyze with Engine"}
          </Button>

          <Button
            size="sm"
            variant="neutral"
            onClick={() => {
              setOverridePrefill(null);
              setIsOverrideModalOpen(true);
            }}
          >
            Request Override
          </Button>

          <Button
            size="sm"
            variant="neutral"
            disabled={isSavingRun || !analysisResult}
            onClick={handleSaveRun}
          >
            {isSavingRun ? "Saving Run." : "Save Run"}
          </Button>
        </div>
      </div>

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

      {!orgId && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          org_id not yet loaded from memberships or selected deal. Make sure you
          are signed in as a dev user with a memberships row and/or have chosen
          a deal from the Deals page.
        </div>
      )}

      <UnderwriteTab
        deal={deal}
        calc={calc}
        setDealValue={handleSetDealValue}
        sandbox={sandbox}
        canEditPolicy={canEditPolicy}
        onRequestOverride={openOverrideModal}
      />

      <OverridesPanel
        orgId={orgId || null}
        dealId={dbDeal?.id ?? null}
        posture={posture}
        lastRunId={lastRunId}
        refreshKey={overrideRefreshKey}
      />

      {dbDeal?.id && (
        <EvidenceUpload
          dealId={dbDeal.id}
          runId={lastRunId}
          title="Evidence for this deal/run"
        />
      )}

      <RequestOverrideModal
        open={isOverrideModalOpen}
        posture={posture}
        lastRunId={lastRunId}
        defaultTokenKey={overridePrefill?.tokenKey}
        defaultNewValue={overridePrefill?.newValue}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverridePrefill(null);
        }}
        onRequested={handleOverrideRequested}
      />
    </div>
  );
}
