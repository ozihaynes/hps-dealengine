"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
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
import type {
  NegotiationPlaybookResult,
  AiChatMessage,
  NegotiatorTone,
} from "./ai/types";

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
import {
  fetchLatestRunForDeal,
  fetchWorkingState,
  hashWorkingState,
  upsertWorkingState,
  type WorkingStatePayload,
} from "./workingState";

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
  autosaveStatus: {
    state: "idle" | "saving" | "saved" | "error";
    lastSavedAt: string | null;
    error: string | null;
  };
  saveWorkingStateNow: (opts?: { payload?: WorkingStatePayload }) => Promise<void>;
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
  negotiationPlaybook?: NegotiationPlaybookResult | null;
  negotiatorMessages?: AiChatMessage[];
  negotiatorLogicRowIds?: string[] | null;
  negotiatorTone?: NegotiatorTone;
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
  setNegotiationPlaybook: (result: NegotiationPlaybookResult | null) => void;
  setNegotiatorMessages: (messages: AiChatMessage[]) => void;
  appendNegotiatorMessage: (message: AiChatMessage) => void;
  clearNegotiatorThread: () => void;
  setNegotiatorLogicRowIds: (ids: string[] | null) => void;
  setNegotiatorTone: (tone: NegotiatorTone) => void;
  isHydratingActiveDeal: boolean;
  hydratedDealId: string | null;
  refreshDeal: () => Promise<void>;
};

const DealSessionContext = createContext<DealSessionValue | null>(null);

export function normalizeDealShape(base?: any): Deal {
  const d: any = base ? structuredClone(base) : {};

  const marketSource = d.market ?? {};
  const { offer_price: _legacyOfferPrice, ...restMarket } = marketSource;
  d.market = {
    arv: marketSource?.arv ?? null,
    as_is_value: marketSource?.as_is_value ?? null,
    contract_price: marketSource?.contract_price ?? null,
    contract_price_executed: marketSource?.contract_price_executed ?? null,
    valuation_basis: marketSource?.valuation_basis ?? null,
    price_to_list_ratio: marketSource?.price_to_list_ratio ?? null,
    local_discount_pct: marketSource?.local_discount_pct ?? null,
    dom: marketSource?.dom ?? null,
    months_of_inventory: marketSource?.months_of_inventory ?? null,
    ...restMarket,
  };

  d.costs = {
    ...(d.costs ?? {}),
    double_close: d.costs?.double_close ?? {},
  };

  d.debt = {
    senior_principal: d.debt?.senior_principal ?? null,
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
      arv: null,
      as_is_value: null,
      price_to_list_ratio: null,
      local_discount_pct: null,
      dom: null,
      months_of_inventory: null,
    },
    costs: {
      double_close: {},
    },
    debt: {
      senior_principal: null,
    },
  });
}

function deriveMarketCode(market: Record<string, unknown> | null | undefined): string {
  const m: any = market ?? {};
  return (
    m.market_code ||
    m.market ||
    m.code ||
    m.msa ||
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
  const [userId, setUserId] = useState<string | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<{
    state: "idle" | "saving" | "saved" | "error";
    lastSavedAt: string | null;
    error: string | null;
  }>({ state: "idle", lastSavedAt: null, error: null });
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
  const [negotiationPlaybook, setNegotiationPlaybook] =
    useState<NegotiationPlaybookResult | null>(null);
  const [negotiatorMessages, setNegotiatorMessages] = useState<AiChatMessage[]>([]);
  const [negotiatorLogicRowIds, setNegotiatorLogicRowIds] = useState<string[] | null>(null);
  const [negotiatorTone, setNegotiatorTone] = useState<NegotiatorTone>("objective");
  const [membershipRole, setMembershipRole] = useState<OrgMembershipRole | null>(null);
  const [isHydratingActiveDeal, setIsHydratingActiveDeal] = useState(false);
  const [hydratedDealId, setHydratedDealId] = useState<string | null>(null);
  const [workingHydratedTick, setWorkingHydratedTick] = useState(0);
  const workingHydratedRef = useRef(false);
  const pendingAutosaveRef = useRef(false);
  const lastSavedHashRef = useRef<string | null>(null);
  const lastSavedDealRef = useRef<string | null>(null);
  const marketCodeValue = (deal as any)?.market?.market_code ?? null;
  const marketMarketValue = (deal as any)?.market?.market ?? null;
  const marketAltCodeValue = (deal as any)?.market?.code ?? null;
  const marketMsaValue = (deal as any)?.market?.msa ?? null;
  const derivedMarketCode = useMemo(
    () =>
      deriveMarketCode({
        market_code: marketCodeValue,
        market: marketMarketValue,
        code: marketAltCodeValue,
        msa: marketMsaValue,
      }).toUpperCase(),
    [marketCodeValue, marketMarketValue, marketAltCodeValue, marketMsaValue],
  );
  const repairRatesRequestRef = React.useRef(0);
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams?.get("dealId");

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setUserId(null);
      });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      authSub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  const appendNegotiatorMessage = React.useCallback((message: AiChatMessage) => {
    setNegotiatorMessages((prev) => [...prev, message]);
  }, []);

  const clearNegotiatorThread = React.useCallback(() => {
    setNegotiationPlaybook(null);
    setNegotiatorMessages([]);
    setNegotiatorLogicRowIds(null);
    setNegotiatorTone("objective");
  }, []);

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
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          return null;
        }
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

      try {
        const latestRun = await fetchLatestRunForDeal(supabase, {
          orgId: normalized.org_id,
          dealId: normalized.id,
        });

        if (latestRun?.output) {
          const trace = Array.isArray((latestRun as any)?.trace)
            ? ((latestRun as any).trace as any[])
            : null;
          const merged = trace
            ? ({ ...(latestRun.output as any), trace } as AnalyzeResult)
            : (latestRun.output as AnalyzeResult);

          setLastAnalyzeResult(merged);
          setLastRunId(latestRun.id ?? null);
          setLastRunAt((latestRun as any)?.created_at ?? null);
        }
      } catch (err) {
        console.warn("[DealSession] failed to load latest run for deal", err);
      }

      return normalized;
    } catch {
      return null;
    }
  },
    [supabase],
  );

  /**
   * Refresh the current deal from the database.
   * Call this after external modifications (e.g., intake population).
   */
  const refreshDeal = useCallback(async () => {
    if (!dbDeal?.id) return;

    try {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id, org_id, created_by, created_at, updated_at, address, city, state, zip, client_name, client_phone, client_email, payload, organization:organizations(name)"
        )
        .eq("id", dbDeal.id)
        .maybeSingle();

      if (error || !data) {
        console.error("[DealSession] refreshDeal failed", error);
        return;
      }

      const organization =
        (data as any)?.organization ?? (data as any)?.organizations ?? null;
      const normalized = {
        ...(data as any),
        orgId: (data as any)?.org_id ?? (data as any)?.orgId ?? "",
        orgName: organization?.name ?? null,
        organization,
      } as DbDeal;

      // Update dbDeal which will trigger payload sync via useEffect
      setDbDeal(normalized);

      // Also immediately update in-memory deal from new payload
      if (normalized.payload) {
        setDeal(normalizeDealShape(normalized.payload));
      }

      console.log("[DealSession] refreshDeal complete", { dealId: dbDeal.id });
    } catch (err) {
      console.error("[DealSession] refreshDeal error", err);
    }
  }, [dbDeal?.id, supabase]);

  // Persist selected deal id locally so reloads keep context
  useEffect(() => {
    if (dbDeal?.id) {
      localStorage.setItem("hps-active-deal-id", dbDeal.id);
    }
  }, [dbDeal?.id]);

  useEffect(() => {
    setLastAnalyzeResult(null);
    setLastRunId(null);
    setLastRunAt(null);
  }, [dbDeal?.id]);

  // On mount, hydrate selection from localStorage if present
  useEffect(() => {
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
    if (dbDeal?.payload && !workingHydratedRef.current) {
      setDeal(normalizeDealShape(dbDeal.payload));
    }
  }, [dbDeal?.payload]);

  // Fallback: load the latest run for the active deal to ensure overview/trace have data.
  useEffect(() => {
    if (!dbDeal?.id || !dbDeal.org_id) return;
    if (!userId) return;
    if (lastAnalyzeResult) return;

    let cancelled = false;
    const loadLatestRun = async () => {
      const { data, error } = await supabase
        .from("runs")
        .select("id, org_id, deal_id, created_at, output, trace")
        .eq("org_id", dbDeal.org_id)
        .eq("deal_id", dbDeal.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const output = ((data as any).output ?? null) as AnalyzeResult | null;
      const trace = Array.isArray((data as any)?.trace) ? ((data as any).trace as any[]) : null;
      const merged = trace && output ? ({ ...(output as any), trace } as AnalyzeResult) : output;

      setLastAnalyzeResult(merged);
      setLastRunId((data as any).id ?? null);
      setLastRunAt((data as any).created_at ?? null);
    };

    void loadLatestRun();

    return () => {
      cancelled = true;
    };
  }, [dbDeal?.id, dbDeal?.org_id, lastAnalyzeResult, supabase, setLastRunId, setLastRunAt, userId]);

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
    [dbDeal, derivedMarketCode, posture, activeRepairProfileId],
  );

  // Hydrate working state (draft vs latest run) when deal/user changes
  useEffect(() => {
    if (!dbDeal?.id || !dbDeal.org_id || !userId) {
      setLastAnalyzeResult(null);
      setLastRunId(null);
      setLastRunAt(null);
      workingHydratedRef.current = false;
      pendingAutosaveRef.current = false;
      lastSavedHashRef.current = null;
      lastSavedDealRef.current = null;
      return;
    }

    workingHydratedRef.current = false;
    lastSavedHashRef.current = null;
    lastSavedDealRef.current = null;

    const hydrate = async () => {
      try {
        const [working, latestRun] = await Promise.all([
          fetchWorkingState(supabase, {
            orgId: dbDeal.org_id,
            dealId: dbDeal.id,
            userId,
          }).catch(() => null),
          fetchLatestRunForDeal(supabase, {
            orgId: dbDeal.org_id,
            dealId: dbDeal.id,
          }).catch(() => null),
        ]);

        const workingPayload: WorkingStatePayload =
          (working?.payload as WorkingStatePayload) ?? {};
        const workingPosture =
          (working?.posture as (typeof Postures)[number]) ?? posture ?? "base";
        const workingHash =
          working && workingPayload
            ? hashWorkingState({
                dealId: dbDeal.id,
                posture: workingPosture,
                payload: workingPayload,
              })
            : null;
        const workingUpdatedAt = working?.updated_at
          ? new Date(working.updated_at).getTime()
          : -1;

        const runInput = (latestRun?.input as any) ?? null;
        const runPosture =
          (runInput?.posture as (typeof Postures)[number]) ??
          (latestRun?.posture as (typeof Postures)[number]) ??
          "base";
        const runHash =
          latestRun?.input_hash ??
          (runInput
            ? hashWorkingState({
                dealId: dbDeal.id,
                posture: runPosture,
                payload: {
                  deal: runInput.deal,
                  sandbox: runInput.sandbox,
                  repairProfile: runInput.repairProfile ?? null,
                },
              })
            : null);
        const runCreatedAt = latestRun?.created_at
          ? new Date(latestRun.created_at).getTime()
          : -1;

        const workingIsNewer = working && workingUpdatedAt >= runCreatedAt;

        if (working && workingIsNewer) {
          const nextDeal = normalizeDealShape(
            (workingPayload.deal as Deal | undefined) ??
              (dbDeal.payload ? normalizeDealShape(dbDeal.payload) : makeInitialDeal()),
          );
          setDeal(nextDeal);
          setSandbox(
            mergeSandboxConfig(
              (workingPayload.sandbox as SandboxConfig | undefined) ??
                DEFAULT_SANDBOX_CONFIG,
            ),
          );
          setPosture(workingPosture);
          if (typeof workingPayload.activeRepairProfileId !== "undefined") {
            setActiveRepairProfileId(workingPayload.activeRepairProfileId ?? null);
          } else {
            setActiveRepairProfileId(null);
          }

          if (runHash && workingHash && runHash === workingHash && latestRun?.output) {
            setLastAnalyzeResult(latestRun.output as AnalyzeResult);
            setLastRunId(latestRun.id ?? null);
            setLastRunAt(latestRun.created_at ?? null);
            lastSavedHashRef.current = workingHash;
            lastSavedDealRef.current = dbDeal.id;
          } else {
            setLastAnalyzeResult(null);
            setLastRunId(latestRun?.id ?? null);
            setLastRunAt(latestRun?.created_at ?? null);
            lastSavedHashRef.current = workingHash;
            lastSavedDealRef.current = dbDeal.id;
          }
          setHasUnsavedDealChanges(false);
          workingHydratedRef.current = true;
          return;
        }

        if (latestRun) {
          const nextDeal = normalizeDealShape(
            (runInput?.deal as Deal | undefined) ??
              (dbDeal.payload ? normalizeDealShape(dbDeal.payload) : makeInitialDeal()),
          );
          setDeal(nextDeal);
          setSandbox(
            mergeSandboxConfig(
              (runInput?.sandbox as SandboxConfig | undefined) ??
                DEFAULT_SANDBOX_CONFIG,
            ),
          );
          setPosture(runPosture);
          if (runInput?.repairProfile?.profileId) {
            setActiveRepairProfileId(runInput.repairProfile.profileId);
          } else {
            setActiveRepairProfileId(null);
          }
          setLastAnalyzeResult(
            (latestRun.output as AnalyzeResult | null | undefined) ?? null,
          );
          setLastRunId(latestRun.id ?? null);
          setLastRunAt(latestRun.created_at ?? null);
          lastSavedHashRef.current = runHash ?? null;
          lastSavedDealRef.current = dbDeal.id;
          setHasUnsavedDealChanges(false);
          workingHydratedRef.current = true;
          return;
        }

        // Fallback: payload from deals row or defaults
        if (dbDeal.payload) {
          setDeal(normalizeDealShape(dbDeal.payload));
        } else {
          setDeal(makeInitialDeal());
        }
        setSandbox(mergeSandboxConfig(DEFAULT_SANDBOX_CONFIG));
        setActiveRepairProfileId(null);
        setActiveRepairProfile(null);
        setRepairRates(null);
        setRepairRatesError(null);
        setPosture("base");
        setLastAnalyzeResult(null);
        setLastRunId(null);
        setLastRunAt(null);
        lastSavedHashRef.current = null;
        lastSavedDealRef.current = dbDeal.id;
        setHasUnsavedDealChanges(false);
      } catch (err) {
        console.error("[DealSession] hydrate working state failed", err);
        setLastAnalyzeResult(null);
        setLastRunId(null);
        setLastRunAt(null);
        lastSavedHashRef.current = null;
      } finally {
        workingHydratedRef.current = true;
        setWorkingHydratedTick((tick) => tick + 1);
      }
    };

    void hydrate();
  }, [dbDeal?.id, dbDeal?.org_id, dbDeal?.payload, posture, userId, supabase]);

  // Autosave working state (deal + sandbox + repair profile) per user/deal/org
  const persistWorkingState = useCallback(
    async (opts?: { payload?: WorkingStatePayload; debounceMs?: number }) => {
      if (!workingHydratedRef.current) {
        if (hasUnsavedDealChanges) {
          pendingAutosaveRef.current = true;
        }
        return;
      }
      if (!dbDeal?.id || !dbDeal.org_id || !userId) return;

      const outputsAny = (lastAnalyzeResult as any)?.outputs ?? lastAnalyzeResult ?? null;
      const hasOffer =
        outputsAny &&
        typeof outputsAny.primary_offer !== "undefined" &&
        outputsAny.primary_offer !== null;

      const payload: WorkingStatePayload =
        opts?.payload ??
        {
          deal,
          sandbox,
          repairProfile: repairRates ?? null,
          activeRepairProfileId,
          activeOfferRunId: hasOffer ? lastRunId ?? null : null,
        };
      const postureValue = posture ?? "base";
      const hash = hashWorkingState({
        dealId: dbDeal.id,
        posture: postureValue,
        payload,
      });

      if (
        lastSavedHashRef.current === hash &&
        lastSavedDealRef.current === dbDeal.id
      ) {
        return;
      }

      setAutosaveStatus((prev) => ({
        state: "saving",
        lastSavedAt: prev.lastSavedAt ?? null,
        error: null,
      }));

      const delay = typeof opts?.debounceMs === "number" ? opts.debounceMs : 800;

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          upsertWorkingState(supabase, {
            orgId: dbDeal.org_id,
            dealId: dbDeal.id,
            userId,
            posture: postureValue,
            payload,
            sourceRunId: lastRunId ?? null,
          })
            .then(() => {
              lastSavedHashRef.current = hash;
              lastSavedDealRef.current = dbDeal.id;
              setHasUnsavedDealChanges(false);
              setAutosaveStatus({
                state: "saved",
                lastSavedAt: new Date().toISOString(),
                error: null,
              });
            })
            .catch((err) => {
              console.error("[DealSession] autosave working state failed", err);
              setAutosaveStatus((prev) => ({
                state: "error",
                lastSavedAt: prev.lastSavedAt ?? null,
                error: err instanceof Error ? err.message : "Autosave failed",
              }));
            })
            .finally(() => resolve());
        }, delay);

        // Clear if a new persist is scheduled before this one fires
        return () => clearTimeout(timeout);
      });
    },
    [
      activeRepairProfileId,
      dbDeal,
      deal,
      hasUnsavedDealChanges,
      lastAnalyzeResult,
      lastRunId,
      posture,
      repairRates,
      sandbox,
      supabase,
      userId,
    ],
  );

  useEffect(() => {
    if (!pendingAutosaveRef.current) return;
    if (!workingHydratedRef.current) return;
    pendingAutosaveRef.current = false;
    void persistWorkingState({ debounceMs: 0 });
  }, [persistWorkingState, workingHydratedTick]);

  // Autosave working state (debounced)
  useEffect(() => {
    void persistWorkingState();
  }, [
    deal,
    sandbox,
    posture,
    repairRates,
    activeRepairProfileId,
    dbDeal?.id,
    dbDeal?.org_id,
    userId,
    supabase,
    lastRunId,
    persistWorkingState,
  ]);

  const saveWorkingStateNow = useCallback(
    async (opts?: { payload?: WorkingStatePayload }) => {
      await persistWorkingState({ payload: opts?.payload, debounceMs: 0 });
    },
    [persistWorkingState],
  );

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
      autosaveStatus,
      saveWorkingStateNow,
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
      negotiationPlaybook,
      negotiatorMessages,
      negotiatorLogicRowIds,
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
      setNegotiationPlaybook,
      setNegotiatorMessages,
      appendNegotiatorMessage,
      clearNegotiatorThread,
      setNegotiatorLogicRowIds,
      negotiatorTone,
      setNegotiatorTone,
      membershipRole,
      isHydratingActiveDeal,
      hydratedDealId,
      refreshDeal,
    }),
    [
      deal,
      sandbox,
      posture,
      autosaveStatus,
      saveWorkingStateNow,
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
      negotiationPlaybook,
      negotiatorMessages,
      negotiatorLogicRowIds,
      negotiatorTone,
      dbDeal,
      loadSandbox,
      refreshRepairRates,
      appendNegotiatorMessage,
      clearNegotiatorThread,
      setNegotiatorTone,
      membershipRole,
      isHydratingActiveDeal,
      hydratedDealId,
      refreshDeal,
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
