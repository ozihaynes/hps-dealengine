import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Deal } from "@/types";
import { supabaseClient } from "@/lib/supabaseClient";
import { deriveRepairMarketCode, type RepairRates } from "@/lib/repairsRates";
import { createInitialEstimatorState } from "@/lib/repairsEstimator";
import { computeSectionTotals } from "@/lib/repairsMath";

export type DealSessionPosture = "base" | "qa" | "debug";

export type DealSessionContextValue = {
  userId: string | null;
  orgId: string | null;
  posture: DealSessionPosture;
  dealId: string | null;
  dbDeal: any | null;
  deal: Deal;
  setDeal: (next: Deal) => void;
  hasUnsavedDealChanges: boolean;
  setHasUnsavedDealChanges: (next: boolean) => void;
  lastSavedAt: string | null;
  saveError: string | null;
  saveWorkingStateNow: (opts?: { reason?: string }) => Promise<void>;
  persistWorkingState: (opts?: { debounceMs?: number; reason?: string }) => void;

  // Repairs
  repairRates: RepairRates | null;
  repairRatesError: string | null;
  repairRatesLoading: boolean;
  refreshRepairRates: (opts?: { marketCode?: string; reason?: string }) => Promise<void>;
  estimatorState: any;
  setEstimatorState: React.Dispatch<React.SetStateAction<any>>;
  activeRepairProfileId: string | null;
  setActiveRepairProfileId: (next: string | null) => void;
};

const DealSessionContext = createContext<DealSessionContextValue | null>(null);

export function useDealSession() {
  const ctx = useContext(DealSessionContext);
  if (!ctx) throw new Error("useDealSession must be used within DealSessionProvider");
  return ctx;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type WorkingStatePayload = {
  posture: DealSessionPosture;
  dealId: string;
  deal: Deal;
  lastSavedAt: string | null;
  activeRepairProfileId?: string | null;
  estimatorState?: any;
  repairRates?: RepairRates | null;
  repairRatesMeta?: any;
  version?: number;
};

function makeInitialDeal(): Deal {
  return {
    id: "",
    org_id: "",
    created_at: "",
    updated_at: "",
    payload: {
      property: {
        address: "",
        city: "",
        state: "",
        zip: "",
        county: "",
        sqft: null,
      },
      client: {
        name: "",
        phone: "",
        email: "",
      },
      costs: {
        list_commission_pct: null,
        sell_close_pct: null,
        concessions_pct: null,
      },
      policy: {
        safety_on_aiv_pct: null,
      },
      repairs: {
        quickEstimate: {
          total: null,
        },
        estimator: {
          activeRepairProfileId: null,
        },
      },
      market: {
        market_code: "ORL",
      },
    } as any,
  } as any;
}

function deriveMarketCode(deal: Deal): string {
  const market = (deal as any)?.market ?? {};
  const code =
    (market?.market_code as string | undefined) ??
    (market?.market as string | undefined) ??
    (market?.code as string | undefined) ??
    (market?.msa as string | undefined) ??
    "ORL";
  return String(code || "ORL");
}

export function DealSessionProvider({
  children,
  userId,
  orgId,
  posture,
  dealId,
}: {
  children: ReactNode;
  userId: string | null;
  orgId: string | null;
  posture: DealSessionPosture;
  dealId: string | null;
}) {
  const [dbDeal, setDbDeal] = useState<any | null>(null);
  const [deal, setDeal] = useState<Deal>(makeInitialDeal());
  const [hasUnsavedDealChanges, setHasUnsavedDealChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Working state hydration status
  const workingHydratedRef = useRef(false);
  const [isHydratingActiveDeal, setIsHydratingActiveDeal] = useState(false);
  const [hydratedDealId, setHydratedDealId] = useState<string | null>(null);
  const lastRepairRatesLoadKeyRef = useRef<string | null>(null);

  // Repairs state
  const [repairRates, setRepairRates] = useState<RepairRates | null>(null);
  const [repairRatesError, setRepairRatesError] = useState<string | null>(null);
  const [repairRatesLoading, setRepairRatesLoading] = useState(false);

  const [estimatorState, setEstimatorState] = useState<any>(() =>
    createInitialEstimatorState(),
  );
  const [activeRepairProfileId, setActiveRepairProfileId] = useState<string | null>(
    null,
  );

  const derivedMarketCode = useMemo(
    () => deriveMarketCode(deal as Deal).toUpperCase(),
    [deal],
  );

  const workingKey = useMemo(() => {
    if (!userId || !orgId) return null;
    if (!dealId) return null;
    return `hps.dealengine.working.${userId}.${orgId}.${dealId}.${posture}`;
  }, [userId, orgId, dealId, posture]);

  const saveWorkingStateNow = useCallback(
    async (opts?: { reason?: string }) => {
      if (!userId || !orgId || !dealId) return;
      if (!workingKey) return;

      try {
        setSaveError(null);

        // Avoid flushing stale edits before hydration: if user edits before hydration,
        // mark pending and flush once hydrated.
        if (!workingHydratedRef.current) {
          if (hasUnsavedDealChanges) {
            pendingAutosaveRef.current = true;
          }
          return;
        }

        const payload: WorkingStatePayload = {
          posture,
          dealId,
          deal,
          lastSavedAt,
          activeRepairProfileId,
          estimatorState,
          repairRates,
          repairRatesMeta: repairRates ? (repairRates as any)?.meta ?? null : null,
          version: 1,
        };

        localStorage.setItem(workingKey, JSON.stringify(payload));
        setLastSavedAt(new Date().toISOString());
        setHasUnsavedDealChanges(false);
      } catch (e: any) {
        setSaveError(e?.message ?? "Failed to save working state");
      }
    },
    [
      userId,
      orgId,
      dealId,
      workingKey,
      posture,
      deal,
      lastSavedAt,
      activeRepairProfileId,
      estimatorState,
      repairRates,
      hasUnsavedDealChanges,
    ],
  );

  const autosaveTimerRef = useRef<any>(null);
  const pendingAutosaveRef = useRef(false);

  const persistWorkingState = useCallback(
    (opts?: { debounceMs?: number; reason?: string }) => {
      const debounceMs = opts?.debounceMs ?? 350;

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        void saveWorkingStateNow({ reason: opts?.reason ?? "debounced" });
      }, debounceMs);
    },
    [saveWorkingStateNow],
  );

  useEffect(() => {
    // Cleanup timers on unmount.
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!workingKey) return;

    setIsHydratingActiveDeal(true);

    let raw: string | null = null;
    try {
      raw = localStorage.getItem(workingKey);
    } catch {
      raw = null;
    }
    const parsed = safeJsonParse<WorkingStatePayload>(raw);

    // No stored state.
    if (!parsed || !parsed?.deal) {
      workingHydratedRef.current = true;
      setIsHydratingActiveDeal(false);
      setHydratedDealId(dealId ?? null);
      return;
    }

    // Wrong deal/posture protection.
    if (parsed.dealId !== dealId || parsed.posture !== posture) {
      workingHydratedRef.current = true;
      setIsHydratingActiveDeal(false);
      setHydratedDealId(dealId ?? null);
      return;
    }

    try {
      setDeal(parsed.deal);
      setLastSavedAt(parsed.lastSavedAt ?? null);
      setActiveRepairProfileId(parsed.activeRepairProfileId ?? null);
      if (parsed.estimatorState) setEstimatorState(parsed.estimatorState);
      if (parsed.repairRates) setRepairRates(parsed.repairRates);
      setHasUnsavedDealChanges(false);
    } finally {
      workingHydratedRef.current = true;
      setIsHydratingActiveDeal(false);
      setHydratedDealId(parsed.dealId);

      // If we queued an autosave while hydrating, flush once hydrated.
      if (pendingAutosaveRef.current) {
        pendingAutosaveRef.current = false;
        void saveWorkingStateNow({ reason: "flush-after-hydration" });
      }
    }
  }, [workingKey, dealId, posture, saveWorkingStateNow]);

  const refreshRepairRates = useCallback(
    async (opts?: { marketCode?: string; reason?: string }) => {
      if (!orgId) return;

      setRepairRatesLoading(true);
      setRepairRatesError(null);

      try {
        const rawMarketCode = (opts?.marketCode ?? derivedMarketCode).toUpperCase();
        const marketCode = deriveRepairMarketCode(rawMarketCode);

        const { data, error } = await supabaseClient()
          .from("repair_rates")
          .select("*")
          .eq("org_id", orgId)
          .eq("market_code", marketCode)
          .eq("posture", posture)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setRepairRates(null);
          setRepairRatesError("No repair rates found for market");
          return;
        }

        const normalized: RepairRates = {
          profileId: data.profile_id,
          profileName: data.profile_name,
          orgId: data.org_id,
          posture: data.posture,
          marketCode: data.market_code,
          asOf: data.as_of,
          source: data.source,
          version: data.version,
          isDefault: data.is_default,
          psfTiers: data.psf_tiers,
          big5: data.big5,
          lineItemRates: data.line_item_rates ?? {},
          meta: data.meta ?? null,
        } as any;

        setRepairRates(normalized);

        // Sync estimator defaults when rates change.
        setEstimatorState((prev: any) => {
          const next = typeof structuredClone === "function" ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
          next.costs = next.costs ?? {};
          next.quantities = next.quantities ?? {};
          return next;
        });
      } catch (e: any) {
        setRepairRatesError(e?.message ?? "Failed to load repair rates");
      } finally {
        setRepairRatesLoading(false);
      }
    },
    [orgId, derivedMarketCode, posture],
  );

  useEffect(() => {
    // Load repair rates when org + deal are present, without waiting on hydration.
    if (!orgId) return;
    if (!dealId) return;

    const loadKey = `${orgId}.${posture}.${dealId}.${derivedMarketCode}`;
    if (lastRepairRatesLoadKeyRef.current === loadKey) return;
    lastRepairRatesLoadKeyRef.current = loadKey;

    void refreshRepairRates({
      reason: hydratedDealId === dealId ? "hydrated" : "auto",
    });
  }, [orgId, dealId, posture, derivedMarketCode, hydratedDealId, refreshRepairRates]);

  const value = useMemo(
    () => ({
      userId,
      orgId,
      posture,
      dealId,
      dbDeal,
      deal,
      setDeal,
      hasUnsavedDealChanges,
      setHasUnsavedDealChanges,
      lastSavedAt,
      saveError,
      saveWorkingStateNow,
      persistWorkingState,

      repairRates,
      repairRatesError,
      repairRatesLoading,
      refreshRepairRates,
      estimatorState,
      setEstimatorState,
      activeRepairProfileId,
      setActiveRepairProfileId,
    }),
    [
      userId,
      orgId,
      posture,
      dealId,
      dbDeal,
      deal,
      hasUnsavedDealChanges,
      lastSavedAt,
      saveError,
      saveWorkingStateNow,
      persistWorkingState,
      repairRates,
      repairRatesError,
      repairRatesLoading,
      refreshRepairRates,
      estimatorState,
      activeRepairProfileId,
    ],
  );

  return (
    <DealSessionContext.Provider value={value}>
      {children}
    </DealSessionContext.Provider>
  );
}
