import { describe, expect, it } from "vitest";

import { stableHash, stableStringify } from "./determinismHash";

describe("determinismHash", () => {
  it("returns identical hashes for objects with different key order", () => {
    const a = {
      foo: { b: 2, a: 1 },
      arr: [{ y: 2, x: 1 }, 3],
    };
    const b = {
      arr: [{ x: 1, y: 2 }, 3],
      foo: { a: 1, b: 2 },
    };

    const strA = stableStringify(a);
    const strB = stableStringify(b);

    expect(strA).toEqual(strB);
    expect(stableHash(a)).toEqual(stableHash(b));
  });

  it("produces a stable fixture hash", () => {
    const fixture = {
      policy: {
        valuation: {
          min_closed_comps_required: 3,
          selection_method: "weighted_median_ppsf",
          confidence_rubric: {
            A: { min_comps: 3 },
            B: { min_comps: 2 },
            C: { min_comps: 1 },
          },
        },
      },
      snapshot: {
        subject: { sqft: 1200, beds: 3, baths: 2 },
        comps: [
          { id: "c1", price: 250000, comp_kind: "closed_sale" },
          { id: "c2", price: 260000, comp_kind: "closed_sale" },
        ],
        as_of: "2024-01-01T00:00:00Z",
      },
      outputs: { arv: 255000, confidence: "B" },
    };

    expect(stableHash(fixture)).toEqual(
      "acde0d63767b055f6a521a8248081d9836693d0cb936b45f89a2c301b3e39c68",
    );
  });

  it("keeps metrics hashes stable regardless of key order", () => {
    const metricsA = {
      count_total: 3,
      in_range_rate_overall: 0.5,
      by_confidence: {
        B: { count: 2, mae: 1000, in_range_rate: 0.5, mean_range_pct: 0.1 },
        A: { count: 1, mae: 500, in_range_rate: 1, mean_range_pct: 0.05 },
      },
    };
    const metricsB = {
      by_confidence: {
        A: { mean_range_pct: 0.05, in_range_rate: 1, mae: 500, count: 1 },
        B: { in_range_rate: 0.5, mean_range_pct: 0.1, count: 2, mae: 1000 },
      },
      in_range_rate_overall: 0.5,
      count_total: 3,
    };

    expect(stableStringify(metricsA)).toEqual(stableStringify(metricsB));
    expect(stableHash(metricsA)).toEqual(stableHash(metricsB));
  });
});
