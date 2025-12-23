import { createSupabaseClient, fingerprintAddress, toCanonical } from "./valuation.ts";
import type { ValuationPolicyShape } from "./valuation.ts";
import { sortCompsDeterministic, type BasicComp } from "./valuationComps.ts";
import { buildRentcastClosedSalesRequest, formatRentcastAddress } from "./rentcastAddress.ts";
import { fetchPublicRecordsSubject } from "./publicRecordsSubject.ts";

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
  payload?: Record<string, unknown> | null;
};

export type ValuationPolicy = ValuationPolicyShape;

type RequestResponse = { request: string | null; response: unknown };

type SubjectResult = {
  stub: boolean;
  raw: RequestResponse;
  subject:
    | {
        latitude: number | null;
        longitude: number | null;
        propertyType: string | null;
        beds: number | null;
        baths: number | null;
        sqft: number | null;
        year_built: number | null;
        as_of: string | null;
      }
    | null;
  request: string | null;
};

type ClosedSalesResult = {
  comps: BasicComp[];
  stub: boolean;
  raw: RequestResponse;
  fetchFailed: boolean;
  request: string | null;
};

type AvmResult = {
  stub: boolean;
  provider: string | null;
  asOf: string;
  comps: BasicComp[];
  estimate: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  market: unknown;
  raw: RequestResponse;
  request: string | null;
};

type MarketSummary = {
  dom_zip_days: number | null;
  moi_zip_months: number | null;
  price_to_list_pct: number | null;
  local_discount_pct_p20: number | null;
  source: string;
  as_of: string;
  window_days: number | null;
  sample_n: number | null;
  raw: RequestResponse;
};

type MarketResult = {
  summary: MarketSummary | null;
  raw: RequestResponse;
  stub: boolean;
};

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 3958.8; // miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aVal = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolvePrice(value: any): number | null {
  return safeNumber(
    value?.lastSalePrice ??
      value?.lastSoldPrice ??
      value?.last_sale_price ??
      value?.salePrice ??
      value?.sale_price ??
      value?.price,
  );
}

function resolveListingPrice(value: any): number | null {
  return safeNumber(value?.price ?? value?.listPrice ?? value?.listingPrice ?? value?.listing_price);
}

function resolveSqft(value: any): number | null {
  return safeNumber(value?.sqft ?? value?.livingArea ?? value?.squareFootage ?? value?.square_footage ?? value?.area);
}

function resolveCloseDate(value: any): string | null {
  return (
    value?.lastSaleDate ??
    value?.lastSoldDate ??
    value?.last_sale_date ??
    value?.closeDate ??
    value?.close_date ??
    value?.listedDate ??
    null
  );
}

function resolveId(value: any, idx: number): string {
  const id = value?.id?.toString?.();
  if (id) return id;
  const address = value?.formattedAddress ?? value?.addressLine1 ?? value?.address ?? "";
  const closeDate = resolveCloseDate(value) ?? "";
  const price = resolvePrice(value) ?? resolveListingPrice(value) ?? "";
  const key = [address, closeDate, price].join("|");
  return key || `rentcast-${idx}`;
}

function canonicalizePropertyType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
}

const rentcastAllowedPropertyTypes = [
  "Single Family",
  "Condo",
  "Townhouse",
  "Multi Family",
  "Apartment",
  "Manufactured",
  "Land",
  "Other",
] as const;

const normalizeRentcastType = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

function rentcastPropertyTypeSafe(raw: string | null | undefined, canonical?: string | null): string | null {
  const candidates: Array<string | null | undefined> = [raw, canonical];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.trim() === "") continue;
    const norm = normalizeRentcastType(candidate);
    const match = rentcastAllowedPropertyTypes.find((v) => normalizeRentcastType(v) === norm);
    if (match) return match;
  }
  return null;
}

function buildStubComps(fingerprint: string, asOf: string) {
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
      comp_kind: "sale_listing",
      status: "stub",
      listing_type: "stub",
      source: "stub-rentcast",
      as_of,
      raw: null,
    });
  }
  return comps;
}

function getRentcastApiKey() {
  return Deno.env.get("RENTCAST_API_KEY") ?? null;
}

async function fetchRentcastSubject(address: DealRow, asOf: string, apiKey: string | null): Promise<SubjectResult> {
  const params = new URLSearchParams();
  const formattedAddress = formatRentcastAddress(address);
  if (formattedAddress) {
    params.set("address", formattedAddress);
  }
  const request = params.toString() || null;

  if (!apiKey) {
    return { stub: true, raw: { request, response: { error: "missing_api_key" } }, subject: null, request };
  }
  if (!formattedAddress) {
    return {
      stub: true,
      raw: { request: null, response: { error: "missing_address" } },
      subject: null,
      request: null,
    };
  }

  const paramsForUrl = new URLSearchParams(request ?? "");
  const url = `https://api.rentcast.io/v1/properties?${paramsForUrl.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn("[v1-valuation] rentcast properties fetch failed", res.status, body);
    return {
      stub: true,
      raw: { request, response: { error: `rentcast_status_${res.status}`, body: body || null } },
      subject: null,
      request,
    };
  }
  const json = await res.json();
  const resolved = Array.isArray(json) && json.length > 0 ? json[0] : json;
  if (!resolved) {
    return {
      stub: true,
      raw: { request, response: json ?? { error: "empty_subject_response" } },
      subject: null,
      request,
    };
  }

  const resolvedSubject = {
    latitude: safeNumber((resolved as any)?.latitude),
    longitude: safeNumber((resolved as any)?.longitude),
    property_type: canonicalizePropertyType((resolved as any)?.propertyType ?? null),
    property_type_raw: typeof (resolved as any)?.propertyType === "string" ? (resolved as any).propertyType : null,
    beds: safeNumber((resolved as any)?.bedrooms),
    baths: safeNumber((resolved as any)?.bathrooms),
    sqft: safeNumber((resolved as any)?.squareFootage),
    year_built: safeNumber((resolved as any)?.yearBuilt),
    as_of: asOf,
  };

  return {
    stub: false,
    raw: { request, response: json },
    subject: resolvedSubject,
    request,
  };
}

async function fetchRentcastAvm(address: DealRow, asOf: string, apiKey: string | null): Promise<AvmResult> {
  const params = new URLSearchParams();
  if (address.address) params.set("address", address.address);
  if (address.city) params.set("city", address.city);
  if (address.state) params.set("state", address.state);
  if (address.zip) params.set("zipCode", address.zip);
  const request = params.toString() || null;

  if (!apiKey) {
    return {
      stub: true,
      provider: "rentcast-stub",
      asOf,
      comps: buildStubComps(await fingerprintAddress(address), asOf),
      estimate: null,
      rangeLow: null,
      rangeHigh: null,
      market: null,
      raw: { request, response: { error: "missing_api_key", stub: true } },
      request,
    };
  }

  const url = `https://api.rentcast.io/v1/avm/value?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn("[v1-valuation] rentcast AVM fetch failed", res.status, body);
    return {
      stub: true,
      provider: "rentcast-stub",
      asOf,
      comps: buildStubComps(await fingerprintAddress(address), asOf),
      estimate: null,
      rangeLow: null,
      rangeHigh: null,
      market: null,
      raw: { request, response: { error: `rentcast_status_${res.status}`, body: body || null } },
      request,
    };
  }

  const json = await res.json();
  const comps = Array.isArray((json as any)?.comparables)
    ? ((json as any).comparables as any[]).map((c, idx) => ({
        id: resolveId(c, idx),
        address: c.formattedAddress ?? c.addressLine1 ?? c.address ?? "",
        city: c.city ?? null,
        state: c.state ?? null,
        postal_code: c.zipCode ?? c.zipcode ?? c.postal_code ?? null,
        latitude: safeNumber(c.latitude),
        longitude: safeNumber(c.longitude),
        close_date: c.closeDate ?? c.close_date ?? c.listedDate ?? null,
        price: resolveListingPrice(c),
        price_per_sqft: safeNumber(c.pricePerSquareFoot),
        beds: safeNumber(c.beds ?? c.bedrooms),
        baths: safeNumber(c.baths ?? c.bathrooms),
        sqft: resolveSqft(c),
        lot_sqft: safeNumber(c.lotSize),
        year_built: safeNumber(c.yearBuilt),
        property_type: canonicalizePropertyType(c.propertyType ?? c.property_type ?? null),
        distance_miles: safeNumber(c.distance),
        correlation: safeNumber(c.correlation),
        days_old: safeNumber(c.daysOld),
        days_on_market: safeNumber(c.daysOnMarket),
        status: c.status ?? null,
        listing_type: c.listingType ?? null,
        comp_kind: "sale_listing",
        source: "rentcast",
        as_of: asOf,
        raw: c,
      }))
    : [];

  return {
    stub: false,
    provider: "rentcast",
    asOf,
    comps,
    estimate: safeNumber((json as any)?.price),
    rangeLow: safeNumber((json as any)?.priceRangeLow),
    rangeHigh: safeNumber((json as any)?.priceRangeHigh),
    market: null,
    raw: { request, response: json },
    request,
  };
}

async function fetchRentcastMarket(zip: string | null | undefined, asOf: string, apiKey: string | null): Promise<MarketResult> {
  const params = new URLSearchParams();
  if (zip) params.set("zipCode", zip);
  const request = params.toString() || null;

  if (!apiKey) {
    return { summary: null, raw: { request, response: { error: "missing_api_key" } }, stub: true };
  }
  if (!zip) {
    return { summary: null, raw: { request, response: { error: "missing_zip" } }, stub: true };
  }
  const url = `https://api.rentcast.io/v1/markets?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn("[v1-valuation] rentcast market fetch failed", res.status, body);
    return { summary: null, raw: { request, response: { error: `rentcast_status_${res.status}`, body: body || null } }, stub: false };
  }
  const json = await res.json();
  const first = Array.isArray(json) && json.length > 0 ? json[0] : null;
  if (!first) {
    return { summary: null, raw: { request, response: json ?? [] }, stub: false };
  }
  const dom = safeNumber(first.medianDaysOnMarket) ?? safeNumber(first.averageDaysOnMarket);
  const raw = { request, response: first };
  return {
    summary: {
      dom_zip_days: dom,
      moi_zip_months: null,
      price_to_list_pct: null,
      local_discount_pct_p20: null,
      source: "rentcast/markets",
      as_of: asOf,
      window_days: null,
      sample_n: null,
      raw,
    },
    raw,
    stub: false,
  };
}

export async function fetchRentcastClosedSales(opts: {
  address: DealRow;
  asOf: string;
  apiKey: string | null;
  saleDateRangeDays: number;
  radiusMiles: number;
  subjectProperty: {
    latitude: number | null;
    longitude: number | null;
    propertyType: string | null;
    propertyTypeRaw?: string | null;
  } | null;
  stageName?: string | null;
}): Promise<ClosedSalesResult> {
  const { address, asOf, apiKey, saleDateRangeDays, radiusMiles, subjectProperty, stageName } = opts;
  const { request, hasAddress } = buildRentcastClosedSalesRequest({
    deal: address,
    radiusMiles,
    saleDateRangeDays,
    propertyType: rentcastPropertyTypeSafe(subjectProperty?.propertyTypeRaw, subjectProperty?.propertyType ?? null),
  });

  if (!apiKey) {
    return {
      comps: [] as BasicComp[],
      stub: true,
      raw: { request, response: { error: "missing_api_key" } },
      fetchFailed: false,
      request,
    };
  }
  if (!hasAddress) {
    return {
      comps: [] as BasicComp[],
      stub: true,
      raw: { request: null, response: { error: "missing_address" } },
      fetchFailed: true,
      request: null,
    };
  }

  const url = request ? `https://api.rentcast.io/v1/properties?${request}` : "https://api.rentcast.io/v1/properties";
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn("[v1-valuation] rentcast closed sales fetch failed", res.status, body);
    return {
      comps: [] as BasicComp[],
      stub: false,
      raw: { request, response: { error: `rentcast_status_${res.status}`, body: body || null } },
      fetchFailed: true,
      request,
    };
  }
  const json = await res.json();
  const comps: BasicComp[] = Array.isArray(json)
    ? (json as any[]).map((c, idx) => ({
        id: resolveId(c, idx),
        address: c.formattedAddress ?? c.addressLine1 ?? c.address ?? "",
        city: c.city ?? null,
        state: c.state ?? null,
        postal_code: c.zipCode ?? c.zipcode ?? c.postal_code ?? null,
        latitude: safeNumber(c.latitude),
        longitude: safeNumber(c.longitude),
        close_date: resolveCloseDate(c),
        price: resolvePrice(c),
        price_per_sqft: safeNumber(c.lastSalePricePerSquareFoot ?? c.pricePerSquareFoot),
        beds: safeNumber(c.beds ?? c.bedrooms),
        baths: safeNumber(c.baths ?? c.bathrooms),
        sqft: resolveSqft(c),
        lot_sqft: safeNumber(c.lotSize),
        year_built: safeNumber(c.yearBuilt),
        property_type: canonicalizePropertyType(c.propertyType ?? c.property_type ?? null),
        distance_miles:
          subjectProperty?.latitude != null &&
          subjectProperty?.longitude != null &&
          Number.isFinite(Number(c.latitude)) &&
          Number.isFinite(Number(c.longitude))
            ? haversineMiles(
                { lat: Number(subjectProperty.latitude), lon: Number(subjectProperty.longitude) },
                { lat: Number(c.latitude), lon: Number(c.longitude) },
              )
            : null,
        correlation: null,
        days_old: null,
        days_on_market: null,
        status: c.status ?? null,
        listing_type: null,
        comp_kind: "closed_sale",
        source: "rentcast",
        as_of: asOf,
        source_stage_name: stageName ?? null,
        raw: c,
      }))
    : [];

  return {
    comps,
    stub: false,
    raw: { request, response: json },
    fetchFailed: false,
    request,
  };
}

export async function fetchClosedSalesLadder(opts: {
  address: DealRow;
  asOf: string;
  apiKey: string | null;
  policyValuation: ValuationPolicy;
  subjectProperty: {
    latitude: number | null;
    longitude: number | null;
    propertyType: string | null;
    propertyTypeRaw?: string | null;
  } | null;
}): Promise<{
  comps: BasicComp[];
  raw: {
    stages: Array<{
      name: string;
      radius_miles: number;
      sale_date_range_days: number;
      request: string | null;
      response: unknown;
      fetched_count: number;
      priced_count: number;
    }>;
    stop_reason: string;
  };
  fetchFailed: boolean;
}> {
  const ladder =
    opts.policyValuation.closed_sales_ladder && Array.isArray(opts.policyValuation.closed_sales_ladder)
      ? opts.policyValuation.closed_sales_ladder
      : [
          { name: "r0_5_d90", radius_miles: 0.5, sale_date_range_days: 90 },
          { name: "r1_0_d90", radius_miles: 1.0, sale_date_range_days: 90 },
          { name: "r1_0_d180", radius_miles: 1.0, sale_date_range_days: 180 },
          { name: "r3_0_d365", radius_miles: 3.0, sale_date_range_days: 365 },
        ];

  const targetPriced = Number(opts.policyValuation.closed_sales_target_priced ?? 12);

  const seen = new Set<string>();
  const all: BasicComp[] = [];
  const stages: Array<{
    name: string;
    radius_miles: number;
    sale_date_range_days: number;
    request: string | null;
    response: unknown;
    fetched_count: number;
    priced_count: number;
  }> = [];
  let totalPriced = 0;
  let fetchFailed = false;

  for (const stage of ladder) {
    const stageName = stage.name ?? `stage_${stage.radius_miles ?? 0}_${stage.sale_date_range_days ?? 0}`;
    const res = await fetchRentcastClosedSales({
      address: opts.address,
      asOf: opts.asOf,
      apiKey: opts.apiKey,
      saleDateRangeDays: Number(stage.sale_date_range_days ?? 0),
      radiusMiles: Number(stage.radius_miles ?? 0),
      subjectProperty: opts.subjectProperty,
      stageName,
    });
    if (res.fetchFailed) {
      fetchFailed = true;
    }

    const pricedCount = res.comps.filter((c) => safeNumber((c as any)?.price) != null).length;
    stages.push({
      name: stageName,
      radius_miles: Number(stage.radius_miles ?? 0),
      sale_date_range_days: Number(stage.sale_date_range_days ?? 0),
      request: res.raw.request,
      response: res.raw.response,
      fetched_count: res.comps.length,
      priced_count: pricedCount,
    });

    for (const comp of res.comps) {
      const key = (comp.id ?? "") || `${comp.address ?? ""}|${comp.close_date ?? ""}|${comp.price ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(comp);
      if (safeNumber((comp as any)?.price) != null) {
        totalPriced += 1;
      }
    }

    if (totalPriced >= targetPriced) {
      break;
    }
  }

  const stop_reason = totalPriced >= targetPriced ? "target_reached" : "exhausted";

  return {
    comps: all,
    raw: { stages, stop_reason },
    fetchFailed,
  };
}

export async function loadDealAndOrg(
  supabase: ReturnType<typeof createSupabaseClient>,
  dealId: string,
): Promise<DealRow> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, org_id, address, city, state, zip, payload")
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
    market: toCanonical(payload.market ?? null),
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
  const ladder = opts.policyValuation.closed_sales_ladder;
  const windowDays =
    ladder && Array.isArray(ladder) && ladder.length
      ? Math.max(...ladder.map((s) => Number(s.sale_date_range_days ?? 0)))
      : opts.policyValuation.closed_sales_sale_date_range_days ?? null;

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

  const apiKey = getRentcastApiKey();
  const asOf = new Date().toISOString();
  const subjectProperty = await fetchRentcastSubject(opts.deal, asOf, apiKey);
  const subjectSources = new Set<string>();
  if (subjectProperty.subject) subjectSources.add("rentcast");

  let subjectResolved = subjectProperty.subject
    ? {
        ...subjectProperty.subject,
        property_type: subjectProperty.subject.property_type,
        property_type_raw: (subjectProperty.subject as any)?.property_type_raw ?? null,
      }
    : null;

  // Public records subject enrichment (ATTOM-only)
  const publicRecordsCfg = (opts.policyValuation as any)?.public_records_subject ?? {};
  let publicRecordsRaw: any = null;
  const preferPublic = publicRecordsCfg?.prefer_over_rentcast_subject === true;
  const hasMissingSubjectFields =
    !subjectResolved ||
    [subjectResolved.sqft, subjectResolved.beds, subjectResolved.baths, subjectResolved.year_built, subjectResolved.property_type, subjectResolved.latitude, subjectResolved.longitude].some(
      (v) => v === null || v === undefined,
    );

  if (publicRecordsCfg?.enabled) {
    const address = formatRentcastAddress(opts.deal);
    const shouldAttempt = preferPublic || hasMissingSubjectFields;
    publicRecordsRaw = {
      provider: "attom",
      attempted: shouldAttempt,
      skipped_reason: shouldAttempt ? null : "not_needed",
      request: { address, endpoint: "property/basicprofile" },
      response: null,
      normalized: null,
      as_of: asOf,
      error: null,
    };

    if (shouldAttempt) {
      const prResult = await fetchPublicRecordsSubject({ address, provider: "attom" });
      subjectSources.add("attom");
      publicRecordsRaw.request = prResult.raw?.request ?? { address, endpoint: "property/basicprofile" };
      publicRecordsRaw.response = prResult.raw?.response ?? null;
      publicRecordsRaw.normalized = prResult.normalized ?? null;
      publicRecordsRaw.as_of = prResult.as_of ?? asOf;
      publicRecordsRaw.error = prResult.ok ? null : prResult.error ?? "public_records_error";

      if (prResult.ok && prResult.normalized) {
        const normalized = prResult.normalized;
        if (!subjectResolved) {
          subjectResolved = { ...normalized, property_type: normalized.property_type };
        } else {
          const mergeField = (key: string, val: any) => {
            const hasVal = val !== null && val !== undefined;
            if (preferPublic && hasVal) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (subjectResolved as any)[key] = val;
              return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (((subjectResolved as any)[key] === null || (subjectResolved as any)[key] === undefined) && hasVal) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (subjectResolved as any)[key] = val;
            }
          };
          mergeField("beds", normalized.beds);
          mergeField("baths", normalized.baths);
          mergeField("sqft", normalized.sqft);
          mergeField("year_built", normalized.year_built);
          mergeField("property_type", normalized.property_type);
          mergeField("latitude", normalized.latitude);
          mergeField("longitude", normalized.longitude);
        }
      }
    }
  }

  const closedLadder = await fetchClosedSalesLadder({
    address: opts.deal,
    asOf,
    apiKey,
    policyValuation: opts.policyValuation,
    subjectProperty: subjectResolved
      ? {
          latitude: subjectResolved.latitude,
          longitude: subjectResolved.longitude,
          propertyType: subjectResolved.property_type,
          propertyTypeRaw: (subjectResolved as any)?.property_type_raw ?? null,
        }
      : null,
  });

  const closedComps = closedLadder.comps;
  const closedRaw = {
    stages: closedLadder.raw.stages,
    stop_reason: closedLadder.raw.stop_reason,
  };
  const closedFetchFailed = !!closedLadder.fetchFailed;

  const avmPayload = await fetchRentcastAvm(opts.deal, asOf, apiKey);
  const market = await fetchRentcastMarket(opts.deal.zip, asOf, apiKey);

  const compsNormalized: BasicComp[] = [
    ...(closedComps ?? []),
    ...((avmPayload.comps as BasicComp[]) ?? []),
  ].map((c) => ({
    ...c,
    as_of: asOf,
  }));

  const sortedComps = sortCompsDeterministic(compsNormalized);

  const expiresAt = new Date(new Date(asOf).getTime() + Number(ttl) * 60 * 60 * 1000);

  const snapshot = await createSnapshot(opts.supabase, opts.deal.org_id, fingerprint, source, {
    provider: avmPayload.provider ?? "rentcast",
    comps: sortedComps,
    market: market.summary
      ? {
          ...market.summary,
          avm_price: avmPayload.estimate,
          avm_price_range_low: avmPayload.rangeLow,
          avm_price_range_high: avmPayload.rangeHigh,
        }
      : avmPayload.estimate != null
      ? {
          avm_price: avmPayload.estimate,
          avm_price_range_low: avmPayload.rangeLow,
          avm_price_range_high: avmPayload.rangeHigh,
          source: "rentcast/avm",
          as_of: asOf,
        }
      : null,
    raw: {
      avm: (avmPayload.raw?.response as any) ?? null,
      avm_request: avmPayload.raw ?? { request: avmPayload.request ?? null, response: { error: "avm_raw_missing" } },
      market: market.raw ?? { request: null, response: { error: "market_missing" } },
      closed_sales: closedRaw,
      closed_sales_fetch_failed: closedFetchFailed,
      subject_property: subjectProperty.raw ?? { request: subjectProperty.request, response: { error: "subject_missing" } },
      public_records: {
        subject: publicRecordsRaw,
      },
      subject_sources: Array.from(subjectSources),
      subject_property_resolved: subjectResolved
        ? {
            ...subjectResolved,
            property_type: subjectResolved.property_type,
          }
        : null,
    },
    stub: avmPayload.stub && closedComps.length === 0,
    asOf,
    window_days: windowDays != null ? Number(windowDays) : null,
    sample_n: sortedComps.length,
    expires_at: expiresAt.toISOString(),
  });

  return { snapshot, created: true, fingerprint };
}
