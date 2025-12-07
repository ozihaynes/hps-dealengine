"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";
import type { ReactNode } from "react";

import { createInitialEstimatorState } from "./ui-v2-constants";
import type { Deal, SandboxConfig } from "../types";
import type {
  AnalyzeResult,
  RepairRates,
  RepairRateProfile,
} from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import { HPSEngine } from "../services/engine";
import { getSupabaseClient } from "./supabaseClient";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_SANDBOX_CONFIG,
  mergeSandboxConfig,
} from "../constants/sandboxSettings";
import { fetchSandboxSettings } from "./sandboxSettings";
import { fetchRepairRates } from "./repairRates";
import { getActiveOrgMembershipRole, type OrgMembershipRole } from "./orgMembership";

/**
 * Thin typed view of the canonical deals row in public.deals.
 * This gives the app a stable identity + address container to pair with
 * the richer engine-level Deal in memory.
 */
export type DbDeal = {
  id: string;
  org_id: string;
  orgId: string;
  orgName?: string | null;
  organization?: { name?: string | null } | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  payload: unknown;
};

type DealSessionValue = {
  deal: Deal;
  sandbox: SandboxConfig;
  posture: (typeof Postures)[number];
  sandboxLoading: boolean;
  sandboxError: string | null;
  lastAnalyzeResult: AnalyzeResult | null;
  lastRunId: string | null;
  lastRunAt: string | null;
  hasUnsavedDealChanges: boolean;
  repairRates: RepairRates | null;
  repairRatesLoading: boolean;
  repairRatesError: string | null;
  activeRepairProfile: RepairRateProfile | null;
  activeRepairProfileId: string | null;
  dbDeal: DbDeal | null;
  membershipRole: OrgMembershipRole | null;
  setDeal: React.Dispatch<React.SetStateAction<Deal>>;
  setSandbox: React.Dispatch<React.SetStateAction<SandboxConfig>>;
  setPosture: React.Dispatch<
    React.SetStateAction<(typeof Postures)[number]>
  >;
  setHasUnsavedDealChanges: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  setLastRunAt: React.Dispatch<React.SetStateAction<string | null>>;
  refreshSandbox: () => Promise<void>;
  refreshRepairRates: (opts?: {
    profileId?: string | null;
    marketCode?: string;
    posture?: (typeof Postures)[number] | string | null;
  }) => Promise<void>;
  setLastAnalyzeResult: (result: AnalyzeResult | null) => void;
  setLastRunId: (id: string | null) => void;
  setDbDeal: (deal: DbDeal | null) => void;
  setActiveRepairProfileId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  isHydratingActiveDeal: boolean;
  hydratedDealId: string | null;
};

const DealSessionContext = createContext<DealSessionValue | null>(null);

function normalizeDealShape(base?: any): Deal {
  const d: any = base ? structuredClone(base) : {};

  d.market = {
    arv: 0,
    as_is_value: 0,
    price_to_list_ratio: 0,
    local_discount_pct: 0,
    dom: 0,
    months_of_inventory: 0,
    ...(d.market ?? {}),
  };

  d.costs = {
    ...(d.costs ?? {}),
    double_close: d.costs?.double_close ?? {},
  };

  d.debt = {
    senior_principal: 0,
    ...(d.debt ?? {}),
  };

  return d as Deal;
}

/**
 * Build a robust initial Deal that matches what Overview/Underwrite expect.
 * Prefer UI-V2 estimator defaults; fall back to HPSEngine defaults,
 * then to a minimal defensive shape.
 */
function makeInitialDeal(): Deal {
  // 1) Try UI-V2 estimator state (design source of truth)
  try {
    const est: any =
      typeof createInitialEstimatorState === "function"
        ? createInitialEstimatorState()
        : {};

    if (est?.deal) return normalizeDealShape(est.deal);
    if (est?.state?.deal) return normalizeDealShape(est.state.deal);
    if (est?.estimator?.deal) return normalizeDealShape(est.estimator.deal);
  } catch {
    // swallow and fall through to engine defaults
  }

  // 2) Try engine helpers / defaults
  try {
    const engineAny: any = HPSEngine as any;
    if (typeof engineAny?.createInitialDeal === "function") {
      return normalizeDealShape(engineAny.createInitialDeal());
    }
    if (engineAny?.defaults?.deal) {
      return normalizeDealShape(engineAny.defaults.deal);
    }
  } catch {
    // fall through to final minimal shape
  }

  // 3) Final defensive fallback: just the fields Overview/engine touch
  return normalizeDealShape({
    market: {
      arv: 0,
      as_is_value: 0,
      price_to_list_ratio: 0,
      local_discount_pct: 0,
      dom: 0,
      months_of_inventory: 0,
    },
    costs: {
      double_close: {},
    },
    debt: {
      senior_principal: 0,
    },
  });
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

export function DealSessionProvider({ children }: { children: ReactNode }) {
  const [deal, setDeal] = useState<Deal>(() => makeInitialDeal());
  const [sandbox, setSandbox] = useState<SandboxConfig>(() =>
    mergeSandboxConfig(DEFAULT_SANDBOX_CONFIG)
  );
  const [posture, setPosture] = useState<(typeof Postures)[number]>("base");
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [lastAnalyzeResult, setLastAnalyzeResult] =
    useState<AnalyzeResult | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [hasUnsavedDealChanges, setHasUnsavedDealChanges] = useState(false);
  const [dbDeal, setDbDeal] = useState<DbDeal | null>(null);
  const [repairRates, setRepairRates] = useState<RepairRates | null>(null);
  const [repairRatesLoading, setRepairRatesLoading] = useState(false);
  const [repairRatesError, setRepairRatesError] = useState<string | null>(null);
  const [activeRepairProfile, setActiveRepairProfile] =
    useState<RepairRateProfile | null>(null);
  const [activeRepairProfileId, setActiveRepairProfileId] = useState<
    string | null
  >(null);
  const [membershipRole, setMembershipRole] = useState<OrgMembershipRole | null>(null);
  const [isHydratingActiveDeal, setIsHydratingActiveDeal] = useState(false);
  const [hydratedDealId, setHydratedDealId] = useState<string | null>(null);
  const derivedMarketCode = useMemo(
    () => deriveMarketCode(deal as Deal).toUpperCase(),
    [
      (deal as any)?.market?.market_code,
      (deal as any)?.market?.market,
      (deal as any)?.market?.code,
      (deal as any)?.market?.msa,
    ],
  );
  const repairRatesRequestRef = React.useRef(0);
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams?.get("dealId");

  const loadSandbox = React.useCallback(async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const settings = await fetchSandboxSettings({
        orgId: dbDeal?.org_id,
        posture,
      });
      const merged = mergeSandboxConfig(settings?.config ?? undefined);
      setSandbox(merged);
    } catch (err) {
      console.error("[DealSession] failed to load sandbox settings", err);
      setSandbox(mergeSandboxConfig(DEFAULT_SANDBOX_CONFIG));
      setSandboxError("Could not load sandbox settings; using defaults.");
    } finally {
      setSandboxLoading(false);
    }
  }, [dbDeal?.org_id, posture]);

  const loadDealById = useCallback(
    async (dealId: string) => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select(
            "id, org_id, created_by, created_at, updated_at, address, city, state, zip, client_name, client_phone, client_email, payload, organization:organizations(name)"
          )
          .eq("id", dealId)
          .maybeSingle();

        if (error || !data) {
          return null;
        }

        const organization =
          (data as any)?.organization ?? (data as any)?.organizations ?? null;
        const normalized = {
          ...(data as any),
          orgId: (data as any)?.org_id ?? (data as any)?.orgId ?? "",
          orgName: organization?.name ?? null,
          organization,
        } as DbDeal;

        setDbDeal(normalized);
        return normalized;
      } catch {
        return null;
      }
    },
    [supabase],
  );

  // Persist selected deal id locally so reloads keep context
  useEffect(() => {
    if (dbDeal?.id) {
      localStorage.setItem("hps-active-deal-id", dbDeal.id);
    }
  }, [dbDeal?.id]);

  // On mount, hydrate selection from localStorage if present
  useEffect(() => {
    const supabase = getSupabaseClient();
    const savedId = localStorage.getItem("hps-active-deal-id");
    if (!savedId) return;

    const load = async () => {
      const loaded = await loadDealById(savedId);
      if (loaded) {
        setHydratedDealId(loaded.id);
      }
    };

    void load();
  }, [loadDealById]);

  // Hydrate DealSession from URL ?dealId=... when present (deep-link)
  useEffect(() => {
    if (!dealIdFromUrl) return;
    if (isHydratingActiveDeal) return;

    // If already aligned with this dealId, no-op
    if (dbDeal?.id === dealIdFromUrl && hydratedDealId === dealIdFromUrl) {
      return;
    }

    setIsHydratingActiveDeal(true);
    loadDealById(dealIdFromUrl)
      .then((loaded) => {
        if (loaded?.id) {
          setHydratedDealId(loaded.id);
        }
      })
      .finally(() => {
        setIsHydratingActiveDeal(false);
      });
  }, [dealIdFromUrl, dbDeal?.id, hydratedDealId, isHydratingActiveDeal, loadDealById]);

  // When dbDeal changes, sync in-memory deal shape from payload
  useEffect(() => {
    if (dbDeal?.payload) {
      setDeal(normalizeDealShape(dbDeal.payload));
    }
  }, [dbDeal?.payload]);

  const refreshRepairRates = React.useCallback(
    async (
      opts?: {
        profileId?: string | null;
        marketCode?: string;
        posture?: (typeof Postures)[number] | string | null;
      },
    ) => {
      const requestId = ++repairRatesRequestRef.current;

      if (!dbDeal?.org_id || !dbDeal?.id) {
        setRepairRates(null);
        setRepairRatesError("Select a deal to load repair rates.");
        if (requestId === repairRatesRequestRef.current) {
          setRepairRatesLoading(false);
        }
        if (process.env.NODE_ENV !== "production") {
          console.debug("[DealSession] refreshRepairRates skipped (no org)", {
            hasDbDeal: !!dbDeal,
            hasDealId: !!dbDeal?.id,
            profileId: opts?.profileId ?? activeRepairProfileId,
            marketCode: opts?.marketCode,
            posture,
          });
        }
        return;
      }

      setRepairRatesLoading(true);
      setRepairRatesError(null);
      try {
        const marketCode = (opts?.marketCode ?? derivedMarketCode).toUpperCase();
        const postureNormalized = (
          opts?.posture ?? posture ?? "base"
        ).toLowerCase() as (typeof Postures)[number];

        if (process.env.NODE_ENV !== "production") {
          console.debug("[DealSession] refreshRepairRates start", {
            requestId,
            orgId: dbDeal.org_id,
            marketCode,
            posture: postureNormalized,
            profileId: opts?.profileId ?? activeRepairProfileId,
            dealId: dbDeal.id,
          });
        }

        const next = await fetchRepairRates({
          dealId: dbDeal.id,
          marketCode,
          posture: postureNormalized,
          profileId: opts?.profileId ?? activeRepairProfileId,
        });

        if (requestId !== repairRatesRequestRef.current) {
          return;
        }

        if (next) {
          if (process.env.NODE_ENV !== "production") {
            console.debug("[DealSession] refreshRepairRates store", {
              requestId,
              profileId: next.profileId,
              marketCode: next.marketCode,
              posture: next.posture,
              big5: next.big5,
            });
          }
          const normalized = {
            ...next,
            psfTiers: { ...(next.psfTiers ?? {}) },
            big5: { ...(next.big5 ?? {}) },
            lineItemRates: {
              ...(((next as any).lineItemRates ?? (next as any).items ?? {}) as
                Record<string, unknown>),
            },
          } as RepairRates;
          console.log("[DealSession] repairRates updated", {
            profileId: normalized.profileId,
            marketCode: normalized.marketCode,
            posture: normalized.posture,
            psf: normalized.psfTiers,
            big5: normalized.big5,
          });
          setRepairRates(normalized);
          if (next.profileId && next.profileId !== activeRepairProfileId) {
            setActiveRepairProfileId(next.profileId);
          }
          setActiveRepairProfile({
            id: next.profileId ?? undefined,
            orgId: next.orgId,
            name: next.profileName ?? "Active Profile",
            marketCode: next.marketCode,
            posture: next.posture as (typeof Postures)[number],
            asOf: next.asOf,
            source: next.source ?? undefined,
            version: next.version,
            isActive: true,
            isDefault: next.isDefault ?? false,
            psfTiers: next.psfTiers,
            big5: next.big5,
            lineItemRates: (next as any).lineItemRates ?? {},
          });
          if (process.env.NODE_ENV !== "production") {
            console.debug("[DealSession] refreshRepairRates success", {
              profileId: next.profileId,
              marketCode: next.marketCode,
              posture: next.posture,
              psf: next.psfTiers,
              big5: next.big5,
            });
          }
        } else {
          setRepairRates(null);
          setRepairRatesError("No active repair profile found for this org.");
          setActiveRepairProfile(null);
          if (process.env.NODE_ENV !== "production") {
            console.debug("[DealSession] refreshRepairRates no data", {
              orgId: dbDeal.org_id,
              marketCode,
              posture: postureNormalized,
            });
          }
        }
      } catch (err: any) {
        console.error("[DealSession] failed to load repair rates", err);
        if (requestId !== repairRatesRequestRef.current) {
          return;
        }
        setRepairRates(null);
        setRepairRatesError(
          err?.message ?? "Could not load repair rates for this org/market.",
        );
        setActiveRepairProfile(null);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[DealSession] refreshRepairRates error details", {
            message: err?.message,
            orgId: dbDeal.org_id,
          });
        }
      } finally {
        if (requestId === repairRatesRequestRef.current) {
          setRepairRatesLoading(false);
        }
      }
    },
    [dbDeal?.org_id, derivedMarketCode, posture, activeRepairProfileId],
  );

  // When dbDeal changes, load the latest run for that deal to seed outputs
  useEffect(() => {
    if (!dbDeal?.id || !dbDeal.org_id) {
      return;
    }

    const loadRun = async () => {
      try {
        const { data, error } = await supabase
          .from("runs")
          .select("id, deal_id, input, output, trace, created_at, policy_snapshot")
          .eq("org_id", dbDeal.org_id)
          .or(
            `deal_id.eq.${dbDeal.id},input->>dealId.eq.${dbDeal.id}`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          setLastAnalyzeResult(null);
          setLastRunId(null);
          return;
        }
        const output = (data as any).output ?? null;
        if (output) {
          setLastAnalyzeResult(output as AnalyzeResult);
          setLastRunId((data as any).id ?? null);
          setLastRunAt((data as any).created_at ?? null);
        } else {
          setLastAnalyzeResult(null);
          setLastRunId(null);
          setLastRunAt(null);
        }
      } catch {
        setLastAnalyzeResult(null);
        setLastRunId(null);
        setLastRunAt(null);
      }
    };

    void loadRun();
  }, [dbDeal?.id, dbDeal?.org_id, supabase]);

  // Load membership role for the active org
  useEffect(() => {
    const loadRole = async () => {
      try {
        const role = await getActiveOrgMembershipRole(
          supabase,
          dbDeal?.org_id ?? null,
        );
        setMembershipRole(role);
      } catch {
        setMembershipRole(null);
      }
    };
    void loadRole();
  }, [dbDeal?.org_id, supabase]);

  useEffect(() => {
    void loadSandbox();
  }, [loadSandbox]);

  useEffect(() => {
    void refreshRepairRates();
  }, [refreshRepairRates]);

  const value = useMemo(
    () => ({
      deal,
      sandbox,
      posture,
      sandboxLoading,
      sandboxError,
      lastAnalyzeResult,
      lastRunId,
      lastRunAt,
      hasUnsavedDealChanges,
      repairRates,
      repairRatesLoading,
      repairRatesError,
      activeRepairProfile,
      activeRepairProfileId,
      dbDeal,
      setDeal,
      setSandbox,
      setPosture,
      setHasUnsavedDealChanges,
      setLastRunAt,
      refreshSandbox: loadSandbox,
      refreshRepairRates,
      setLastAnalyzeResult,
      setLastRunId,
      setDbDeal,
      setActiveRepairProfileId,
      membershipRole,
      isHydratingActiveDeal,
      hydratedDealId,
    }),
    [
      deal,
      sandbox,
      posture,
      sandboxLoading,
      sandboxError,
      lastAnalyzeResult,
      lastRunId,
      lastRunAt,
      hasUnsavedDealChanges,
      repairRates,
      repairRatesLoading,
      repairRatesError,
      activeRepairProfile,
      activeRepairProfileId,
      dbDeal,
      loadSandbox,
      refreshRepairRates,
      membershipRole,
      isHydratingActiveDeal,
      hydratedDealId,
    ]
  );

  return (
    <DealSessionContext.Provider value={value}>
      {children}
    </DealSessionContext.Provider>
  );
}

export function useDealSession(): DealSessionValue {
  const ctx = useContext(DealSessionContext);
  if (!ctx) {
    throw new Error("useDealSession must be used within a DealSessionProvider");
  }
  return ctx;
}
