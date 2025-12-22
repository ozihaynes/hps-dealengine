import { describe, it, expect } from "vitest";
import { computeValuationConfidence } from "./valuationConfidence";

const baseSelection = {
  candidate_counts: { after_filters: 10, after_outliers: 9 },
  outliers: { removed_ids: ["c10"] },
};

describe("computeValuationConfidence", () => {
  it("grades A when comps are high and range tight", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 480000,
      suggested_arv_range_high: 520000,
      comp_kind_used: "closed_sale",
      comp_count_used: 8,
      min_closed_comps_required: 5,
      selection_summary: baseSelection,
      warning_codes: [],
    });
    expect(res.grade).toBe("A");
  });

  it("grades B when moderate comps and range", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 450000,
      suggested_arv_range_high: 550000,
      comp_kind_used: "closed_sale",
      comp_count_used: 5,
      min_closed_comps_required: 5,
      selection_summary: baseSelection,
      warning_codes: [],
    });
    expect(res.grade).toBe("B");
  });

  it("forces C when listing-based", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 450000,
      suggested_arv_range_high: 550000,
      comp_kind_used: "sale_listing",
      comp_count_used: 5,
      min_closed_comps_required: 5,
      selection_summary: baseSelection,
      warning_codes: ["listing_based_comps_only"],
    });
    expect(res.grade).toBe("C");
    expect(res.reasons).toContain("listing_based_comps_only");
  });

  it("forces C on failsoft", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 450000,
      suggested_arv_range_high: 550000,
      comp_kind_used: "closed_sale",
      comp_count_used: 6,
      min_closed_comps_required: 5,
      selection_summary: baseSelection,
      warning_codes: ["failsoft_zero_after_filters"],
    });
    expect(res.grade).toBe("C");
  });

  it("downgrades when range is wide", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 350000,
      suggested_arv_range_high: 650000,
      comp_kind_used: "closed_sale",
      comp_count_used: 10,
      min_closed_comps_required: 5,
      selection_summary: baseSelection,
      warning_codes: [],
    });
    expect(res.grade).toBe("C");
    expect(res.reasons).toContain("wide_range");
  });

  it("uses rubric multiplier against min_closed_comps_required", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 480000,
      suggested_arv_range_high: 520000,
      comp_kind_used: "closed_sale",
      comp_count_used: 9,
      min_closed_comps_required: 5,
      selection_summary: baseSelection,
      confidence_rubric: {
        A: { min_comps_multiplier: 2, max_range_pct: 0.2 },
      },
      warning_codes: [],
    });
    // Needs 10 comps (2 * 5); we have 9 so not A
    expect(res.grade).not.toBe("A");
  });

  it("does not add wide_range reason when range within threshold", () => {
    const res = computeValuationConfidence({
      suggested_arv: 500000,
      suggested_arv_range_low: 460000,
      suggested_arv_range_high: 520000,
      comp_kind_used: "closed_sale",
      comp_count_used: 4,
      min_closed_comps_required: 3,
      selection_summary: baseSelection,
      warning_codes: [],
    });
    expect(res.reasons).not.toContain("wide_range");
  });
});
