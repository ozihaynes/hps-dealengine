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
