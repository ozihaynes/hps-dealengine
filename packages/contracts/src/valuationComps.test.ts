import { describe, expect, it } from "vitest";
import { CompSchema, ValuationRunSchema } from "./valuation";
import { selectArvComps, sortCompsDeterministic } from "./valuationCompsForTests";
import { buildRentcastClosedSalesRequest, formatRentcastAddress } from "./rentcastAddress";

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
  });
});

describe("valuation comps selection", () => {
  const comps = [
    { id: "c1", price: 200000, comp_kind: "closed_sale", distance_miles: 0.2, close_date: "2024-12-01" },
    { id: "c2", price: 210000, comp_kind: "closed_sale", distance_miles: 0.3, close_date: "2024-12-05" },
    { id: "c3", price: 220000, comp_kind: "sale_listing", distance_miles: 0.1, close_date: "2024-12-10" },
  ];

  it("prefers closed sales when sufficient", () => {
    const result = selectArvComps({ comps, minClosedComps: 2, medianSetSize: 2 });
    expect(result.compKindUsed).toBe("closed_sale");
    expect(result.suggestedArv).toBe(205000);
    expect(result.warningCodes).not.toContain("listing_based_comps_only");
  });

  it("falls back to listings with warnings when closed sales are insufficient", () => {
    const result = selectArvComps({ comps, minClosedComps: 3, medianSetSize: 2 });
    expect(result.compKindUsed).toBe("sale_listing");
    expect(result.warningCodes).toContain("listing_based_comps_only");
    expect(result.forceConfidenceC).toBe(true);
  });

  it("sorts comps deterministically", () => {
    const shuffled = [comps[2], comps[0], comps[1]];
    const sorted = sortCompsDeterministic(shuffled as any);
    expect(sorted[0].id).toBe("c1");
    expect(sorted[1].id).toBe("c2");
    expect(sorted[2].id).toBe("c3");
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
