"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { createInitialEstimatorState } from "./ui-v2-constants";
import { createInitialSandboxState } from "./ui-v2-constants";
import type { Deal, SandboxSettings } from "../types";
import type { AnalyzeResult } from "@hps-internal/contracts";

import { HPSEngine } from "../services/engine";
import { getSupabaseClient } from "./supabaseClient";

/**
 * Thin typed view of the canonical deals row in public.deals.
 * This gives the app a stable identity + address container to pair with
 * the richer engine-level Deal in memory.
 */
export type DbDeal = {
  id: string;
  org_id: string;
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
  sandbox: SandboxSettings;
  lastAnalyzeResult: AnalyzeResult | null;
  dbDeal: DbDeal | null;
  setDeal: React.Dispatch<React.SetStateAction<Deal>>;
  setSandbox: React.Dispatch<React.SetStateAction<SandboxSettings>>;
  setLastAnalyzeResult: (result: AnalyzeResult | null) => void;
  setDbDeal: (deal: DbDeal | null) => void;
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

export function DealSessionProvider({ children }: { children: ReactNode }) {
  const [deal, setDeal] = useState<Deal>(() => makeInitialDeal());
  const [sandbox, setSandbox] = useState<SandboxSettings>(() =>
    createInitialSandboxState()
  );
  const [lastAnalyzeResult, setLastAnalyzeResult] =
    useState<AnalyzeResult | null>(null);
  const [dbDeal, setDbDeal] = useState<DbDeal | null>(null);

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
      try {
        const { data, error } = await supabase
          .from("deals")
          .select(
            "id, org_id, created_by, created_at, updated_at, address, city, state, zip, payload"
          )
          .eq("id", savedId)
          .maybeSingle();

        if (!error && data) {
          setDbDeal(data as DbDeal);
        }
      } catch {
        // ignore; user can pick a new deal
      }
    };

    void load();
  }, []);

  // When dbDeal changes, sync in-memory deal shape from payload
  useEffect(() => {
    if (dbDeal?.payload) {
      setDeal(normalizeDealShape(dbDeal.payload));
    }
  }, [dbDeal?.payload]);

  // When dbDeal changes, load the latest run for that deal to seed outputs
  useEffect(() => {
    if (!dbDeal?.id || !dbDeal.org_id) {
      return;
    }

    const supabase = getSupabaseClient();

    const loadRun = async () => {
      try {
        const { data, error } = await supabase
          .from("runs")
          .select("id, input, output, trace, created_at")
          .eq("org_id", dbDeal.org_id)
          .eq("input->>dealId", dbDeal.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          setLastAnalyzeResult(null);
          return;
        }
        const output = (data as any).output ?? null;
        if (output) {
          setLastAnalyzeResult(output as AnalyzeResult);
        } else {
          setLastAnalyzeResult(null);
        }
      } catch {
        setLastAnalyzeResult(null);
      }
    };

    void loadRun();
  }, [dbDeal?.id, dbDeal?.org_id]);

  const value = useMemo(
    () => ({
      deal,
      sandbox,
      lastAnalyzeResult,
      dbDeal,
      setDeal,
      setSandbox,
      setLastAnalyzeResult,
      setDbDeal,
    }),
    [deal, sandbox, lastAnalyzeResult, dbDeal]
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
