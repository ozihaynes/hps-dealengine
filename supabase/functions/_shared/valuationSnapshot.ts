import { createSupabaseClient, fingerprintAddress, toCanonical } from "./valuation.ts";
import type { ValuationPolicyShape } from "./valuation.ts";

export type SnapshotRow = {
  id: string;
  org_id: string;
  address_fingerprint: string;
  source: string;
  provider: string | null;
  as_of: string;
  window_days: number | null;
  sample_n: number | null;
  comps: unknown;
  market: unknown;
  raw: unknown;
  stub: boolean;
  expires_at?: string | null;
  created_at?: string;
};

type DealRow = {
  id: string;
  org_id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type ValuationPolicy = ValuationPolicyShape;

function safeNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildStubComps(fingerprint: string) {
  const seed = parseInt(fingerprint.slice(0, 8), 16) || 1;
  const basePrice = 200000 + (seed % 50000);
  const comps = [];
  for (let i = 0; i < 3; i++) {
    const price = basePrice + i * 5000;
    comps.push({
      id: `${fingerprint.slice(0, 6)}-${i + 1}`,
      address: `Stub ${i + 1} Main St`,
      city: "Stubville",
      state: "FL",
      postal_code: "00000",
      close_date: new Date(Date.UTC(2024, i, 15)).toISOString(),
      price,
      price_per_sqft: null,
      beds: 3,
      baths: 2,
      sqft: 1500 + i * 50,
      lot_sqft: 6000,
      year_built: 1995 + i,
      distance_miles: 0.5 + i * 0.1,
      source: "stub-rentcast",
      as_of: new Date().toISOString(),
      raw: null,
    });
  }
  return comps;
}

async function fetchRentcast(address: DealRow) {
  const apiKey = Deno.env.get("RENTCAST_API_KEY");
  if (!apiKey) {
    return {
      stub: true,
      provider: "rentcast-stub",
      asOf: new Date().toISOString(),
      comps: buildStubComps(await fingerprintAddress(address)),
      estimate: null,
      rangeLow: null,
      rangeHigh: null,
      market: null,
      raw: { stub: true },
    };
  }

  const params = new URLSearchParams();
  if (address.address) params.set("address", address.address);
  if (address.city) params.set("city", address.city);
  if (address.state) params.set("state", address.state);
  if (address.zip) params.set("zipCode", address.zip);
  const url = `https://api.rentcast.io/v1/avm/value?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });

  if (!res.ok) {
    console.warn("[v1-connectors-proxy] rentcast fetch failed", res.status, await res.text());
    return {
      stub: true,
      provider: "rentcast-stub",
      asOf: new Date().toISOString(),
      comps: buildStubComps(await fingerprintAddress(address)),
      estimate: null,
      rangeLow: null,
      rangeHigh: null,
      market: null,
      raw: { stub: true, reason: `rentcast_status_${res.status}` },
    };
  }

  const json = await res.json();
  const comps = Array.isArray((json as any)?.comparables)
    ? ((json as any).comparables as any[]).map((c, idx) => ({
        id: c.id?.toString?.() ?? `rentcast-${idx}`,
        address: c.formattedAddress ?? c.addressLine1 ?? c.address ?? "",
        city: c.city ?? null,
        state: c.state ?? null,
        postal_code: c.zipCode ?? c.zipcode ?? c.postal_code ?? null,
        latitude: safeNumber(c.latitude),
        longitude: safeNumber(c.longitude),
        close_date: c.closeDate ?? c.close_date ?? null,
        price: safeNumber(c.price),
        price_per_sqft: safeNumber(c.pricePerSquareFoot),
        beds: safeNumber(c.beds),
        baths: safeNumber(c.baths),
        sqft: safeNumber(c.sqft ?? c.livingArea),
        lot_sqft: safeNumber(c.lotSize),
        year_built: safeNumber(c.yearBuilt),
        distance_miles: safeNumber(c.distance),
        correlation: safeNumber(c.correlation),
        days_old: safeNumber(c.daysOld),
        days_on_market: safeNumber(c.daysOnMarket),
        status: c.status ?? null,
        listing_type: c.listingType ?? null,
        source: "rentcast",
        as_of: new Date().toISOString(),
        raw: c,
      }))
    : [];

  return {
    stub: false,
    provider: "rentcast",
    asOf: new Date().toISOString(),
    comps,
    estimate: safeNumber((json as any)?.price),
    rangeLow: safeNumber((json as any)?.priceRangeLow),
    rangeHigh: safeNumber((json as any)?.priceRangeHigh),
    market: null,
    raw: json,
  };
}

async function fetchRentcastMarket(zip: string | null | undefined) {
  const apiKey = Deno.env.get("RENTCAST_API_KEY");
  if (!apiKey || !zip) return null;
  const url = `https://api.rentcast.io/v1/markets?zipCode=${encodeURIComponent(zip)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });
  if (!res.ok) {
    console.warn("[v1-connectors-proxy] rentcast market fetch failed", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const first = Array.isArray(json) && json.length > 0 ? json[0] : null;
  if (!first) return null;
  const dom = safeNumber(first.medianDaysOnMarket) ?? safeNumber(first.averageDaysOnMarket);
  return {
    dom_zip_days: dom,
    moi_zip_months: null,
    price_to_list_pct: null,
    local_discount_pct_p20: null,
    source: "rentcast/markets",
    as_of: new Date().toISOString(),
    window_days: null,
    sample_n: null,
    raw: first,
  };
}

export async function loadDealAndOrg(
  supabase: ReturnType<typeof createSupabaseClient>,
  dealId: string,
): Promise<DealRow> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, org_id, address, city, state, zip")
    .eq("id", dealId)
    .maybeSingle<DealRow>();

  if (error) throw error;
  if (!data) throw new Error("deal_not_found");
  return data;
}

export async function getExistingSnapshot(
  supabase: ReturnType<typeof createSupabaseClient>,
  orgId: string,
  fingerprint: string,
  source: string,
): Promise<SnapshotRow | null> {
  const { data, error } = await supabase
    .from("property_snapshots")
    .select(
      "id, org_id, address_fingerprint, source, provider, as_of, window_days, sample_n, comps, market, raw, stub, expires_at, created_at",
    )
    .eq("org_id", orgId)
    .eq("address_fingerprint", fingerprint)
    .eq("source", source)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SnapshotRow>();

  if (error) throw error;
  return data ?? null;
}

export async function createSnapshot(
  supabase: ReturnType<typeof createSupabaseClient>,
  orgId: string,
  fingerprint: string,
  source: string,
  payload: {
    provider: string | null;
    comps: unknown;
    market?: unknown;
    raw?: unknown;
    stub: boolean;
    asOf: string;
    window_days?: number | null;
    sample_n?: number | null;
    expires_at?: string | null;
  },
): Promise<SnapshotRow> {
  const insertPayload = {
    org_id: orgId,
    address_fingerprint: fingerprint,
    source,
    provider: payload.provider,
    as_of: payload.asOf,
    window_days: payload.window_days ?? null,
    sample_n: payload.sample_n ?? null,
    comps: toCanonical(payload.comps ?? null),
    market: payload.market ?? null,
    raw: payload.raw ?? null,
    stub: payload.stub,
    expires_at: payload.expires_at ?? null,
  };

  const { data, error } = await supabase
    .from("property_snapshots")
    .insert(insertPayload)
    .select(
      "id, org_id, address_fingerprint, source, provider, as_of, window_days, sample_n, comps, market, raw, stub, expires_at, created_at",
    )
    .maybeSingle<SnapshotRow>();

  if (error || !data) throw error ?? new Error("snapshot_insert_failed");
  return data;
}

export async function ensureSnapshotForDeal(opts: {
  supabase: ReturnType<typeof createSupabaseClient>;
  deal: DealRow;
  source?: string;
  forceRefresh?: boolean;
  policyValuation: ValuationPolicy;
}) {
  const source = opts.source ?? "rentcast";
  const fingerprint = await fingerprintAddress(opts.deal);

  const ttl = opts.policyValuation.snapshot_ttl_hours;
  if (ttl == null || !Number.isFinite(Number(ttl))) {
    throw new Error("policy_missing_token:snapshot_ttl_hours");
  }

  if (!opts.forceRefresh) {
    const existing = await getExistingSnapshot(
      opts.supabase,
      opts.deal.org_id,
      fingerprint,
      source,
    );
    if (existing) {
      const expiresAt = existing.expires_at ? new Date(existing.expires_at) : null;
      if (!expiresAt || expiresAt > new Date()) {
        return { snapshot: existing, created: false, fingerprint };
      }
    }
  }

  const providerPayload = await fetchRentcast(opts.deal);
  const market = await fetchRentcastMarket(opts.deal.zip);
  const asOf = providerPayload.asOf ?? new Date().toISOString();
  const expiresAt = new Date(new Date(asOf).getTime() + Number(ttl) * 60 * 60 * 1000);

  const snapshot = await createSnapshot(opts.supabase, opts.deal.org_id, fingerprint, source, {
    provider: providerPayload.provider,
    comps: providerPayload.comps ?? [],
    market: market
      ? {
          ...market,
          avm_price: providerPayload.estimate,
          avm_price_range_low: providerPayload.rangeLow,
          avm_price_range_high: providerPayload.rangeHigh,
        }
      : providerPayload.estimate != null
      ? {
          avm_price: providerPayload.estimate,
          avm_price_range_low: providerPayload.rangeLow,
          avm_price_range_high: providerPayload.rangeHigh,
          source: "rentcast/avm",
          as_of: asOf,
        }
      : null,
    raw: {
      avm: providerPayload.raw ?? null,
      market: market?.raw ?? null,
    },
    stub: providerPayload.stub,
    asOf,
    window_days: null,
    sample_n: Array.isArray(providerPayload.comps) ? providerPayload.comps.length : null,
    expires_at: expiresAt.toISOString(),
  });

  return { snapshot, created: true, fingerprint };
}
