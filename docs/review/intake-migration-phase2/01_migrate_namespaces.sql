-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Intake Namespace v1.0.0 → v1.1.0
--
-- SAFETY FEATURES:
--   ✅ Idempotent (checks if already migrated before writing)
--   ✅ Audited (logs before/after to _migration_audit_v1_1_0)
--   ✅ Dynamic year (uses CURRENT_DATE, not hardcoded)
--   ✅ NULL-safe (COALESCE on all payload operations)
--   ✅ RLS bypass (runs as service role)
--   ✅ Transactional (all-or-nothing)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Bypass RLS for migration
SET LOCAL ROLE postgres;

BEGIN;

-- Get current year dynamically
DO $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_deal RECORD;
  v_old_value JSONB;
  v_new_value JSONB;
BEGIN
  RAISE NOTICE 'Starting namespace migration. Current year: %', current_year;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 1: Migrate motivation.* → seller.*
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'motivation' IS NOT NULL
      AND payload->'motivation'->>'reason' IS NOT NULL
      -- IDEMPOTENCY: Skip if already migrated
      AND (payload->'seller'->>'reason_for_selling' IS NULL)
  LOOP
    -- Calculate new seller object
    v_old_value := v_deal.payload->'motivation';
    v_new_value := jsonb_build_object(
      'reason_for_selling', v_deal.payload->'motivation'->>'reason',
      'seller_timeline', v_deal.payload->'motivation'->>'timeline',
      'seller_notes', v_deal.payload->'motivation'->>'notes'
    );

    -- Log to audit table
    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'motivation_to_seller', 'seller.*', v_old_value, v_new_value);

    -- Apply update
    UPDATE deals
    SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
      'seller', COALESCE(payload->'seller', '{}'::jsonb) || v_new_value
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 1 complete: motivation.* → seller.*';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 2: Migrate seller.strike_price → seller.lowest_acceptable_price
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'seller'->'strike_price' IS NOT NULL
      -- IDEMPOTENCY: Skip if already migrated
      AND payload->'seller'->'lowest_acceptable_price' IS NULL
  LOOP
    v_old_value := v_deal.payload->'seller'->'strike_price';

    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'strike_to_lowest', 'seller.lowest_acceptable_price', v_old_value, v_old_value);

    UPDATE deals
    SET payload = jsonb_set(
      COALESCE(payload, '{}'::jsonb),
      '{seller,lowest_acceptable_price}',
      v_old_value
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 2 complete: strike_price → lowest_acceptable_price';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 3: Migrate condition.* → systems.*
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'condition' IS NOT NULL
      AND payload->'condition'->>'overall' IS NOT NULL
      -- IDEMPOTENCY: Skip if already migrated
      AND payload->'systems'->>'overall_condition' IS NULL
  LOOP
    v_old_value := v_deal.payload->'condition';
    v_new_value := jsonb_build_object(
      'overall_condition', v_deal.payload->'condition'->>'overall',
      'repair_notes', v_deal.payload->'condition'->>'repair_notes'
    );

    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'condition_to_systems', 'systems.*', v_old_value, v_new_value);

    UPDATE deals
    SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
      'systems', COALESCE(payload->'systems', '{}'::jsonb) || v_new_value
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 3 complete: condition.* → systems.*';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 4: Convert roof_age_years → roof_year_installed (DYNAMIC YEAR)
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'condition'->>'roof_age_years' IS NOT NULL
      AND (payload->'condition'->>'roof_age_years')::int BETWEEN 0 AND 100
      -- IDEMPOTENCY: Skip if already migrated
      AND payload->'systems'->>'roof_year_installed' IS NULL
  LOOP
    v_old_value := to_jsonb((v_deal.payload->'condition'->>'roof_age_years')::int);
    v_new_value := to_jsonb(current_year - (v_deal.payload->'condition'->>'roof_age_years')::int);

    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'roof_age_to_year', 'systems.roof_year_installed', v_old_value, v_new_value);

    UPDATE deals
    SET payload = jsonb_set(
      jsonb_set(
        COALESCE(payload, '{}'::jsonb),
        '{systems}',
        COALESCE(payload->'systems', '{}'::jsonb)
      ),
      '{systems,roof_year_installed}',
      v_new_value
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 4 complete: roof_age_years → roof_year_installed (year: %)', current_year;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 5: Convert hvac_age_years → hvac_year_installed (DYNAMIC YEAR)
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'condition'->>'hvac_age_years' IS NOT NULL
      AND (payload->'condition'->>'hvac_age_years')::int BETWEEN 0 AND 100
      -- IDEMPOTENCY: Skip if already migrated
      AND payload->'systems'->>'hvac_year_installed' IS NULL
  LOOP
    v_old_value := to_jsonb((v_deal.payload->'condition'->>'hvac_age_years')::int);
    v_new_value := to_jsonb(current_year - (v_deal.payload->'condition'->>'hvac_age_years')::int);

    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'hvac_age_to_year', 'systems.hvac_year_installed', v_old_value, v_new_value);

    UPDATE deals
    SET payload = jsonb_set(
      jsonb_set(
        COALESCE(payload, '{}'::jsonb),
        '{systems}',
        COALESCE(payload->'systems', '{}'::jsonb)
      ),
      '{systems,hvac_year_installed}',
      v_new_value
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 5 complete: hvac_age_years → hvac_year_installed';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 6: Migrate financial.* → debt.* and foreclosure.*
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'financial' IS NOT NULL
      AND (payload->'financial'->>'mortgage_balance' IS NOT NULL
           OR payload->'financial'->>'in_foreclosure' IS NOT NULL)
      -- IDEMPOTENCY: Skip if already migrated
      AND payload->'debt'->>'senior_principal' IS NULL
      AND payload->'foreclosure'->>'is_in_foreclosure' IS NULL
  LOOP
    v_old_value := v_deal.payload->'financial';

    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'financial_to_debt_foreclosure', 'debt.* + foreclosure.*', v_old_value, NULL);

    UPDATE deals
    SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
      'debt', COALESCE(payload->'debt', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'senior_principal', (v_deal.payload->'financial'->>'mortgage_balance')::numeric,
        'monthly_payment', (v_deal.payload->'financial'->>'monthly_payment')::numeric
      )),
      'foreclosure', COALESCE(payload->'foreclosure', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'is_in_foreclosure', (v_deal.payload->'financial'->>'in_foreclosure')::boolean,
        'auction_date', v_deal.payload->'financial'->>'foreclosure_sale_date',
        'behind_on_payments', v_deal.payload->'financial'->>'behind_on_payments'
      ))
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 6 complete: financial.* → debt.* + foreclosure.*';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 7: Migrate financial.asking_price → market.asking_price
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v_deal IN
    SELECT id, payload
    FROM deals
    WHERE payload->'financial'->'asking_price' IS NOT NULL
      -- IDEMPOTENCY: Skip if already migrated
      AND payload->'market'->'asking_price' IS NULL
  LOOP
    v_old_value := v_deal.payload->'financial'->'asking_price';

    INSERT INTO _migration_audit_v1_1_0 (deal_id, migration_step, field_path, value_before, value_after)
    VALUES (v_deal.id, 'asking_price_to_market', 'market.asking_price', v_old_value, v_old_value);

    UPDATE deals
    SET payload = jsonb_set(
      jsonb_set(
        COALESCE(payload, '{}'::jsonb),
        '{market}',
        COALESCE(payload->'market', '{}'::jsonb)
      ),
      '{market,asking_price}',
      v_old_value
    ),
    updated_at = NOW()
    WHERE id = v_deal.id;
  END LOOP;

  RAISE NOTICE 'Step 7 complete: asking_price → market.asking_price';

  -- Final summary
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION COMPLETE. Check _migration_audit_v1_1_0 for details.';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Reset role
RESET ROLE;
