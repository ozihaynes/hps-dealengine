const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const deterministicQuantile = (values: number[], p: number): number | null => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const clampedP = Math.min(Math.max(p, 0), 1);
  const idx = (sorted.length - 1) * clampedP;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export type EnsembleConfig = {
  enabled?: boolean | null;
  version?: string | null;
  weights?: { comps?: number | null; avm?: number | null } | null;
  max_avm_weight?: number | null;
  min_comps_for_avm_blend?: number | null;
};

export type CeilingConfig = {
  enabled?: boolean | null;
  method?: string | null;
  max_over_pct?: number | null;
};

export type EnsembleInputs = {
  compEstimate: number | null;
  compCount: number;
  avmEstimate: number | null;
  listingComps: Array<{ price?: number | null; price_adjusted?: number | null }>;
  ensembleConfig: EnsembleConfig;
  ceilingConfig: CeilingConfig;
};

export type EnsembleResult = {
  value: number | null;
  comp_estimate: number | null;
  avm_estimate: number | null;
  weights: { comps: number; avm: number };
  version: string | null;
  cap_value: number | null;
  cap_applied: boolean;
  cap_method: string | null;
  cap_source: string | null;
  raw_value: number | null;
};

const normalizeWeights = (
  compsWeightRaw: number | null,
  avmWeightRaw: number | null,
  options: { maxAvmWeight: number | null; allowAvm: boolean },
): { comps: number; avm: number } => {
  const maxAvm = options.maxAvmWeight;
  let wComps = safeNumber(compsWeightRaw) ?? 0.7;
  let wAvm = options.allowAvm ? safeNumber(avmWeightRaw) ?? 0.3 : 0;

  if (maxAvm != null) {
    wAvm = Math.min(wAvm, maxAvm);
  }

  if (wAvm < 0) wAvm = 0;
  if (wComps < 0) wComps = 0;

  const total = wComps + wAvm;
  if (total <= 0) {
    return { comps: 1, avm: 0 };
  }

  return { comps: wComps / total, avm: wAvm / total };
};

const computeCeiling = (
  listingComps: Array<{ price?: number | null; price_adjusted?: number | null; status?: string | null }> | null,
  method: string | null,
  maxOverPct: number | null,
): { capValue: number | null; capMethod: string | null; capSource: string | null } => {
  if (!listingComps || listingComps.length === 0) return { capValue: null, capMethod: null, capSource: null };
  if (method !== "p75_active_listings") return { capValue: null, capMethod: null, capSource: null };

  const isActive = (status: unknown): boolean => {
    if (typeof status !== "string") return false;
    const s = status.toLowerCase();
    if (s.includes("inactive") || s.includes("expired") || s.includes("off")) return false;
    return s.includes("active");
  };

  const activeListings = listingComps.filter((c) => isActive((c as any)?.status));
  if (activeListings.length === 0) return { capValue: null, capMethod: null, capSource: null };

  const prices = activeListings
    .map((c) => safeNumber((c as any)?.price_adjusted) ?? safeNumber((c as any)?.price))
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (prices.length === 0) return { capValue: null, capMethod: null, capSource: null };

  const p75 = deterministicQuantile(prices, 0.75);
  if (p75 == null) return { capValue: null, capMethod: null, capSource: null };

  const maxOver = maxOverPct ?? 0.05;
  const capValue = p75 * (1 + maxOver);
  return { capValue, capMethod: method, capSource: "p75_active_listings" };
};

export function computeEnsemble(inputs: EnsembleInputs): EnsembleResult {
  const config = inputs.ensembleConfig ?? {};
  const version = typeof config.version === "string" && config.version.length > 0 ? config.version : "ensemble_v1";
  const maxAvmWeight = safeNumber(config.max_avm_weight);
  const minCompsForBlend = safeNumber(config.min_comps_for_avm_blend) ?? 3;
  const compsAvailable = inputs.compCount ?? 0;
  const allowAvm = inputs.avmEstimate != null && compsAvailable >= minCompsForBlend;

  const weights = normalizeWeights(config.weights?.comps ?? null, config.weights?.avm ?? null, {
    maxAvmWeight,
    allowAvm,
  });

  const compVal = safeNumber(inputs.compEstimate);
  const avmVal = allowAvm ? safeNumber(inputs.avmEstimate) : null;
  const rawValue =
    compVal != null && avmVal != null
      ? compVal * weights.comps + avmVal * weights.avm
      : compVal != null
      ? compVal
      : avmVal;

  const ceilingCfg = inputs.ceilingConfig ?? {};
  const ceilingEnabled = ceilingCfg.enabled === true;
  const { capValue, capMethod, capSource } = ceilingEnabled
    ? computeCeiling(inputs.listingComps ?? [], ceilingCfg.method ?? null, safeNumber(ceilingCfg.max_over_pct))
    : { capValue: null, capMethod: null, capSource: null };

  const appliedValue = capValue != null && rawValue != null ? Math.min(rawValue, capValue) : rawValue;
  const capApplied = capValue != null && rawValue != null ? rawValue > capValue : false;

  return {
    value: appliedValue,
    comp_estimate: compVal,
    avm_estimate: avmVal,
    weights,
    version,
    cap_value: capValue,
    cap_applied: capApplied,
    cap_method: capMethod,
    cap_source: capSource,
    raw_value: rawValue,
  };
}
