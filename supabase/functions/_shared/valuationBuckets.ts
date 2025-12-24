type MarketBucketInput = {
  zip?: string | null;
  county?: string | null;
  msa?: string | null;
};

type HomeBucketInput = {
  property_type?: string | null;
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  year_built?: number | null;
};

type BucketInput = {
  market: MarketBucketInput;
  home: HomeBucketInput;
};

function normalizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const match = zip.match(/\d{5}/);
  return match ? match[0] : null;
}

function normalizePropertyType(value: string | null | undefined): string {
  if (!value) return "unknown";
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("town")) return "townhome";
  if (normalized.includes("single")) return "sfr";
  if (normalized.includes("condo")) return "condo";
  if (normalized.includes("multi") || normalized.includes("duplex") || normalized.includes("triplex")) return "multi";
  return normalizeToken(normalized) ?? "unknown";
}

function sqftBand(sqft: number | null | undefined): string {
  if (!Number.isFinite(sqft ?? NaN)) return "unknown";
  const value = Number(sqft);
  if (value < 1000) return "lt1000";
  if (value < 1500) return "1000_1499";
  if (value < 2000) return "1500_1999";
  if (value < 2500) return "2000_2499";
  if (value < 3000) return "2500_2999";
  return "3000_plus";
}

export function buildMarketKeyCandidates(input: MarketBucketInput): string[] {
  const zip = normalizeZip(input.zip);
  const county = normalizeToken(input.county);
  const msa = normalizeToken(input.msa);

  const candidates: string[] = [];
  if (zip) candidates.push(`zip_${zip}`);
  if (county) candidates.push(`county_${county}`);
  if (msa) candidates.push(`msa_${msa}`);
  candidates.push("market_unknown");

  return Array.from(new Set(candidates));
}

export function buildValuationBuckets(input: BucketInput): {
  market: { key: string };
  home: { band: string };
} {
  const zip = normalizeZip(input.market.zip);
  const marketKey =
    (zip ? `zip_${zip}` : null) ??
    (input.market.county ? `county_${normalizeToken(input.market.county)}` : null) ??
    (input.market.msa ? `msa_${normalizeToken(input.market.msa)}` : null) ??
    "market_unknown";

  const homeBand = `${normalizePropertyType(input.home.property_type)}_${sqftBand(input.home.sqft)}`;

  return {
    market: { key: marketKey },
    home: { band: homeBand },
  };
}
