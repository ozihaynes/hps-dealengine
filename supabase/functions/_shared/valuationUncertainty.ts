const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export type UncertaintyConfig = {
  enabled?: boolean | null;
  version?: string | null;
  method?: string | null;
  p_low?: number | null;
  p_high?: number | null;
  min_comps?: number | null;
  floor_pct?: number | null;
};

export type UncertaintyInputs = {
  comps: any[];
  suggestedArv: number | null;
  avmRangeLow: number | null;
  avmRangeHigh: number | null;
  ensembleWeights: { comps: number; avm: number } | null;
  config: UncertaintyConfig;
};

export type UncertaintyResult = {
  version: string | null;
  method: string | null;
  range_low: number | null;
  range_high: number | null;
  range_pct: number | null;
};

type WeightedSample = { id: string; value: number; weight: number; order: number };

const weightedQuantileDeterministic = (samples: WeightedSample[], p: number): number | null => {
  if (!samples.length) return null;
  const cleaned = samples.filter((s) => s.weight > 0 && Number.isFinite(s.value));
  if (!cleaned.length) return null;

  const sorted = cleaned.sort((a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return a.order - b.order;
  });

  const totalWeight = sorted.reduce((acc, cur) => acc + cur.weight, 0);
  if (totalWeight <= 0) return null;

  const target = Math.min(Math.max(p, 0), 1) * totalWeight;
  let cumulative = 0;
  for (const s of sorted) {
    cumulative += s.weight;
    if (cumulative >= target) {
      return s.value;
    }
  }
  return sorted[sorted.length - 1].value;
};

const buildSamplesForRange = (comps: any[]): WeightedSample[] => {
  return comps
    .map((comp, idx) => {
      const values = [
        safeNumber((comp as any)?.adjusted_value),
        safeNumber((comp as any)?.value_basis_before_adjustments),
        safeNumber((comp as any)?.time_adjusted_price),
        safeNumber((comp as any)?.price_adjusted),
        safeNumber((comp as any)?.price),
      ];
      const value = values.find((v) => v != null);
      if (value == null) return null;
      const corr = safeNumber((comp as any)?.correlation);
      const weight = corr != null && corr > 0 ? corr : 1;
      const id = typeof (comp as any)?.id === "string" ? (comp as any).id : `comp-${idx}`;
      return { id, value, weight, order: idx } satisfies WeightedSample;
    })
    .filter((v): v is WeightedSample => v != null);
};

const blendRanges = (
  compLow: number | null,
  compHigh: number | null,
  avmLow: number | null,
  avmHigh: number | null,
  weights: { comps: number; avm: number } | null,
): { low: number | null; high: number | null } => {
  if (!weights || weights.avm <= 0 || avmLow == null || avmHigh == null) {
    return { low: compLow, high: compHigh };
  }
  if (compLow == null || compHigh == null) {
    return { low: avmLow, high: avmHigh };
  }
  const low = compLow * weights.comps + avmLow * weights.avm;
  const high = compHigh * weights.comps + avmHigh * weights.avm;
  return { low, high };
};

export function computeUncertainty(inputs: UncertaintyInputs): UncertaintyResult | null {
  const cfg = inputs.config ?? {};
  const enabled = cfg.enabled === true;
  if (!enabled) return null;

  const version = typeof cfg.version === "string" && cfg.version.length > 0 ? cfg.version : "uncertainty_v1";
  const method = typeof cfg.method === "string" && cfg.method.length > 0 ? cfg.method : "weighted_quantiles_v1";
  const pLow = safeNumber(cfg.p_low) ?? 0.1;
  const pHigh = safeNumber(cfg.p_high) ?? 0.9;
  const minComps = Math.max(1, Math.floor(safeNumber(cfg.min_comps) ?? 3));
  const floorPct = Math.max(0, safeNumber(cfg.floor_pct) ?? 0.05);

  const samples = buildSamplesForRange(Array.isArray(inputs.comps) ? inputs.comps : []);
  const enoughComps = samples.length >= minComps;

  let compLow: number | null = null;
  let compHigh: number | null = null;
  if (enoughComps) {
    compLow = weightedQuantileDeterministic(samples, pLow);
    compHigh = weightedQuantileDeterministic(samples, pHigh);
  }

  const blended = blendRanges(compLow, compHigh, safeNumber(inputs.avmRangeLow), safeNumber(inputs.avmRangeHigh), inputs.ensembleWeights);
  let low = blended.low;
  let high = blended.high;

  if (low == null && high == null && safeNumber(inputs.avmRangeLow) != null && safeNumber(inputs.avmRangeHigh) != null) {
    low = safeNumber(inputs.avmRangeLow);
    high = safeNumber(inputs.avmRangeHigh);
  }

  if (low == null || high == null) {
    return {
      version,
      method,
      range_low: null,
      range_high: null,
      range_pct: null,
    };
  }

  if (low > high) {
    const swap = low;
    low = high;
    high = swap;
  }

  const arv = safeNumber(inputs.suggestedArv);
  if (arv != null && floorPct > 0) {
    const desiredWidth = Math.abs(arv) * floorPct;
    const currentWidth = high - low;
    if (desiredWidth > currentWidth) {
      const half = desiredWidth / 2;
      low = Math.max(0, arv - half);
      high = arv + half;
    }
  }

  const denom = Math.max(1, safeNumber(inputs.suggestedArv) ?? high ?? 1);
  const rangePct = (high - low) / denom;

  return {
    version,
    method,
    range_low: low,
    range_high: high,
    range_pct: rangePct,
  };
}
