/**
 * Continuous calibration flywheel math helpers (deterministic, auditable).
 *
 * Goal:
 * - Maintain per-bucket, per-strategy error aggregates (MAE/MAPE + EMA score) in DB.
 * - Convert those aggregates into a stable per-strategy weight vector.
 *
 * This module is PURE logic: no I/O, no Supabase.
 * That makes it easy to test and reason about determinism.
 */

export type ContinuousCalibrationConfigV1 = {
  /** Weight on MAE normalized by bucket ARV reference. */
  alpha: number;
  /** Weight on MAPE. */
  beta: number;
  /**
   * EMA smoothing factor in [0,1).
   * 0   = no smoothing (score_ema := score_raw)
   * 0.8 = strong smoothing (default)
   */
  lambda: number;

  /** Enforce diversity: minimum weight per strategy (will be auto-adjusted if impossible). */
  w_min: number;
  /** Enforce diversity: maximum weight per strategy. */
  w_max: number;

  /** Bucket-vs-parent blend at read-time (not used in computeWeights directly). */
  gamma: number;

  /** Minimum samples required before publishing weights. */
  min_samples: number;
  /** Minimum samples required per strategy before publishing weights. */
  min_samples_per_strategy: number;

  /** Drop observations where MAPE exceeds this cutoff (fraction, e.g. 0.4 = 40%). */
  outlier_mape_cutoff: number;
  /** Ignore observations older than this horizon (in months). */
  stale_horizon_months: number;

  /** Small constant to avoid division-by-zero. */
  epsilon: number;
};

export const DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1: ContinuousCalibrationConfigV1 = {
  alpha: 0.7,
  beta: 0.3,
  lambda: 0.8,
  w_min: 0.1,
  w_max: 0.6,
  gamma: 0.7,
  min_samples: 12,
  min_samples_per_strategy: 3,
  outlier_mape_cutoff: 0.4,
  stale_horizon_months: 18,
  epsilon: 1e-6,
};

export type CalibrationBucketRowV1 = {
  strategy: string;
  n: number;
  mae: number | null;
  mape: number | null;
  mae_norm: number | null;
  median_arv: number | null;
  score_ema: number | null;
};

export type CalibrationWeightVectorV1 = {
  strategy: string;
  weight: number;
};

export type StrategyObservationV1 = {
  strategy: string;
  estimate: number;
  actual: number;
  /**
   * Timestamp of the ground truth / observation.
   * If provided, staleness rules can be applied deterministically.
   */
  observed_at?: string; // ISO string
  /** If true, keep the observation even if it exceeds outlier cutoff. */
  keep_outlier?: boolean;
};

export type UpdateResultV1 =
  | {
      ok: true;
      updated: Required<CalibrationBucketRowV1>;
      score_raw: number;
      score_ema: number;
      abs_error: number;
      pct_error: number;
    }
  | { ok: false; reason: string; abs_error?: number; pct_error?: number };

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function safeNumber(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) return Number(n);
  return null;
}

function parseIsoDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d;
}

export function normalizeContinuousCalibrationConfigV1(
  input?: Partial<ContinuousCalibrationConfigV1> | null,
  opts?: { strategyCount?: number },
): ContinuousCalibrationConfigV1 {
  const base = input ?? {};
  const strategyCount = opts?.strategyCount;

  // Clamp basic params.
  const alpha = clamp(safeNumber(base.alpha) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.alpha, 0, 1);
  const beta = clamp(safeNumber(base.beta) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.beta, 0, 1);

  // Allow alpha+beta != 1; that’s fine, but avoid both being 0.
  const alphaBetaSum = alpha + beta;
  const alphaFinal = alphaBetaSum === 0 ? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.alpha : alpha;
  const betaFinal = alphaBetaSum === 0 ? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.beta : beta;

  const lambda = clamp(
    safeNumber(base.lambda) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.lambda,
    0,
    0.999999,
  );

  const gamma = clamp(safeNumber(base.gamma) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.gamma, 0, 1);

  const minSamples = Math.max(
    1,
    Math.floor(safeNumber(base.min_samples) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.min_samples),
  );

  const minSamplesPerStrategy = Math.max(
    1,
    Math.floor(
      safeNumber(base.min_samples_per_strategy) ??
        DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.min_samples_per_strategy,
    ),
  );

  const outlierCutoff = clamp(
    safeNumber(base.outlier_mape_cutoff) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.outlier_mape_cutoff,
    0,
    10, // allow "10x" just in case; still deterministic
  );

  const staleMonths = Math.max(
    0,
    Math.floor(
      safeNumber(base.stale_horizon_months) ??
        DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.stale_horizon_months,
    ),
  );

  const epsilon = Math.max(
    1e-12,
    safeNumber(base.epsilon) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.epsilon,
  );

  // w_min/w_max sanity:
  // - If strategyCount is known, ensure w_min is feasible (k*w_min <= 1).
  // - Ensure w_max >= 1/k to avoid impossible distributions.
  const k = typeof strategyCount === "number" && strategyCount > 0 ? strategyCount : null;

  let wMin = clamp(safeNumber(base.w_min) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.w_min, 0, 1);
  let wMax = clamp(safeNumber(base.w_max) ?? DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1.w_max, 0, 1);

  if (k) {
    const maxFeasibleMin = 1 / k;
    if (wMin > maxFeasibleMin) wMin = maxFeasibleMin;

    const minFeasibleMax = 1 / k;
    if (wMax < minFeasibleMax) wMax = minFeasibleMax;
  }

  if (wMax < wMin) {
    // If reversed, collapse to no-caps behavior by setting both to the mean.
    const mid = (wMin + wMax) / 2;
    wMin = mid;
    wMax = mid;
  }

  return {
    alpha: alphaFinal,
    beta: betaFinal,
    lambda,
    w_min: wMin,
    w_max: wMax,
    gamma,
    min_samples: minSamples,
    min_samples_per_strategy: minSamplesPerStrategy,
    outlier_mape_cutoff: outlierCutoff,
    stale_horizon_months: staleMonths,
    epsilon,
  };
}

export function computeScoreRawV1(
  params: { mae_norm: number | null; mape: number | null },
  cfg: ContinuousCalibrationConfigV1,
): number | null {
  const maeNorm = params.mae_norm;
  const mape = params.mape;

  if (maeNorm == null && mape == null) return null;

  // If one is missing, fall back to the other (still deterministic).
  const a = maeNorm == null ? 0 : cfg.alpha;
  const b = mape == null ? 0 : cfg.beta;

  const denom = a + b;
  if (denom === 0) {
    return maeNorm ?? mape ?? null;
  }

  const score = ((a * (maeNorm ?? 0)) + (b * (mape ?? 0))) / denom;
  return Number.isFinite(score) ? score : null;
}

export function updateCalibrationBucketRowV1(
  existing: CalibrationBucketRowV1 | null,
  obs: StrategyObservationV1,
  cfg: ContinuousCalibrationConfigV1,
  now: Date = new Date(),
): UpdateResultV1 {
  const strategy = obs.strategy?.trim();
  if (!strategy) return { ok: false, reason: "Missing strategy" };

  const estimate = safeNumber(obs.estimate);
  const actual = safeNumber(obs.actual);

  if (estimate == null || actual == null) return { ok: false, reason: "Invalid estimate/actual" };
  if (actual <= 0) return { ok: false, reason: "Ground truth must be > 0" };

  // Staleness check (optional).
  if (cfg.stale_horizon_months > 0 && obs.observed_at) {
    const observedAt = parseIsoDate(obs.observed_at);
    if (!observedAt) return { ok: false, reason: "Invalid observed_at ISO date" };
    const cutoff = monthsAgo(now, cfg.stale_horizon_months);
    if (observedAt < cutoff) return { ok: false, reason: "Observation is stale" };
  }

  const absError = Math.abs(estimate - actual);
  const pctError = absError / actual;

  // Outlier drop.
  if (!obs.keep_outlier && pctError > cfg.outlier_mape_cutoff) {
    return { ok: false, reason: "Outlier (MAPE cutoff)", abs_error: absError, pct_error: pctError };
  }

  const nOld = Math.max(0, Math.floor(existing?.n ?? 0));

  const maeOld = safeNumber(existing?.mae);
  const mapeOld = safeNumber(existing?.mape);
  const medianArvOld = safeNumber(existing?.median_arv);
  const scoreEmaOld = safeNumber(existing?.score_ema);

  const nNew = nOld + 1;

  const maeNew = maeOld == null ? absError : ((maeOld * nOld) + absError) / nNew;
  const mapeNew = mapeOld == null ? pctError : ((mapeOld * nOld) + pctError) / nNew;

  // "median_arv" is stored as a running mean reference (approx) to keep updates O(1).
  const medianArvNew = medianArvOld == null ? actual : ((medianArvOld * nOld) + actual) / nNew;

  const maeNormNew = maeNew / Math.max(cfg.epsilon, medianArvNew);

  const scoreRaw = computeScoreRawV1({ mae_norm: maeNormNew, mape: mapeNew }, cfg);
  if (scoreRaw == null) return { ok: false, reason: "Unable to compute score" };

  const scoreEmaNew = scoreEmaOld == null
    ? scoreRaw
    : (cfg.lambda * scoreEmaOld) + ((1 - cfg.lambda) * scoreRaw);

  return {
    ok: true,
    abs_error: absError,
    pct_error: pctError,
    score_raw: scoreRaw,
    score_ema: scoreEmaNew,
    updated: {
      strategy,
      n: nNew,
      mae: maeNew,
      mape: mapeNew,
      median_arv: medianArvNew,
      mae_norm: maeNormNew,
      score_ema: scoreEmaNew,
    },
  };
}

export function canPublishWeightsV1(
  rows: Array<Pick<CalibrationBucketRowV1, "n" | "strategy">>,
  cfg: ContinuousCalibrationConfigV1,
): { ok: true; min_n: number } | { ok: false; reason: string; min_n?: number } {
  if (rows.length < 2) return { ok: false, reason: "Need >= 2 strategies to publish weights" };

  const minN = Math.min(...rows.map((r) => Math.max(0, Math.floor(r.n ?? 0))));
  if (!Number.isFinite(minN)) return { ok: false, reason: "Invalid sample counts" };

  if (minN < cfg.min_samples_per_strategy) {
    return { ok: false, reason: "Insufficient samples per strategy", min_n: minN };
  }

  if (minN < cfg.min_samples) {
    return { ok: false, reason: "Insufficient samples for bucket", min_n: minN };
  }

  return { ok: true, min_n: minN };
}

export function computeWeightsFromBucketRowsV1(
  rows: Array<CalibrationBucketRowV1>,
  cfgInput?: Partial<ContinuousCalibrationConfigV1> | null,
): { weights: Record<string, number>; scores: Record<string, number> } {
  const strategies = rows.map((r) => r.strategy).filter(Boolean);
  const cfg = normalizeContinuousCalibrationConfigV1(cfgInput, { strategyCount: strategies.length });

  const sorted = [...rows].sort((a, b) => a.strategy.localeCompare(b.strategy));

  const scores: Record<string, number> = {};
  const inv: Array<{ strategy: string; inv: number }> = [];

  for (const row of sorted) {
    const s = row.strategy;
    const score =
      safeNumber(row.score_ema) ??
      computeScoreRawV1({ mae_norm: safeNumber(row.mae_norm), mape: safeNumber(row.mape) }, cfg);

    if (score == null) continue;

    const floored = Math.max(cfg.epsilon, score);
    scores[s] = floored;
    inv.push({ strategy: s, inv: 1 / (cfg.epsilon + floored) });
  }

  if (inv.length === 0) {
    return { weights: {}, scores };
  }

  const invSum = inv.reduce((acc, r) => acc + r.inv, 0);
  if (invSum <= 0) return { weights: {}, scores };

  // Initial weights: normalize inverse-score.
  const initial: Array<{ strategy: string; w: number }> = inv.map((r) => ({
    strategy: r.strategy,
    w: r.inv / invSum,
  }));

  // Apply caps and renormalize deterministically.
  const capped = initial.map((r) => ({
    strategy: r.strategy,
    w: clamp(r.w, cfg.w_min, cfg.w_max),
  }));

  const cappedSum = capped.reduce((acc, r) => acc + r.w, 0);
  if (cappedSum <= 0) return { weights: {}, scores };

  const weights: Record<string, number> = {};
  for (const r of capped) {
    weights[r.strategy] = r.w / cappedSum;
  }

  return { weights, scores };
}

export function blendWeightVectorsV1(
  strategies: string[],
  bucketWeights: Record<string, number>,
  parentWeights: Record<string, number>,
  cfgInput?: Partial<ContinuousCalibrationConfigV1> | null,
): { ok: true; weights: Record<string, number>; vector: CalibrationWeightVectorV1[] } | { ok: false; reason: string } {
  const normalized = Array.from(
    new Set(
      strategies
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  if (normalized.length < 2) {
    return { ok: false, reason: "insufficient_strategies" };
  }

  const cfg = normalizeContinuousCalibrationConfigV1(cfgInput, { strategyCount: normalized.length });

  const raw = normalized.map((strategy) => {
    const bucket = safeNumber(bucketWeights[strategy]);
    const parent = safeNumber(parentWeights[strategy]);
    if (bucket == null) return { strategy, weight: NaN };
    if (parent == null) return { strategy, weight: NaN };
    return { strategy, weight: (cfg.gamma * bucket) + ((1 - cfg.gamma) * parent) };
  });

  if (raw.some((r) => !Number.isFinite(r.weight))) {
    return { ok: false, reason: "invalid_weight_input" };
  }

  const capped = raw.map((r) => ({
    strategy: r.strategy,
    weight: clamp(r.weight, cfg.w_min, cfg.w_max),
  }));

  const sum = capped.reduce((acc, r) => acc + r.weight, 0);
  if (!Number.isFinite(sum) || sum <= 0) {
    return { ok: false, reason: "invalid_weight_sum" };
  }

  const weights: Record<string, number> = {};
  const vector: CalibrationWeightVectorV1[] = [];
  for (const row of capped) {
    const value = row.weight / sum;
    weights[row.strategy] = value;
    vector.push({ strategy: row.strategy, weight: value });
  }

  return { ok: true, weights, vector };
}
