-- Seed valuation.ceiling tokens on ACTIVE policies only (missing keys only, default OFF).
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
        (p.policy_json->'valuation'->'ceiling'->>'enabled') IS NULL OR
        (p.policy_json->'valuation'->'ceiling'->>'method') IS NULL OR
        (p.policy_json->'valuation'->'ceiling'->>'max_over_pct') IS NULL
      )
  ),
  upd_apply AS (
    UPDATE policies p
    SET policy_json = jsonb_set(
      p.policy_json,
      '{valuation}',
      u.valuation
        || jsonb_build_object(
          'ceiling',
          coalesce(u.valuation->'ceiling', '{}'::jsonb)
            || (CASE WHEN (u.valuation->'ceiling'->>'enabled') IS NULL THEN jsonb_build_object('enabled', false) ELSE '{}' END)
            || (CASE WHEN (u.valuation->'ceiling'->>'method') IS NULL THEN jsonb_build_object('method', 'p75_active_listings') ELSE '{}' END)
            || (CASE WHEN (u.valuation->'ceiling'->>'max_over_pct') IS NULL THEN jsonb_build_object('max_over_pct', 0.05) ELSE '{}' END)
        ),
      true
    )
    FROM upd u
    WHERE p.id = u.id
    RETURNING 1
  )
  SELECT count(*) INTO _policies_updated FROM upd_apply;

  RAISE NOTICE 'valuation ceiling tokens seeded (active policies updated: %)', _policies_updated;
END $$;
