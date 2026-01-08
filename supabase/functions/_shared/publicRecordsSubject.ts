import { isAttomEnabled } from "./valuationFeatureFlags.ts";

type NormalizedPublicRecordSubject = {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  year_built: number | null;
  property_type: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  as_of: string | null;
};

type PublicRecordsResult =
  | {
      ok: true;
      provider: "attom";
      normalized: NormalizedPublicRecordSubject;
      raw: { request: unknown; response: unknown };
      as_of: string;
      error?: undefined;
    }
  | {
      ok: false;
      provider: "attom";
      normalized: null;
      raw: { request: unknown; response: unknown };
      as_of: string | null;
      error: string;
    };

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const canonicalizePropertyType = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
};

const mapAttomPropType = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, "");

  if (compact === "SFR" || compact.includes("SINGLEFAMILY")) return "singlefamily";
  if (compact.includes("CONDO")) return "condo";
  if (compact.includes("TOWNHOME") || compact.includes("TOWNHOUSE")) return "townhouse";
  if (compact.includes("MULTIFAMILY")) return "multifamily";

  return canonicalizePropertyType(raw);
};

const normalizeAttomSubject = (raw: any, asOf: string): NormalizedPublicRecordSubject => {
  const propertyBlock = Array.isArray(raw?.property)
    ? raw?.property?.[0]
    : raw?.property ?? raw ?? {};
  const building = propertyBlock?.building ?? {};
  const buildingRooms = building?.rooms ?? propertyBlock?.rooms ?? {};
  const buildingSize = building?.size ?? propertyBlock?.size ?? {};
  const summary = propertyBlock?.summary ?? {};
  const location = propertyBlock?.location ?? {};

  const beds =
    safeNumber(buildingRooms?.beds) ??
    safeNumber(propertyBlock?.bedrooms) ??
    safeNumber(propertyBlock?.beds);
  const baths =
    safeNumber(buildingRooms?.bathsTotal) ??
    safeNumber(buildingRooms?.bathstotal) ??
    safeNumber(buildingRooms?.bathsFull) ??
    safeNumber(buildingRooms?.bathsfull) ??
    safeNumber(propertyBlock?.bathstotal) ??
    safeNumber(propertyBlock?.baths);
  const sqft =
    safeNumber(buildingSize?.universalSize) ??
    safeNumber(buildingSize?.universalsize) ??
    safeNumber(buildingSize?.livingSize) ??
    safeNumber(buildingSize?.bldgSize) ??
    safeNumber(buildingSize?.grossSizeAdjusted) ??
    safeNumber(propertyBlock?.livingSize ?? propertyBlock?.lotsize ?? propertyBlock?.sqft);
  const year_built =
    safeNumber(summary?.yearBuilt) ??
    safeNumber(summary?.yearbuilt) ??
    safeNumber(building?.yearBuilt) ??
    safeNumber(building?.yearbuilt) ??
    safeNumber(propertyBlock?.year_built ?? propertyBlock?.yearBuilt);
  const property_type =
    mapAttomPropType(
      summary?.propType ?? summary?.proptype ?? summary?.propLandUse ?? summary?.propertyType ?? summary?.propClass,
    ) ??
    canonicalizePropertyType(building?.style) ??
    canonicalizePropertyType(propertyBlock?.proptype);
  const latitude = safeNumber(location?.latitude ?? propertyBlock?.latitude);
  const longitude = safeNumber(location?.longitude ?? propertyBlock?.longitude);

  return {
    beds,
    baths,
    sqft,
    year_built,
    property_type,
    latitude,
    longitude,
    source: "attom",
    as_of: asOf,
  };
};

export async function fetchPublicRecordsSubject(params: {
  address: string | null;
  provider?: "attom";
}): Promise<PublicRecordsResult> {
  const provider = params.provider ?? "attom";
  const asOf = new Date().toISOString();
  const requestSummary = { address: params.address, provider };

  // PAUSED_V2: ATTOM normalizer paused for free data architecture pivot
  // Re-enable by setting FEATURE_ATTOM_ENABLED=true
  // See docs/archive/valuation-providers-v2-pause.md
  if (!isAttomEnabled()) {
    return {
      ok: false,
      provider: "attom",
      normalized: null,
      raw: { request: requestSummary, response: { paused: true, reason: "feature_paused_v2", message: "ATTOM normalizer paused" } },
      as_of: asOf,
      error: "feature_paused_v2",
    };
  }

  if (provider !== "attom") {
    return {
      ok: false,
      provider: "attom",
      normalized: null,
      raw: { request: requestSummary, response: { error: "unsupported_public_records_provider" } },
      as_of: asOf,
      error: "unsupported_public_records_provider",
    };
  }

  if (!params.address || params.address.trim() === "") {
    return {
      ok: false,
      provider: "attom",
      normalized: null,
      raw: { request: requestSummary, response: { error: "missing_address" } },
      as_of: asOf,
      error: "missing_address",
    };
  }

  const apiKey = Deno.env.get("ATTOM_API_KEY") ?? null;
  if (!apiKey) {
    return {
      ok: false,
      provider: "attom",
      normalized: null,
      raw: { request: requestSummary, response: { error: "missing_attom_api_key" } },
      as_of: asOf,
      error: "missing_attom_api_key",
    };
  }

  const url = new URL("https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile");
  url.searchParams.set("address", params.address);

  const headers = {
    Accept: "application/json",
    apikey: apiKey,
  };

  try {
    const res = await fetch(url.toString(), { headers });
    const bodyText = await res.text();
    const parsed = bodyText ? JSON.parse(bodyText) : null;

    if (!res.ok) {
      return {
        ok: false,
        provider: "attom",
        normalized: null,
        raw: {
          request: { url: url.toString(), headers: ["Accept", "apikey"] },
          response: parsed ?? { error: bodyText || null },
        },
        as_of: asOf,
        error: `attom_status_${res.status}`,
      };
    }

    const normalized = normalizeAttomSubject(parsed, asOf);
    return {
      ok: true,
      provider: "attom",
      normalized,
      raw: {
        request: { url: url.toString(), headers: ["Accept", "apikey"] },
        response: parsed,
      },
      as_of: asOf,
    };
  } catch (err) {
    return {
      ok: false,
      provider: "attom",
      normalized: null,
      raw: { request: { url: url.toString(), headers: ["Accept", "apikey"] }, response: { error: err?.message } },
      as_of: asOf,
      error: "attom_fetch_failed",
    };
  }
}
