/**
 * apps/hps-dealengine/lib/repairRates.ts
 *
 * Helper to fetch normalized repair rate sets for the current org/market
 * via the v1-repair-rates Edge Function.
 */
"use client";

import { useEffect, useState } from "react";
import type {
  Posture,
  RepairRates as RepairRatesContract,
  RepairRatesRequest,
} from "@hps-internal/contracts";
import { repairRatesRequestSchema } from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type RepairRates = RepairRatesContract;

type CacheEntry = { data: RepairRates; cachedAt: number };
const CACHE_KEY = "hps-repair-rates-cache";
const TTL_MS = 5 * 60 * 1000; // 5 minutes to reduce staleness during debugging

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

function extractInvokeErrorMessage(error: unknown, data: unknown, fallback: string): string {
  const payloads: unknown[] = [];
  if (data) payloads.push(data);
  const ctx = (error as any)?.context;
  if (ctx?.body) payloads.push(ctx.body);
  if (ctx?.response?.body) payloads.push(ctx.response.body);
  if (ctx?.response?.error) payloads.push(ctx.response.error);

  for (const body of payloads) {
    if (!body) continue;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === "object") {
          const msg =
            (parsed as any).message ??
            (parsed as any).error ??
            (parsed as any).details;
          if (typeof msg === "string" && msg.trim().length > 0) {
            return msg.trim();
          }
        }
      } catch {
        if (body.trim().length > 0) return body.trim();
      }
    }
    if (typeof body === "object") {
      const msg =
        (body as any).message ??
        (body as any).error ??
        (body as any).details;
      if (typeof msg === "string" && msg.trim().length > 0) {
        return msg.trim();
      }
    }
  }

  const fallbackMsg =
    (error as any)?.message && typeof (error as any).message === "string"
      ? (error as any).message.trim()
      : null;
  return fallbackMsg && fallbackMsg.length > 0 ? fallbackMsg : fallback;
}

/**
 * Fetch the active repair rates for the caller's org + given market/posture/profile.
 *
 * - Resolves org_id from memberships if not provided.
 * - Calls v1-repair-rates with { dealId, marketCode, posture, profileId }.
 * - Returns a normalized RepairRates object or null on failure.
 */
export async function fetchRepairRates(args: {
  dealId: string;
  marketCode: string;
  posture: Posture;
  profileId?: string | null;
}): Promise<RepairRates | null> {
  const supabase = getSupabaseClient();
  const parsed = repairRatesRequestSchema.safeParse({
    dealId: args?.dealId,
    marketCode: args?.marketCode,
    posture: args?.posture,
    profileId: args?.profileId ?? null,
  } as RepairRatesRequest);

  if (!parsed.success) {
    throw new Error("Invalid repair rates request payload");
  }

  const { dealId, marketCode, posture, profileId } = parsed.data;

  try {
    const normalizedMarket = (marketCode ?? "ORL").toUpperCase();
    const normalizedPosture = (posture ?? "base").toLowerCase();

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token ?? null;

    if (process.env.NODE_ENV !== "production") {
      console.debug("[repairRates] invoke v1-repair-rates", {
        dealId,
        marketCode: normalizedMarket,
        posture: normalizedPosture,
        profileId,
        hasAuth: !!accessToken,
      });
    }

    const { data, error } = await supabase.functions.invoke("v1-repair-rates", {
      body: { dealId, marketCode: normalizedMarket, posture: normalizedPosture, profileId },
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });

    if (error) {
      const message = extractInvokeErrorMessage(
        error,
        data,
        "Failed to load repair rates",
      );
      throw new Error(message);
    }
    if (!data) {
      throw new Error("No data returned from v1-repair-rates");
    }

    if ((data as any).ok === false || (data as any).hasData === false) {
      const message =
        (data as any).message ??
        (data as any).error ??
        "Failed to load repair rates";
      throw new Error(message);
    }

    // Normalize casing and shape from the Edge Function payload
    const payload: any = data;

    if (process.env.NODE_ENV !== "production") {
      console.debug("[repairRates] received payload", {
        hasData: !!payload,
        profileId: payload?.profileId ?? payload?.id,
        marketCode: payload?.marketCode,
        posture: payload?.posture,
        psf: payload?.psfTiers,
        big5: payload?.big5,
      });
    }

    const psf = payload.psfTiers ?? {};
    const big5 = payload.big5 ?? {};
    const lineItemRates =
      payload.items ?? payload.lineItemRates ?? {};

    if (!payload.profileId && !payload.id) {
      throw new Error("Malformed repair rates response (missing profileId)");
    }

    return {
      profileId: payload.profileId ?? payload.id ?? null,
      profileName: payload.profileName ?? payload.name ?? null,
      orgId: payload.orgId,
      posture: payload.posture ?? posture,
      marketCode: payload.marketCode ?? marketCode,
      asOf: payload.asOf ?? "unknown",
      source: payload.source ?? null,
      version: payload.version ?? "v1",
      isDefault: payload.isDefault ?? false,
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
      lineItemRates,
      // Backwards-compat alias used by existing UI
      items: lineItemRates,
    } as RepairRates & { items?: Record<string, unknown> };
  } catch (err) {
    console.error("[repairRates] fetch failed:", err);
    throw err;
  }
}

export function useRepairRates(
  args?: {
    dealId?: string | null;
    marketCode?: string;
    posture?: Posture;
    profileId?: string | null;
  },
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
  const dealId = args?.dealId ?? null;
  const marketCode = args?.marketCode ?? "ORL";
  const posture = args?.posture ?? "base";
  const profileId = args?.profileId ?? null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      if (!dealId) {
        setError("dealId is required to load repair rates.");
        setStatus("error");
        return;
      }

      const cacheKey = `${dealId}|${posture}|${marketCode}|${
        profileId ?? "active"
      }`;
      const cache = readCache();
      const cached = cache[cacheKey];
      const isFresh =
        cached && Date.now() - cached.cachedAt < (ttlMs || TTL_MS);

      if (cached && isFresh) {
        setData(cached.data);
        setStatus("loaded");
      }

      try {
        const fetched = await fetchRepairRates({
          dealId,
          marketCode,
          posture,
          profileId,
        });
        if (cancelled) return;
        if (fetched) {
          setData(fetched);
          setStatus("loaded");
          cache[cacheKey] = { data: fetched, cachedAt: Date.now() };
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
  }, [marketCode, ttlMs, dealId, posture, profileId]);

  const refresh = async () => {
    setStatus("loading");
    setError(null);
    if (!dealId) {
      setStatus("error");
      setError("dealId is required to load repair rates.");
      return;
    }

    try {
      const fetched = await fetchRepairRates({
        dealId,
        marketCode,
        posture,
        profileId,
      });
      if (fetched) {
        setData(fetched);
        setStatus("loaded");
        const cache = readCache();
        const cacheKey = `${dealId}|${posture}|${marketCode}|${
          profileId ?? "active"
        }`;
        cache[cacheKey] = { data: fetched, cachedAt: Date.now() };
        writeCache(cache);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[repairRates] refresh applied", {
            profileId: fetched.profileId,
            marketCode: fetched.marketCode,
            posture: fetched.posture,
          });
        }
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
