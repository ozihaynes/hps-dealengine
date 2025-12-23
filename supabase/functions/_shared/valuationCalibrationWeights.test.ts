import { describe, expect, it } from "vitest";

import { resolveCalibrationWeightsFromRows } from "./valuationCalibrationWeights.ts";

describe("valuationCalibrationWeights", () => {
  it("selects the latest version and sorts strategies deterministically", () => {
    const rows = [
      { strategy: "comps_v1", weight: 0.6, version: 1 },
      { strategy: "avm", weight: 0.4, version: 1 },
      { strategy: "avm", weight: 0.45, version: 2 },
      { strategy: "comps_v1", weight: 0.55, version: 2 },
    ];

    const res = resolveCalibrationWeightsFromRows(rows, ["comps_v1", "avm"]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.version).toBe(2);
    expect(res.weights).toEqual([
      { strategy: "avm", weight: 0.45 },
      { strategy: "comps_v1", weight: 0.55 },
    ]);
  });

  it("rejects missing required strategies", () => {
    const rows = [{ strategy: "comps_v1", weight: 1, version: 3 }];

    const res = resolveCalibrationWeightsFromRows(rows, ["comps_v1", "avm"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.reason).toBe("missing_required_strategies");
    expect(res.missing).toEqual(["avm"]);
  });

  it("is deterministic regardless of row order", () => {
    const rowsA = [
      { strategy: "avm", weight: 0.4, version: 5 },
      { strategy: "comps_v1", weight: 0.6, version: 5 },
    ];
    const rowsB = [...rowsA].reverse();

    const resA = resolveCalibrationWeightsFromRows(rowsA, ["comps_v1", "avm"]);
    const resB = resolveCalibrationWeightsFromRows(rowsB, ["comps_v1", "avm"]);

    expect(resA).toEqual(resB);
  });
});
