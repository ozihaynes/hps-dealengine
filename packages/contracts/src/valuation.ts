import { z } from "zod";

export const AdjustmentLineItemSchema = z.object({
  type: z.enum(["time", "sqft", "beds", "baths", "lot", "year_built"]),
  subject_value: z.union([z.number(), z.string()]).optional().nullable(),
  comp_value: z.union([z.number(), z.string()]).optional().nullable(),
  delta_units_raw: z.number().optional().nullable(),
  delta_units_capped: z.number().optional().nullable(),
  unit_value: z.number().optional().nullable(),
  amount_raw: z.number().optional().nullable(),
  amount_capped: z.number().optional().nullable(),
  applied: z.boolean(),
  skip_reason: z.string().optional().nullable(),
  source: z.literal("policy"),
  notes: z.string().optional().nullable(),
});
export type AdjustmentLineItem = z.infer<typeof AdjustmentLineItemSchema>;

export const CompSchema = z.object({
  id: z.string(),
  address: z.string(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  close_date: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  price_adjusted: z.number().optional().nullable(),
  time_adjusted_price: z.number().optional().nullable(),
  price_per_sqft: z.number().optional().nullable(),
  ppsf_adjusted: z.number().optional().nullable(),
  beds: z.number().optional().nullable(),
  baths: z.number().optional().nullable(),
  sqft: z.number().optional().nullable(),
  lot_sqft: z.number().optional().nullable(),
  year_built: z.number().optional().nullable(),
  distance_miles: z.number().optional().nullable(),
  correlation: z.number().optional().nullable(),
  days_old: z.number().optional().nullable(),
  days_on_market: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  listing_type: z.string().optional().nullable(),
  comp_kind: z.enum(["sale_listing", "closed_sale"]).optional().nullable(),
  market_time_adjustment: z.unknown().optional().nullable(),
  value_basis_before_adjustments: z.number().optional().nullable(),
  value_basis_method: z.enum(["ppsf_subject", "time_adjusted_price"]).optional().nullable(),
  adjusted_value: z.number().optional().nullable(),
  adjustments: z.array(AdjustmentLineItemSchema).optional().nullable(),
  source: z.string(),
  as_of: z.string(),
  raw: z.unknown().optional(),
});
export type Comp = z.infer<typeof CompSchema>;

export const MarketSnapshotSchema = z.object({
  dom_zip_days: z.number().optional().nullable(),
  moi_zip_months: z.number().optional().nullable(),
  price_to_list_pct: z.number().optional().nullable(),
  local_discount_pct_p20: z.number().optional().nullable(),
  source: z.string(),
  as_of: z.string(),
  window_days: z.number().optional().nullable(),
  sample_n: z.number().optional().nullable(),
  avm_price: z.number().optional().nullable(),
  avm_price_range_low: z.number().optional().nullable(),
  avm_price_range_high: z.number().optional().nullable(),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

export const PropertySnapshotSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  address_fingerprint: z.string(),
  source: z.string(),
  provider: z.string().optional().nullable(),
  as_of: z.string(),
  window_days: z.number().optional().nullable(),
  sample_n: z.number().optional().nullable(),
  comps: z.array(CompSchema).optional().nullable(),
  market: MarketSnapshotSchema.optional().nullable(),
  raw: z.unknown().optional(),
  stub: z.boolean().default(false),
  created_by: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});
export type PropertySnapshot = z.infer<typeof PropertySnapshotSchema>;

export const ValuationRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);
export type ValuationRunStatus = z.infer<typeof ValuationRunStatusSchema>;

export const ValuationRunSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  deal_id: z.string(),
  posture: z.enum(["conservative", "base", "aggressive"]),
  address_fingerprint: z.string(),
  property_snapshot_id: z.string().optional().nullable(),
  input: z.object({
    deal_id: z.string().optional().nullable(),
    policy_version_id: z.string().optional().nullable(),
    property_snapshot_id: z.string().optional().nullable(),
    address_fingerprint: z.string().optional().nullable(),
    property_snapshot_hash: z.string().optional().nullable(),
    min_closed_comps_required: z.number().optional().nullable(),
    posture: z.enum(["conservative", "base", "aggressive"]).optional().nullable(),
    source: z.string().optional().nullable(),
  }).passthrough(),
  output: z.object({
    suggested_arv: z.number().optional().nullable(),
    suggested_arv_basis: z.enum(["adjusted_v1_2"]).optional().nullable(),
    adjustments_version: z.string().optional().nullable(),
    arv_range_low: z.number().optional().nullable(),
    arv_range_high: z.number().optional().nullable(),
    suggested_arv_range_low: z.number().optional().nullable(),
    suggested_arv_range_high: z.number().optional().nullable(),
    selected_comp_ids: z.array(z.string()).optional().nullable(),
    selected_comps: z.array(CompSchema).optional().nullable(),
    selection_summary: z.unknown().optional().nullable(),
    confidence_details: z
      .object({
        grade: z.enum(["A", "B", "C"]),
        reasons: z.array(z.string()),
        metrics: z.object({
          comp_kind_used: z.enum(["closed_sale", "sale_listing"]).nullable(),
          comp_count_used: z.number(),
          range_pct: z.number().nullable(),
          outliers_removed_count: z.number().nullable(),
          candidate_after_filters: z.number().nullable(),
          candidate_after_outliers: z.number().nullable(),
        }),
      })
      .optional()
      .nullable(),
    avm_reference_price: z.number().optional().nullable(),
    avm_reference_range_low: z.number().optional().nullable(),
    avm_reference_range_high: z.number().optional().nullable(),
    suggested_arv_source_method: z.string().optional().nullable(),
    suggested_arv_comp_kind_used: z.enum(["closed_sale", "sale_listing"]).optional().nullable(),
    suggested_arv_comp_count_used: z.number().optional().nullable(),
    as_is_value: z.number().optional().nullable(),
    valuation_confidence: z.enum(["A", "B", "C"]).optional().nullable(),
    comp_count: z.number().optional().nullable(),
    comp_set_stats: z
      .object({
        median_distance_miles: z.number().optional().nullable(),
        median_correlation: z.number().optional().nullable(),
        median_days_old: z.number().optional().nullable(),
      })
      .optional()
      .nullable(),
    warnings: z.array(z.string()).optional().nullable(),
    warning_codes: z.array(z.string()).optional().nullable(),
    messages: z.array(z.string()).optional().nullable(),
    eval_tags: z.array(z.string()).optional().nullable(),
    subject_sources: z.array(z.string()).optional().nullable(),
    policy_hash: z.string().optional().nullable(),
    snapshot_hash: z.string().optional().nullable(),
    output_hash: z.string().optional().nullable(),
  }),
  provenance: z.object({
    provider_id: z.string().optional().nullable(),
    provider_name: z.string().optional().nullable(),
    endpoints: z.array(z.string()).optional().nullable(),
    stub: z.boolean().optional().nullable(),
    source: z.string().optional().nullable(),
    as_of: z.string().optional().nullable(),
    window_days: z.number().optional().nullable(),
    sample_n: z.number().optional().nullable(),
    address_fingerprint: z.string().optional().nullable(),
    property_snapshot_id: z.string().optional().nullable(),
    min_closed_comps_required: z.number().optional().nullable(),
  }),
  status: ValuationRunStatusSchema,
  failure_reason: z.string().optional().nullable(),
  input_hash: z.string(),
  output_hash: z.string(),
  policy_hash: z.string().optional().nullable(),
  run_hash: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
});
export type ValuationRun = z.infer<typeof ValuationRunSchema>;
