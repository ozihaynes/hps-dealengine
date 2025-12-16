export type NormalizedPublicRecordSubject = {
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

/**
 * Normalize ATTOM property detail response into a deterministic subject shape.
 * ATTOM responses are typically: { property: [ { summary, building, location, ... } ] }
 */
export function normalizeAttomSubject(raw: any, asOf: string): NormalizedPublicRecordSubject {
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
}

export const PublicRecordsProviders = ["attom"] as const;
export type PublicRecordsProvider = (typeof PublicRecordsProviders)[number];
