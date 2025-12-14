import { describe, expect, it } from "vitest";
import { CompSchema, ValuationRunSchema } from "./valuation";
import { buildRentcastClosedSalesRequest, formatRentcastAddress } from "./rentcastAddress";
import { runValuationSelection, type SelectionPolicy, type SelectionSubject } from "./valuationSelection";

const basePolicy: SelectionPolicy = {
  closed_sales_ladder: [
    { name: "r0_5_d90", radius_miles: 0.5, sale_date_range_days: 90 },
    { name: "r1_0_d180", radius_miles: 1, sale_date_range_days: 180 },
  ],
  closed_sales_target_priced: 12,
  arv_comp_use_count: 5,
  selection_method: "weighted_median_ppsf",
  range_method: "p25_p75",
  similarity_filters: {
    max_sqft_pct_delta: 0.25,
    max_beds_delta: 1,
    max_baths_delta: 1,
    max_year_built_delta: 20,
    require_property_type_match: true,
  },
  outlier_ppsf: { enabled: true, method: "iqr", iqr_k: 1.5, min_samples: 6 },
  weights: { distance: 0.35, recency: 0.25, sqft: 0.25, bed_bath: 0.1, year_built: 0.05 },
};

const subject: SelectionSubject = {
  sqft: 2000,
  beds: 3,
  baths: 2,
  year_built: 2000,
  property_type: "single_family",
};

describe("valuation contracts", () => {
  it("accepts closed_sale comp_kind", () => {
    const parsed = CompSchema.parse({
      id: "c1",
      address: "123 Main",
      source: "rentcast",
      as_of: "2025-01-01",
      comp_kind: "closed_sale",
      price: 100000,
    });
    expect(parsed.comp_kind).toBe("closed_sale");
  });

  it("accepts new valuation run output fields", () => {
    const run = ValuationRunSchema.parse({
      id: "run-1",
      org_id: "org",
      deal_id: "deal",
      posture: "base",
      address_fingerprint: "fp",
      input: {},
      output: {
        suggested_arv: 120000,
        arv_range_low: 110000,
        arv_range_high: 130000,
        suggested_arv_range_low: 110000,
        suggested_arv_range_high: 130000,
        selected_comp_ids: ["c1", "c2"],
        selection_summary: { ok: true },
        avm_reference_price: 125000,
        avm_reference_range_low: 120000,
        avm_reference_range_high: 130000,
        suggested_arv_source_method: "comps_median_v1",
        suggested_arv_comp_kind_used: "closed_sale",
        suggested_arv_comp_count_used: 3,
        as_is_value: null,
        valuation_confidence: "B",
        comp_count: 3,
        comp_set_stats: null,
        warnings: ["example"],
        warning_codes: ["listing_based_comps_only"],
        messages: [],
      },
      provenance: {
        provider_id: null,
        provider_name: null,
        endpoints: [],
        stub: false,
        source: null,
        as_of: "2025-01-01",
        window_days: null,
        sample_n: null,
        address_fingerprint: "fp",
        property_snapshot_id: null,
        min_closed_comps_required: 3,
      },
      status: "succeeded",
      failure_reason: null,
      input_hash: "abcd",
      output_hash: "efgh",
      policy_hash: "ijkl",
      run_hash: "mnop",
    });
    expect(run.output.suggested_arv_comp_kind_used).toBe("closed_sale");
    expect(run.output.warning_codes?.[0]).toBe("listing_based_comps_only");
    expect(run.output.selected_comp_ids?.length).toBe(2);
  });
});

describe("valuation selection (deterministic)", () => {
  const comps = [
    { id: "c1", price: 400000, sqft: 2000, comp_kind: "closed_sale", close_date: "2024-12-01", as_of: "2024-12-15", property_type: "single_family" },
    { id: "c2", price: 410000, sqft: 2050, comp_kind: "closed_sale", close_date: "2024-12-05", as_of: "2024-12-15", property_type: "single_family" },
    { id: "c3", price: 395000, sqft: 1980, comp_kind: "closed_sale", close_date: "2024-11-20", as_of: "2024-12-15", property_type: "single_family" },
    { id: "c4", price: 1200000, sqft: 1000, comp_kind: "closed_sale", close_date: "2024-12-02", as_of: "2024-12-15", property_type: "single_family" }, // outlier PPSF
    { id: "c5", price: 405000, sqft: 2010, comp_kind: "closed_sale", close_date: "2024-12-07", as_of: "2024-12-15", property_type: "single_family" },
    { id: "c6", price: 408000, sqft: 2020, comp_kind: "closed_sale", close_date: "2024-12-08", as_of: "2024-12-15", property_type: "single_family" },
    { id: "c7", price: 407000, sqft: 2015, comp_kind: "closed_sale", close_date: "2024-12-09", as_of: "2024-12-15", property_type: "single_family" },
  ];

  it("removes PPSF outliers when min_samples threshold is met", () => {
    const result = runValuationSelection({
      subject,
      comps: comps as any[],
      policyValuation: basePolicy,
      min_closed_comps_required: 3,
      comp_kind: "closed_sale",
    });
    const outliers = (result.selection_summary as any)?.outliers?.removed_ids ?? [];
    expect(outliers).toEqual([...outliers].sort()); // sorted
    expect(outliers).toContain("c4");
  });

  it("is deterministic when comps are shuffled", () => {
    const resultA = runValuationSelection({
      subject,
      comps: comps as any[],
      policyValuation: basePolicy,
      min_closed_comps_required: 3,
      comp_kind: "closed_sale",
    });
    const shuffled = [comps[6], comps[3], comps[0], comps[4], comps[2], comps[1], comps[5]];
    const resultB = runValuationSelection({
      subject,
      comps: shuffled as any[],
      policyValuation: basePolicy,
      min_closed_comps_required: 3,
      comp_kind: "closed_sale",
    });
    expect(resultA.selected_comp_ids).toEqual(resultB.selected_comp_ids);
    expect(resultA.suggested_arv).toEqual(resultB.suggested_arv);
    expect(resultA.suggested_arv_range_low).toEqual(resultB.suggested_arv_range_low);
    expect(resultA.suggested_arv_range_high).toEqual(resultB.suggested_arv_range_high);
    const outA = (resultA.selection_summary as any)?.outliers?.removed_ids ?? [];
    const outB = (resultB.selection_summary as any)?.outliers?.removed_ids ?? [];
    expect(outA).toEqual(outB);
  });

  it("scores more recent comps higher than older ones (recency)", () => {
    const recentFirst = runValuationSelection({
      subject,
      comps: comps as any[],
      policyValuation: basePolicy,
      min_closed_comps_required: 3,
      comp_kind: "closed_sale",
    });
    const ranking = (recentFirst.selection_summary as any)?.ranking ?? [];
    const firstScore = ranking[0]?.score ?? 0;
    const lastScore = ranking[ranking.length - 1]?.score ?? 0;
    expect(firstScore).toBeGreaterThan(lastScore);
  });
});

describe("rentcast address formatting", () => {
  const deal = {
    id: "deal",
    org_id: "org",
    address: "14720 SWEET ACACIA DR,",
    city: "ORLANDO",
    state: "FL",
    zip: "32828",
  };

  it("formats full address without trailing comma", () => {
    expect(formatRentcastAddress(deal as any)).toBe("14720 SWEET ACACIA DR, ORLANDO, FL 32828");
  });

  it("builds closed sales request with address + radius + saleDateRange only", () => {
    const { request } = buildRentcastClosedSalesRequest({
      deal: deal as any,
      saleDateRangeDays: 90,
      radiusMiles: 0.5,
      propertyType: null,
    });
    const req = request ?? "";
    expect(req).toContain("address=14720+SWEET+ACACIA+DR%2C+ORLANDO%2C+FL+32828");
    expect(req).toContain("radius=0.5");
    expect(req).toContain("saleDateRange=90");
    expect(req).not.toMatch(/city=/);
    expect(req).not.toMatch(/zipCode=/);
  });
});

