-- Seed valuation selection v1.1 defaults into active policies / matching policy_versions
-- Adds missing (non-overwriting) valuation tokens:
-- - closed_sales_ladder
-- - closed_sales_target_priced
-- - arv_comp_use_count
-- - selection_method
-- - range_method
-- - similarity_filters
-- - outlier_ppsf

DO $$
DECLARE
  _ladder jsonb := '[
    {"name":"r0_5_d90","radius_miles":0.5,"sale_date_range_days":90},
    {"name":"r1_0_d90","radius_miles":1.0,"sale_date_range_days":90},
    {"name":"r1_0_d180","radius_miles":1.0,"sale_date_range_days":180},
    {"name":"r3_0_d365","radius_miles":3.0,"sale_date_range_days":365}
  ]'::jsonb;
  _similarity_filters jsonb := jsonb_build_object(
    'max_sqft_pct_delta', 0.25,
    'max_beds_delta', 1,
    'max_baths_delta', 1,
    'max_year_built_delta', 20,
    'require_property_type_match', true
  );
  _outlier_ppsf jsonb := jsonb_build_object(
    'enabled', true,
    'method', 'iqr',
    'iqr_k', 1.5,
    'min_samples', 6
  );
  _weights jsonb := jsonb_build_object(
    'distance', 0.35,
    'recency', 0.25,
    'sqft', 0.25,
    'bed_bath', 0.10,
    'year_built', 0.05
  );
  _policies_updated int := 0;
  _versions_updated int := 0;
BEGIN
  WITH upd AS (
    UPDATE policies p
    SET policy_json = jsonb_set(
      p.policy_json,
      '{valuation}',
      coalesce(p.policy_json->'valuation','{}') ||
        (CASE WHEN (p.policy_json->'valuation'->'closed_sales_ladder') IS NULL THEN jsonb_build_object('closed_sales_ladder', _ladder) ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->>'closed_sales_target_priced') IS NULL THEN jsonb_build_object('closed_sales_target_priced', 12) ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->>'arv_comp_use_count') IS NULL THEN jsonb_build_object('arv_comp_use_count', 5) ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->>'selection_method') IS NULL THEN jsonb_build_object('selection_method', 'weighted_median_ppsf') ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->>'range_method') IS NULL THEN jsonb_build_object('range_method', 'p25_p75') ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->'similarity_filters') IS NULL THEN jsonb_build_object('similarity_filters', _similarity_filters) ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->'outlier_ppsf') IS NULL THEN jsonb_build_object('outlier_ppsf', _outlier_ppsf) ELSE '{}' END) ||
        (CASE WHEN (p.policy_json->'valuation'->'weights') IS NULL THEN jsonb_build_object('weights', _weights) ELSE '{}' END)
    )
    WHERE p.is_active = true
      AND (
        (p.policy_json->'valuation'->'closed_sales_ladder') IS NULL OR
        (p.policy_json->'valuation'->>'closed_sales_target_priced') IS NULL OR
        (p.policy_json->'valuation'->>'arv_comp_use_count') IS NULL OR
        (p.policy_json->'valuation'->>'selection_method') IS NULL OR
        (p.policy_json->'valuation'->>'range_method') IS NULL OR
        (p.policy_json->'valuation'->'similarity_filters') IS NULL OR
        (p.policy_json->'valuation'->'outlier_ppsf') IS NULL OR
        (p.policy_json->'valuation'->'weights') IS NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO _policies_updated FROM upd;

  WITH upd AS (
    UPDATE policy_versions pv
    SET policy_json = jsonb_set(
      pv.policy_json,
      '{valuation}',
      coalesce(pv.policy_json->'valuation','{}') ||
        (CASE WHEN (pv.policy_json->'valuation'->'closed_sales_ladder') IS NULL THEN jsonb_build_object('closed_sales_ladder', _ladder) ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->>'closed_sales_target_priced') IS NULL THEN jsonb_build_object('closed_sales_target_priced', 12) ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->>'arv_comp_use_count') IS NULL THEN jsonb_build_object('arv_comp_use_count', 5) ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->>'selection_method') IS NULL THEN jsonb_build_object('selection_method', 'weighted_median_ppsf') ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->>'range_method') IS NULL THEN jsonb_build_object('range_method', 'p25_p75') ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->'similarity_filters') IS NULL THEN jsonb_build_object('similarity_filters', _similarity_filters) ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->'outlier_ppsf') IS NULL THEN jsonb_build_object('outlier_ppsf', _outlier_ppsf) ELSE '{}' END) ||
        (CASE WHEN (pv.policy_json->'valuation'->'weights') IS NULL THEN jsonb_build_object('weights', _weights) ELSE '{}' END)
    )
    FROM policies p
    WHERE p.org_id = pv.org_id
      AND p.posture = pv.posture
      AND p.is_active = true
      AND (
        (pv.policy_json->'valuation'->'closed_sales_ladder') IS NULL OR
        (pv.policy_json->'valuation'->>'closed_sales_target_priced') IS NULL OR
        (pv.policy_json->'valuation'->>'arv_comp_use_count') IS NULL OR
        (pv.policy_json->'valuation'->>'selection_method') IS NULL OR
        (pv.policy_json->'valuation'->>'range_method') IS NULL OR
        (pv.policy_json->'valuation'->'similarity_filters') IS NULL OR
        (pv.policy_json->'valuation'->'outlier_ppsf') IS NULL OR
        (pv.policy_json->'valuation'->'weights') IS NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO _versions_updated FROM upd;

  RAISE NOTICE 'valuation selection v1.1 tokens seeded (policies: %, policy_versions: %)', _policies_updated, _versions_updated;
END $$;
