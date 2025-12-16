import { describe, expect, it } from "vitest";

import { ValuationRunSchema } from "./valuation";

describe("ValuationRunSchema", () => {
  it("accepts eval_tags and hash metadata on output", () => {
    const parsed = ValuationRunSchema.parse({
      id: "11111111-1111-1111-1111-111111111111",
      org_id: "22222222-2222-2222-2222-222222222222",
      deal_id: "33333333-3333-3333-3333-333333333333",
      posture: "base",
      address_fingerprint: "addr-fp",
      property_snapshot_id: null,
      input: {
        deal_id: "33333333-3333-3333-3333-333333333333",
        policy_version_id: "44444444-4444-4444-4444-444444444444",
        property_snapshot_id: "55555555-5555-5555-5555-555555555555",
        address_fingerprint: "addr-fp",
        property_snapshot_hash: "snap-hash",
        min_closed_comps_required: 3,
        posture: "base",
        source: "test",
      },
      output: {
        suggested_arv: 250000,
        arv_range_low: null,
        arv_range_high: null,
        suggested_arv_range_low: null,
        suggested_arv_range_high: null,
        selected_comp_ids: ["c1", "c2"],
        selection_summary: null,
        confidence_details: {
          grade: "B",
          reasons: [],
          metrics: {
            comp_kind_used: "closed_sale",
            comp_count_used: 2,
            range_pct: null,
            outliers_removed_count: null,
            candidate_after_filters: null,
            candidate_after_outliers: null,
          },
        },
        avm_reference_price: null,
        avm_reference_range_low: null,
        avm_reference_range_high: null,
        suggested_arv_source_method: "selection_v1_1_weighted_median_ppsf",
        suggested_arv_comp_kind_used: "closed_sale",
        suggested_arv_comp_count_used: 2,
        as_is_value: null,
        valuation_confidence: "B",
        comp_count: 2,
        comp_set_stats: {
          median_distance_miles: null,
          median_correlation: null,
          median_days_old: null,
        },
        warnings: [],
        warning_codes: [],
        messages: [],
        eval_tags: ["dataset:test"],
        policy_hash: "policy-hash",
        snapshot_hash: "snapshot-hash",
        output_hash: "output-hash",
      },
      provenance: {
        provider_id: null,
        provider_name: null,
        endpoints: [],
        stub: false,
        source: null,
        as_of: null,
        window_days: null,
        sample_n: null,
        address_fingerprint: "addr-fp",
        property_snapshot_id: null,
        min_closed_comps_required: 3,
      },
      status: "succeeded",
      failure_reason: null,
      input_hash: "input-hash",
      output_hash: "output-hash",
      policy_hash: "policy-hash",
      run_hash: "run-hash",
      created_by: "44444444-4444-4444-4444-444444444444",
      created_at: "2024-01-01T00:00:00Z",
    });

    expect(parsed.output.eval_tags).toEqual(["dataset:test"]);
    expect(parsed.output.policy_hash).toEqual("policy-hash");
    expect(parsed.output.snapshot_hash).toEqual("snapshot-hash");
    expect(parsed.output.output_hash).toEqual("output-hash");
  });
});
