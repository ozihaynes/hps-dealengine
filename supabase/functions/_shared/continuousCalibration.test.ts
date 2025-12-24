import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1,
  canPublishWeightsV1,
  computeWeightsFromBucketRowsV1,
  blendWeightVectorsV1,
  updateCalibrationBucketRowV1,
  type CalibrationBucketRowV1,
} from "./continuousCalibration.ts";

describe("continuousCalibration.ts", () => {
  it("computeWeightsFromBucketRowsV1 favors the lower-score strategy", () => {
    const rows: CalibrationBucketRowV1[] = [
      { strategy: "comps_v1", n: 25, mae: 15000, mape: 0.08, mae_norm: 0.06, median_arv: 250000, score_ema: 0.07 },
      { strategy: "avm", n: 25, mae: 26000, mape: 0.12, mae_norm: 0.10, median_arv: 250000, score_ema: 0.11 },
    ];

    const { weights } = computeWeightsFromBucketRowsV1(rows, DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1);
    expect(weights.comps_v1).toBeGreaterThan(weights.avm);
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });

  it("computeWeightsFromBucketRowsV1 is deterministic regardless of input order", () => {
    const rowsA: CalibrationBucketRowV1[] = [
      { strategy: "b", n: 30, mae: 20000, mape: 0.10, mae_norm: 0.07, median_arv: 280000, score_ema: 0.09 },
      { strategy: "a", n: 30, mae: 15000, mape: 0.08, mae_norm: 0.05, median_arv: 280000, score_ema: 0.07 },
      { strategy: "c", n: 30, mae: 30000, mape: 0.14, mae_norm: 0.11, median_arv: 280000, score_ema: 0.13 },
    ];
    const rowsB = [...rowsA].reverse();

    const wA = computeWeightsFromBucketRowsV1(rowsA, DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1).weights;
    const wB = computeWeightsFromBucketRowsV1(rowsB, DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1).weights;

    expect(wA).toEqual(wB);
  });

  it("computeWeightsFromBucketRowsV1 respects caps (w_min/w_max) after renormalization", () => {
    const cfg = { ...DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1, w_min: 0.2, w_max: 0.5 };

    const rows: CalibrationBucketRowV1[] = [
      { strategy: "best", n: 50, mae: 5000, mape: 0.03, mae_norm: 0.02, median_arv: 250000, score_ema: 0.02 },
      { strategy: "mid", n: 50, mae: 15000, mape: 0.08, mae_norm: 0.06, median_arv: 250000, score_ema: 0.07 },
      { strategy: "worst", n: 50, mae: 40000, mape: 0.20, mae_norm: 0.16, median_arv: 250000, score_ema: 0.18 },
    ];

    const { weights } = computeWeightsFromBucketRowsV1(rows, cfg);

    // After caps and renormalization, weights stay within bounds.
    for (const w of Object.values(weights)) {
      expect(w).toBeGreaterThanOrEqual(0.2 - 1e-12);
      expect(w).toBeLessThanOrEqual(0.5 + 1e-12);
    }
  });

  it("updateCalibrationBucketRowV1 updates running means + EMA score", () => {
    const cfg = DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1;

    const existing: CalibrationBucketRowV1 = {
      strategy: "comps_v1",
      n: 9,
      mae: 10000,
      mape: 0.05,
      mae_norm: 0.04,
      median_arv: 250000,
      score_ema: 0.06,
    };

    const res = updateCalibrationBucketRowV1(existing, {
      strategy: "comps_v1",
      estimate: 255000,
      actual: 250000,
      observed_at: new Date().toISOString(),
    }, cfg);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.updated.n).toBe(10);
    expect(res.abs_error).toBe(5000);
    expect(res.pct_error).toBeCloseTo(0.02, 8);
    expect(res.score_ema).toBeGreaterThan(0);
  });

  it("canPublishWeightsV1 enforces per-strategy and bucket min samples", () => {
    const cfg = DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1;

    const notOk = canPublishWeightsV1(
      [
        { strategy: "a", n: 11 },
        { strategy: "b", n: 11 },
      ],
      cfg,
    );
    expect(notOk.ok).toBe(false);

    const ok = canPublishWeightsV1(
      [
        { strategy: "a", n: 12 },
        { strategy: "b", n: 12 },
      ],
      cfg,
    );
    expect(ok.ok).toBe(true);
  });

  it("blendWeightVectorsV1 is deterministic and respects caps", () => {
    const cfg = { ...DEFAULT_CONTINUOUS_CALIBRATION_CONFIG_V1, w_min: 0.2, w_max: 0.7, gamma: 0.6 };
    const strategies = ["b", "a"];
    const bucketWeights = { a: 0.8, b: 0.2 };
    const parentWeights = { a: 0.5, b: 0.5 };

    const blended = blendWeightVectorsV1(strategies, bucketWeights, parentWeights, cfg);
    expect(blended.ok).toBe(true);
    if (!blended.ok) return;

    const sum = Object.values(blended.weights).reduce((acc, w) => acc + w, 0);
    expect(sum).toBeCloseTo(1, 8);
    expect(blended.vector[0].strategy).toBe("a");
    expect(blended.vector[1].strategy).toBe("b");
    for (const w of Object.values(blended.weights)) {
      expect(w).toBeGreaterThanOrEqual(0.2 - 1e-12);
      expect(w).toBeLessThanOrEqual(0.7 + 1e-12);
    }
  });
});
