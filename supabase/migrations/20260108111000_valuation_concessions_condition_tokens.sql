-- Seed valuation.concessions + valuation.condition tokens on ACTIVE policies only (missing keys only, default OFF).
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
        (p.policy_json->'valuation'->'concessions'->>'enabled') IS NULL OR
        (p.policy_json->'valuation'->'concessions'->>'threshold_pct') IS NULL OR
        (p.policy_json->'valuation'->'concessions'->>'reaction_factor') IS NULL OR
        (p.policy_json->'valuation'->'concessions'->>'precedence') IS NULL OR
        (p.policy_json->'valuation'->'condition'->>'enabled') IS NULL
      )
  ),
  upd_apply AS (
    UPDATE policies p
    SET policy_json = jsonb_set(
      p.policy_json,
      '{valuation}',
      u.valuation
        || jsonb_build_object(
          'concessions',
          coalesce(u.valuation->'concessions', '{}'::jsonb)
            || (CASE WHEN (u.valuation->'concessions'->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'concessions'->>'threshold_pct') IS NULL THEN jsonb_build_object('threshold_pct', 0.03) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'concessions'->>'reaction_factor') IS NULL THEN jsonb_build_object('reaction_factor', 1.0) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'concessions'->>'precedence') IS NULL THEN jsonb_build_object('precedence', 'usd_over_pct') ELSE '{}' END)
        )
        || jsonb_build_object(
          'condition',
          coalesce(u.valuation->'condition', '{}'::jsonb)
            || (CASE WHEN (u.valuation->'condition'->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END)
        ),
      true
    )
    FROM upd u
    WHERE p.id = u.id
    RETURNING 1
  )
  SELECT count(*) INTO _policies_updated FROM upd_apply;

  RAISE NOTICE 'valuation concessions/condition tokens seeded (active policies updated: %)', _policies_updated;
END $$;
