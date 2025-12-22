import { describe, expect, it } from "vitest";

import {
  comparePeriods,
  computeMarketTimeFactor,
  periodFromDate,
  selectEffectiveAsOfPeriod,
} from "./marketIndex";

describe("marketIndex period helpers", () => {
  it("orders periods deterministically", () => {
    const sorted = ["2023Q4", "2024Q1", "2024Q4", "2025Q1"].sort(comparePeriods);
    expect(sorted).toEqual(["2023Q4", "2024Q1", "2024Q4", "2025Q1"]);
  });

  it("maps dates to periods", () => {
    expect(periodFromDate("2025-12-15")).toBe("2025Q4");
    expect(periodFromDate("2024-02-02")).toBe("2024Q1");
  });

  it("selects effective as-of period with fallback", () => {
    const indexMap = new Map<string, number>([
      ["2024Q3", 180],
      ["2024Q4", 190],
      ["2025Q1", 200],
    ]);

    const exact = selectEffectiveAsOfPeriod("2024Q4", indexMap);
    expect(exact.effectivePeriod).toBe("2024Q4");
    expect(exact.effectiveValue).toBe(190);

    const fallbackWithin = selectEffectiveAsOfPeriod("2025Q4", indexMap);
    expect(fallbackWithin.effectivePeriod).toBe("2025Q1");
    expect(fallbackWithin.effectiveValue).toBe(200);

    const fallbackMax = selectEffectiveAsOfPeriod("2023Q1", indexMap);
    expect(fallbackMax.effectivePeriod).toBe("2025Q1");
    expect(fallbackMax.effectiveValue).toBe(200);
  });

  it("computes market time factor deterministically", () => {
    expect(computeMarketTimeFactor(200, 160)).toBeCloseTo(1.25);
    expect(computeMarketTimeFactor(200, 0)).toBeNull();
    expect(computeMarketTimeFactor(null, 180)).toBeNull();
  });
});
