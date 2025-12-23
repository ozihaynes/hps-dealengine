import type { SupabaseClient } from "./valuation.ts";

export type CalibrationWeightRow = {
  strategy: string;
  weight: number | null;
  version: number | null;
  note?: string | null;
};

export type CalibrationWeightVector = { strategy: string; weight: number };

export type CalibrationWeightsResult =
  | { ok: true; version: number; weights: CalibrationWeightVector[] }
  | { ok: false; reason: string; missing?: string[] };

const WEIGHT_EPSILON = 1e-6;

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeStrategy = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function resolveCalibrationWeightsFromRows(
  rows: CalibrationWeightRow[],
  requiredStrategies: string[],
): CalibrationWeightsResult {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "no_weights" };
  }

  const required = Array.from(
    new Set(
      requiredStrategies
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0),
    ),
  ).sort();

  const versions = rows
    .map((r) => toFiniteNumber(r.version))
    .filter((v): v is number => v != null && Number.isFinite(v))
    .map((v) => Math.floor(v))
    .filter((v) => v > 0);

  if (versions.length === 0) {
    return { ok: false, reason: "no_weights" };
  }

  const latestVersion = Math.max(...versions);
  const latestRows = rows.filter((r) => Math.floor(toFiniteNumber(r.version) ?? -1) === latestVersion);

  if (latestRows.length === 0) {
    return { ok: false, reason: "no_weights" };
  }

  const normalized: CalibrationWeightVector[] = [];
  const seen = new Set<string>();

  for (const row of latestRows) {
    const strategy = normalizeStrategy(row.strategy);
    if (!strategy) return { ok: false, reason: "invalid_strategy" };
    if (seen.has(strategy)) return { ok: false, reason: "duplicate_strategies" };
    seen.add(strategy);

    const weight = toFiniteNumber(row.weight);
    if (weight == null || weight < 0 || weight > 1) {
      return { ok: false, reason: "invalid_weight" };
    }

    normalized.push({ strategy, weight });
  }

  const requiredSet = new Set(required);
  const extra = normalized.filter((w) => !requiredSet.has(w.strategy)).map((w) => w.strategy);
  if (extra.length > 0) {
    return { ok: false, reason: "unsupported_strategies" };
  }

  const missing = required.filter((s) => !seen.has(s));
  if (missing.length > 0) {
    return { ok: false, reason: "missing_required_strategies", missing };
  }

  const sum = normalized.reduce((acc, w) => acc + w.weight, 0);
  if (Math.abs(sum - 1) > WEIGHT_EPSILON) {
    return { ok: false, reason: "weights_sum_invalid" };
  }

  const weights = normalized.sort((a, b) => a.strategy.localeCompare(b.strategy));
  return { ok: true, version: latestVersion, weights };
}

export async function getLatestCalibrationWeightsForBucket(opts: {
  supabase: SupabaseClient;
  orgId: string;
  marketKey: string;
  homeBand: string;
  requiredStrategies: string[];
}): Promise<CalibrationWeightsResult> {
  const { supabase, orgId, marketKey, homeBand, requiredStrategies } = opts;

  const { data, error } = await supabase
    .from("valuation_weights")
    .select("strategy, weight, version")
    .eq("org_id", orgId)
    .eq("market_key", marketKey)
    .eq("home_band", homeBand)
    .order("version", { ascending: false });

  if (error) {
    return { ok: false, reason: "weights_fetch_failed" };
  }

  const rows = Array.isArray(data) ? (data as CalibrationWeightRow[]) : [];
  return resolveCalibrationWeightsFromRows(rows, requiredStrategies);
}
