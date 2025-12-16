-- Valuation adjustments (selection v1.2) tokens, default OFF to avoid silent ARV drift.
-- Adds missing (non-overwriting) valuation.adjustments subtree with:
--   enabled=false
--   version="selection_v1_2"
--   rounding.cents=2
--   missing_field_behavior="skip"
--   enabled_types=["time","sqft","beds","baths","lot","year_built"]
--   caps: beds_delta_cap=2, baths_delta_cap=2, year_delta_cap=20, lot_delta_cap_ratio=0.5, sqft_basis_allowed_delta_ratio=0.5
--   unit_values: beds=0, baths=0, lot_per_sqft=0, year_built_per_year=0

DO $$
DECLARE
  _adjustments jsonb := jsonb_build_object(
    'enabled', false,
    'version', 'selection_v1_2',
    'rounding', jsonb_build_object('cents', 2),
    'missing_field_behavior', 'skip',
    'enabled_types', '["time","sqft","beds","baths","lot","year_built"]'::jsonb,
    'caps', jsonb_build_object(
      'beds_delta_cap', 2,
      'baths_delta_cap', 2,
      'year_delta_cap', 20,
      'lot_delta_cap_ratio', 0.5,
      'sqft_basis_allowed_delta_ratio', 0.5
    ),
    'unit_values', jsonb_build_object(
      'beds', 0,
      'baths', 0,
      'lot_per_sqft', 0,
      'year_built_per_year', 0
    )
  );
  _policies_updated int := 0;
  _versions_updated int := 0;
BEGIN
  WITH upd AS (
    SELECT
      p.id,
      p.policy_json,
      coalesce(p.policy_json->'valuation'->'adjustments', '{}'::jsonb) AS adjustments
    FROM policies p
    WHERE p.is_active = true
      AND (
        (p.policy_json->'valuation'->'adjustments') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->>'enabled') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->>'version') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'rounding'->>'cents') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->>'missing_field_behavior') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'enabled_types') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'caps'->>'beds_delta_cap') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'caps'->>'baths_delta_cap') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'caps'->>'year_delta_cap') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'caps'->>'lot_delta_cap_ratio') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'caps'->>'sqft_basis_allowed_delta_ratio') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'unit_values'->>'beds') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'unit_values'->>'baths') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'unit_values'->>'lot_per_sqft') IS NULL OR
        (p.policy_json->'valuation'->'adjustments'->'unit_values'->>'year_built_per_year') IS NULL
      )
  ),
  upd_apply AS (
    UPDATE policies p
    SET policy_json = jsonb_set(
      p.policy_json,
      '{valuation,adjustments}',
      coalesce(u.adjustments, '{}'::jsonb) ||
        (CASE WHEN (u.adjustments->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->>'version') IS NULL THEN jsonb_build_object('version', 'selection_v1_2') ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->'rounding'->>'cents') IS NULL THEN jsonb_build_object('rounding', jsonb_build_object('cents', 2)) ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->>'missing_field_behavior') IS NULL THEN jsonb_build_object('missing_field_behavior', 'skip') ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->'enabled_types') IS NULL THEN jsonb_build_object('enabled_types', '["time","sqft","beds","baths","lot","year_built"]'::jsonb) ELSE '{}' END) ||
        jsonb_build_object(
          'caps',
          coalesce(u.adjustments->'caps', '{}'::jsonb) ||
            (CASE WHEN (u.adjustments->'caps'->>'beds_delta_cap') IS NULL THEN jsonb_build_object('beds_delta_cap', 2) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'baths_delta_cap') IS NULL THEN jsonb_build_object('baths_delta_cap', 2) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'year_delta_cap') IS NULL THEN jsonb_build_object('year_delta_cap', 20) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'lot_delta_cap_ratio') IS NULL THEN jsonb_build_object('lot_delta_cap_ratio', 0.5) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'sqft_basis_allowed_delta_ratio') IS NULL THEN jsonb_build_object('sqft_basis_allowed_delta_ratio', 0.5) ELSE '{}' END)
        ) ||
        jsonb_build_object(
          'unit_values',
          coalesce(u.adjustments->'unit_values', '{}'::jsonb) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'beds') IS NULL THEN jsonb_build_object('beds', 0) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'baths') IS NULL THEN jsonb_build_object('baths', 0) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'lot_per_sqft') IS NULL THEN jsonb_build_object('lot_per_sqft', 0) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'year_built_per_year') IS NULL THEN jsonb_build_object('year_built_per_year', 0) ELSE '{}' END)
        ),
      true
    )
    FROM upd u
    WHERE p.id = u.id
    RETURNING 1
  )
  SELECT count(*) INTO _policies_updated FROM upd_apply;

  WITH upd AS (
    SELECT
      pv.id,
      pv.policy_json,
      coalesce(pv.policy_json->'valuation'->'adjustments', '{}'::jsonb) AS adjustments,
      pv.org_id,
      pv.posture
    FROM policy_versions pv
    JOIN policies p ON p.org_id = pv.org_id AND p.posture = pv.posture AND p.is_active = true
    WHERE (
        (pv.policy_json->'valuation'->'adjustments') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->>'enabled') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->>'version') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'rounding'->>'cents') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->>'missing_field_behavior') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'enabled_types') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'caps'->>'beds_delta_cap') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'caps'->>'baths_delta_cap') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'caps'->>'year_delta_cap') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'caps'->>'lot_delta_cap_ratio') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'caps'->>'sqft_basis_allowed_delta_ratio') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'unit_values'->>'beds') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'unit_values'->>'baths') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'unit_values'->>'lot_per_sqft') IS NULL OR
        (pv.policy_json->'valuation'->'adjustments'->'unit_values'->>'year_built_per_year') IS NULL
    )
  ),
  upd_apply AS (
    UPDATE policy_versions pv
    SET policy_json = jsonb_set(
      pv.policy_json,
      '{valuation,adjustments}',
      coalesce(u.adjustments, '{}'::jsonb) ||
        (CASE WHEN (u.adjustments->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->>'version') IS NULL THEN jsonb_build_object('version', 'selection_v1_2') ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->'rounding'->>'cents') IS NULL THEN jsonb_build_object('rounding', jsonb_build_object('cents', 2)) ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->>'missing_field_behavior') IS NULL THEN jsonb_build_object('missing_field_behavior', 'skip') ELSE '{}' END) ||
        (CASE WHEN (u.adjustments->'enabled_types') IS NULL THEN jsonb_build_object('enabled_types', '["time","sqft","beds","baths","lot","year_built"]'::jsonb) ELSE '{}' END) ||
        jsonb_build_object(
          'caps',
          coalesce(u.adjustments->'caps', '{}'::jsonb) ||
            (CASE WHEN (u.adjustments->'caps'->>'beds_delta_cap') IS NULL THEN jsonb_build_object('beds_delta_cap', 2) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'baths_delta_cap') IS NULL THEN jsonb_build_object('baths_delta_cap', 2) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'year_delta_cap') IS NULL THEN jsonb_build_object('year_delta_cap', 20) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'lot_delta_cap_ratio') IS NULL THEN jsonb_build_object('lot_delta_cap_ratio', 0.5) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'caps'->>'sqft_basis_allowed_delta_ratio') IS NULL THEN jsonb_build_object('sqft_basis_allowed_delta_ratio', 0.5) ELSE '{}' END)
        ) ||
        jsonb_build_object(
          'unit_values',
          coalesce(u.adjustments->'unit_values', '{}'::jsonb) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'beds') IS NULL THEN jsonb_build_object('beds', 0) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'baths') IS NULL THEN jsonb_build_object('baths', 0) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'lot_per_sqft') IS NULL THEN jsonb_build_object('lot_per_sqft', 0) ELSE '{}' END) ||
            (CASE WHEN (u.adjustments->'unit_values'->>'year_built_per_year') IS NULL THEN jsonb_build_object('year_built_per_year', 0) ELSE '{}' END)
        ),
      true
    )
    FROM upd u
    WHERE pv.id = u.id
    RETURNING 1
  )
  SELECT count(*) INTO _versions_updated FROM upd_apply;

  RAISE NOTICE 'valuation adjustments v1.2 tokens seeded (policies: %, policy_versions: %)', _policies_updated, _versions_updated;
END $$;
