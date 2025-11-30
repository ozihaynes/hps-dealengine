import { describe, it, expect } from "vitest";
import { DoubleClose } from "./engine";

describe("DoubleClose.calculate — Orange County simple scenario", () => {
  it("computes non-zero Florida doc stamps, title, and spread", () => {
    const input = {
      county: "Orange",
      property_type: "SFR",
      association_present: "No",
      type: "Same-day",
      pab: 212000,
      pbc: 377000,
      // no TF, no carry, rest left empty so defaults kick in
    };

    const result = DoubleClose.computeDoubleClose(input, { deal: { market: {}, property: {}, policy: {}, timeline: {} } });

    // Basic sanity: prices propagated
    expect(result.Gross_Spread).toBeGreaterThan(0);

    // Doc stamps should be > 0 for both legs in Orange County
    expect(result.Deed_Stamps_AB).toBeGreaterThan(0);
    expect(result.Deed_Stamps_BC).toBeGreaterThan(0);

    // Title should not be zero (fallback to promulgated premium)
    expect(result.Title_AB).toBeGreaterThan(0);
    expect(result.Title_BC).toBeGreaterThan(0);

    // Extra closing load should be sum of non-zero buy/sell-side costs
    expect(result.Extra_Closing_Load).toBeGreaterThan(
      result.Deed_Stamps_AB +
        result.Deed_Stamps_BC +
        result.Title_AB +
        result.Title_BC
    );

    // Net spread after carry should still be positive and finite
    expect(Number.isFinite(result.Net_Spread_After_Carry)).toBe(true);
    expect(result.Net_Spread_After_Carry).toBeGreaterThan(0);

    // Fee target threshold defaults to 0 when not provided, so check should pass
    expect(result.Fee_Target_Threshold).toBe(0);
    expect(result.Fee_Target_Check).toBe("YES");
  });
});
