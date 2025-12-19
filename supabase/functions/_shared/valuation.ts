import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { canonicalJson, hashJson } from "./contracts.ts";

export type SupabaseClient = ReturnType<typeof createClient>;

export type DealAddress = {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type ValuationPolicyShape = {
  min_closed_comps_required?: number | null;
  snapshot_ttl_hours?: number | null;
  closed_sales_sale_date_range_days?: number | null;
  closed_sales_primary_radius_miles?: number | null;
  closed_sales_stepout_radius_miles?: number | null;
  closed_sales_ladder?: Array<{
    name?: string | null;
    radius_miles?: number | null;
    sale_date_range_days?: number | null;
  }>;
  closed_sales_target_priced?: number | null;
  arv_comp_use_count?: number | null;
  selection_version?: string | null;
  selection_method?: string | null;
  range_method?: string | null;
  weights?: {
    distance?: number | null;
    recency?: number | null;
    sqft?: number | null;
    bed_bath?: number | null;
    year_built?: number | null;
  } | null;
  similarity_filters?: {
    max_sqft_pct_delta?: number | null;
    max_beds_delta?: number | null;
    max_baths_delta?: number | null;
    max_year_built_delta?: number | null;
    require_property_type_match?: boolean | null;
  } | null;
  outlier_ppsf?: {
    enabled?: boolean | null;
    method?: string | null;
    iqr_k?: number | null;
    min_samples?: number | null;
  } | null;
  market_time_adjustment?: {
    enabled?: boolean | null;
    min_days_old?: number | null;
  } | null;
  adjustments?: {
    enabled?: boolean | null;
    version?: string | null;
    rounding?: { cents?: number | null } | null;
    missing_field_behavior?: string | null;
    enabled_types?: Array<"time" | "sqft" | "beds" | "baths" | "lot" | "year_built"> | null;
    caps?: {
      beds_delta_cap?: number | null;
      baths_delta_cap?: number | null;
      year_delta_cap?: number | null;
      lot_delta_cap_ratio?: number | null;
      sqft_basis_allowed_delta_ratio?: number | null;
    } | null;
    unit_values?: {
      beds?: number | null;
      baths?: number | null;
      lot_per_sqft?: number | null;
      year_built_per_year?: number | null;
    } | null;
  } | null;
  confidence_rubric?: Record<
    string,
    {
      min_comps_multiplier?: number | null;
      min_median_correlation?: number | null;
      max_range_pct?: number | null;
    }
  >;
};

export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });
}

export function normalizeAddress(address: DealAddress): string {
  const parts = [
    address.address ?? "",
    address.city ?? "",
    address.state ?? "",
    address.zip ?? "",
  ]
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  return parts.join("|");
}

export async function fingerprintAddress(address: DealAddress): Promise<string> {
  const normalized = normalizeAddress(address);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function computeHash(value: unknown): string {
  return hashJson(value);
}

export function toCanonical<T>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}
