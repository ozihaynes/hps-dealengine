-- Seed valuation.ensemble + valuation.uncertainty tokens on ACTIVE policies only (missing keys only, default OFF).
DO $$
DECLARE
  _policies_updated int := 0;
BEGIN
  WITH upd AS (
    SELECT
      p.id,
      coalesce(p.policy_json->'valuation', '{}'::jsonb) AS valuation
    FROM policies p
    WHERE p.is_active = true
      AND (
        (p.policy_json->'valuation'->'ensemble'->>'enabled') IS NULL OR
        (p.policy_json->'valuation'->'ensemble'->>'version') IS NULL OR
        (p.policy_json->'valuation'->'ensemble'->'weights'->>'comps') IS NULL OR
        (p.policy_json->'valuation'->'ensemble'->'weights'->>'avm') IS NULL OR
        (p.policy_json->'valuation'->'ensemble'->>'max_avm_weight') IS NULL OR
        (p.policy_json->'valuation'->'ensemble'->>'min_comps_for_avm_blend') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'enabled') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'version') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'method') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'p_low') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'p_high') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'min_comps') IS NULL OR
        (p.policy_json->'valuation'->'uncertainty'->>'floor_pct') IS NULL
      )
  ),
  upd_apply AS (
    UPDATE policies p
    SET policy_json = jsonb_set(
      p.policy_json,
      '{valuation}',
      u.valuation
        || jsonb_build_object(
          'ensemble',
          coalesce(u.valuation->'ensemble', '{}'::jsonb)
            || (CASE WHEN (u.valuation->'ensemble'->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'ensemble'->>'version') IS NULL THEN jsonb_build_object('version', 'ensemble_v1') ELSE '{}' END)
            || (CASE WHEN (u.valuation->'ensemble'->'weights'->>'comps') IS NULL OR (u.valuation->'ensemble'->'weights'->>'avm') IS NULL
              THEN jsonb_build_object('weights', jsonb_build_object('comps', 0.7, 'avm', 0.3))
              ELSE '{}' END)
            || (CASE WHEN (u.valuation->'ensemble'->>'max_avm_weight') IS NULL THEN jsonb_build_object('max_avm_weight', 0.5) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'ensemble'->>'min_comps_for_avm_blend') IS NULL THEN jsonb_build_object('min_comps_for_avm_blend', 3) ELSE '{}' END)
        )
        || jsonb_build_object(
          'uncertainty',
          coalesce(u.valuation->'uncertainty', '{}'::jsonb)
            || (CASE WHEN (u.valuation->'uncertainty'->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'uncertainty'->>'version') IS NULL THEN jsonb_build_object('version', 'uncertainty_v1') ELSE '{}' END)
            || (CASE WHEN (u.valuation->'uncertainty'->>'method') IS NULL THEN jsonb_build_object('method', 'weighted_quantiles_v1') ELSE '{}' END)
            || (CASE WHEN (u.valuation->'uncertainty'->>'p_low') IS NULL THEN jsonb_build_object('p_low', 0.10) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'uncertainty'->>'p_high') IS NULL THEN jsonb_build_object('p_high', 0.90) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'uncertainty'->>'min_comps') IS NULL THEN jsonb_build_object('min_comps', 3) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'uncertainty'->>'floor_pct') IS NULL THEN jsonb_build_object('floor_pct', 0.05) ELSE '{}' END)
        ),
      true
    )
    FROM upd u
    WHERE p.id = u.id
    RETURNING 1
  )
  SELECT count(*) INTO _policies_updated FROM upd_apply;

  RAISE NOTICE 'valuation ensemble/uncertainty tokens seeded (active policies updated: %)', _policies_updated;
END $$;
