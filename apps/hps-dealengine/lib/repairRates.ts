/**
 * apps/hps-dealengine/lib/repairRates.ts
 *
 * Helper to fetch normalized repair rate sets for the current org/market
 * via the v1-repair-rates Edge Function.
 */
"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export type RepairRates = {
  asOf: string;
  market: string;
  version: string;
  psfTiers: {
    none: number;
    light: number;
    medium: number;
    heavy: number;
  };
  big5: {
    roof: number;
    hvac: number;
    repipe: number;
    electrical: number;
    foundation: number;
  };
  items?: Record<string, number>;
};

type CacheEntry = { data: RepairRates; cachedAt: number };
const CACHE_KEY = "hps-repair-rates-cache";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
}

/**
 * Fetch the active repair rates for the caller's org + given market.
 *
 * - Resolves org_id from the memberships table using the current user JWT.
 * - Calls v1-repair-rates with { orgId, marketCode }.
 * - Returns a normalized RepairRates object or null on failure.
 */
export async function fetchRepairRates(
  marketCode: string = "ORL",
): Promise<RepairRates | null> {
  const supabase = getSupabase();

  try {
    // Step 1: resolve org_id from memberships for the current user
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .limit(1)
      .single();

    if (membershipError) {
      console.warn("[repairRates] memberships lookup error:", membershipError);
      return null;
    }

    const orgId = (membership as any)?.org_id as string | undefined;
    if (!orgId) {
      console.warn(
        "[repairRates] no org_id found in memberships for current user",
      );
      return null;
    }

    // Step 2: call the Edge Function with orgId + marketCode
    const { data, error } = await supabase.functions.invoke("v1-repair-rates", {
      body: { orgId, marketCode },
    });

    if (error) {
      console.warn("[repairRates] invoke error:", error);
      return null;
    }
    if (!data) {
      console.warn("[repairRates] no data returned");
      return null;
    }

    // Normalize casing and shape from the Edge Function payload
    const payload: any = data;

    const psf = payload.psfTiers ?? {};
    const big5 = payload.big5 ?? {};
    const lineItemRates =
      payload.items ?? payload.lineItemRates ?? {};

    return {
      asOf: payload.asOf ?? "unknown",
      market: payload.market ?? marketCode,
      version: payload.version ?? "v1",
      psfTiers: {
        none: Number(psf.none ?? 0),
        light: Number(psf.light ?? 0),
        medium: Number(psf.medium ?? 0),
        heavy: Number(psf.heavy ?? 0),
      },
      big5: {
        roof: Number(big5.roof ?? 0),
        hvac: Number(big5.hvac ?? 0),
        repipe: Number(big5.repipe ?? 0),
        electrical: Number(big5.electrical ?? 0),
        foundation: Number(big5.foundation ?? 0),
      },
      items: lineItemRates,
    };
  } catch (err) {
    console.error("[repairRates] fetch failed:", err);
    return null;
  }
}

export function useRepairRates(
  marketCode: string = "ORL",
  ttlMs: number = TTL_MS,
): {
  data: RepairRates | null;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<RepairRates | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      const cache = readCache();
      const cached = cache[marketCode];
      const isFresh =
        cached && Date.now() - cached.cachedAt < (ttlMs || TTL_MS);

      if (cached && isFresh) {
        setData(cached.data);
        setStatus("loaded");
      }

      try {
        const fetched = await fetchRepairRates(marketCode);
        if (cancelled) return;
        if (fetched) {
          setData(fetched);
          setStatus("loaded");
          cache[marketCode] = { data: fetched, cachedAt: Date.now() };
          writeCache(cache);
        } else if (!isFresh) {
          setData(null);
          setStatus("error");
          setError("Failed to load repair rates.");
        }
      } catch (err: any) {
        if (cancelled) return;
        if (!isFresh) {
          setData(null);
        }
        setStatus("error");
        setError(err?.message ?? "Failed to load repair rates.");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [marketCode, ttlMs]);

  const refresh = async () => {
    setStatus("loading");
    setError(null);
    try {
      const fetched = await fetchRepairRates(marketCode);
      if (fetched) {
        setData(fetched);
        setStatus("loaded");
        const cache = readCache();
        cache[marketCode] = { data: fetched, cachedAt: Date.now() };
        writeCache(cache);
      } else {
        setStatus("error");
        setError("Failed to load repair rates.");
      }
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Failed to load repair rates.");
    }
  };

  return { data, status, error, refresh };
}
