import { describe, expect, it } from "vitest";

import { extractCalibrationStrategiesFromRun } from "./valuationCalibration";

describe("extractCalibrationStrategiesFromRun", () => {
  it("returns sorted finite strategies", () => {
    const run = {
      output: {
        ensemble_comp_estimate: 250000,
        ensemble_avm_estimate: 240000,
      },
    } as any;

    const result = extractCalibrationStrategiesFromRun(run);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strategies).toEqual([
        { strategy: "avm", estimate: 240000 },
        { strategy: "comps_v1", estimate: 250000 },
      ]);
    }
  });

  it("falls back to suggested_arv and avm_reference_price", () => {
    const run = {
      output: {
        suggested_arv: 300000,
        avm_reference_price: 280000,
      },
    } as any;

    const result = extractCalibrationStrategiesFromRun(run);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strategies).toEqual([
        { strategy: "avm", estimate: 280000 },
        { strategy: "comps_v1", estimate: 300000 },
      ]);
    }
  });

  it("rejects when fewer than two strategies are available", () => {
    const run = {
      output: {
        ensemble_comp_estimate: 250000,
        ensemble_avm_estimate: "",
      },
    } as any;

    const result = extractCalibrationStrategiesFromRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("insufficient_strategies");
      expect(result.missing).toContain("avm");
    }
  });
});
