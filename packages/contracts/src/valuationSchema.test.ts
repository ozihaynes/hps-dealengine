import { describe, expect, it } from "vitest";

import { ValuationPolicySchema, ValuationRunSchema } from "./valuation";

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
        suggested_arv_basis: "ensemble_v1",
        adjustments_version: "selection_v1_2",
        ensemble_version: "ensemble_v1",
        ensemble_weights: { comps: 0.7, avm: 0.3 },
        ensemble_comp_estimate: 252000,
        ensemble_avm_estimate: 245000,
        ensemble_cap_value: 260000,
        ensemble_cap_applied: false,
        uncertainty_version: "uncertainty_v1",
        uncertainty_method: "weighted_quantiles_v1",
        uncertainty_range_low: 230000,
        uncertainty_range_high: 270000,
        uncertainty_range_pct: 0.16,
        arv_range_low: null,
        arv_range_high: null,
        suggested_arv_range_low: null,
        suggested_arv_range_high: null,
        selected_comp_ids: ["c1", "c2"],
        selected_comps: [
          {
            id: "c1",
            address: "123 Main St",
            source: "rentcast",
            as_of: "2025-01-01",
            price: 250000,
            comp_kind: "closed_sale",
            time_adjusted_price: 255000,
            value_basis_before_adjustments: 260000,
            value_basis_method: "ppsf_subject",
            adjusted_value: 262000,
            adjustments: [
              {
                type: "time",
                subject_value: "2025-01-01",
                comp_value: 250000,
                delta_units_raw: 0.02,
                delta_units_capped: 0.02,
                unit_value: 250000,
                amount_raw: 5000,
                amount_capped: 5000,
                applied: true,
                skip_reason: null,
                source: "policy",
                notes: null,
              },
              {
                type: "concessions",
                subject_value: null,
                comp_value: null,
                delta_units_raw: null,
                delta_units_capped: null,
                unit_value: null,
                amount_raw: 1500,
                amount_capped: 1500,
                applied: true,
                skip_reason: null,
                source: "manual_override",
                notes: "manual override",
              },
              {
                type: "condition",
                subject_value: null,
                comp_value: null,
                delta_units_raw: null,
                delta_units_capped: null,
                unit_value: null,
                amount_raw: -5000,
                amount_capped: -5000,
                applied: true,
                skip_reason: null,
                source: "manual_override",
                notes: "condition adjustment",
              },
            ],
          },
        ],
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
        suggested_arv_source_method: "ensemble_v1",
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
        overrides_hash: "overrides-hash",
        overrides_applied_count: 1,
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
    expect(parsed.output.overrides_hash).toEqual("overrides-hash");
    expect(parsed.output.overrides_applied_count).toEqual(1);
    expect(parsed.output.output_hash).toEqual("output-hash");
    expect(parsed.output.suggested_arv_basis).toEqual("ensemble_v1");
    expect(parsed.output.adjustments_version).toEqual("selection_v1_2");
    expect(parsed.output.ensemble_version).toEqual("ensemble_v1");
    expect(parsed.output.uncertainty_version).toEqual("uncertainty_v1");
    expect(parsed.output.selected_comps?.length).toBe(1);
    expect(parsed.output.selected_comps?.[0]?.adjustments?.length).toBe(3);
  });

  it("parses legacy output without adjustments fields", () => {
    const parsed = ValuationRunSchema.parse({
      id: "a1111111-1111-1111-1111-111111111111",
      org_id: "b2222222-2222-2222-2222-222222222222",
      deal_id: "c3333333-3333-3333-3333-333333333333",
      posture: "base",
      address_fingerprint: "addr-fp",
      property_snapshot_id: null,
      input: {
        deal_id: "c3333333-3333-3333-3333-333333333333",
        policy_version_id: "d4444444-4444-4444-4444-444444444444",
        property_snapshot_id: "e5555555-5555-5555-5555-555555555555",
        address_fingerprint: "addr-fp",
        property_snapshot_hash: "snap-hash",
        min_closed_comps_required: 3,
        posture: "base",
        source: "test",
      },
      output: {
        suggested_arv: 200000,
        arv_range_low: null,
        arv_range_high: null,
        suggested_arv_range_low: null,
        suggested_arv_range_high: null,
        selected_comp_ids: ["c1"],
        selection_summary: null,
        confidence_details: null,
        avm_reference_price: null,
        avm_reference_range_low: null,
        avm_reference_range_high: null,
        suggested_arv_source_method: "selection_v1_1_weighted_median_ppsf",
        suggested_arv_comp_kind_used: "closed_sale",
        suggested_arv_comp_count_used: 1,
        as_is_value: null,
        valuation_confidence: "A",
        comp_count: 1,
        comp_set_stats: null,
        warnings: [],
        warning_codes: [],
        messages: [],
        eval_tags: [],
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
      created_by: "d4444444-4444-4444-4444-444444444444",
      created_at: "2024-01-01T00:00:00Z",
    });

    expect(parsed.output.suggested_arv).toEqual(200000);
    expect(parsed.output.suggested_arv_basis).toBeUndefined();
    expect(parsed.output.selected_comps).toBeUndefined();
  });

  it("preserves selection_version and selectionVersion in valuation policy parse", () => {
    const parsed = ValuationPolicySchema.parse({
      valuation: {
        selection_version: "selection_v1_3",
        selectionVersion: "selection_v1_3",
        other_key: "keep_me",
      },
      extra_root: true,
    });
    expect(parsed.valuation?.selection_version).toBe("selection_v1_3");
    expect(parsed.valuation?.selectionVersion).toBe("selection_v1_3");
    expect((parsed as any).extra_root).toBe(true);
    expect((parsed.valuation as any).other_key).toBe("keep_me");
  });
});
