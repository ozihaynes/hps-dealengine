-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP: Remove old namespaces after migration verification
-- ⚠️ WARNING: This is DESTRUCTIVE and cannot be undone!
-- ⚠️ ONLY RUN after verifying migration in production for at least 7 days
-- ═══════════════════════════════════════════════════════════════════════════════

SET LOCAL ROLE postgres;

BEGIN;

-- Safety check: Verify new data exists before deleting old
DO $$
DECLARE
  v_old_count INT;
  v_new_count INT;
BEGIN
  SELECT COUNT(*) INTO v_old_count FROM deals WHERE payload->'motivation' IS NOT NULL;
  SELECT COUNT(*) INTO v_new_count FROM deals WHERE payload->'seller'->>'reason_for_selling' IS NOT NULL;

  IF v_old_count > 0 AND v_new_count = 0 THEN
    RAISE EXCEPTION 'ABORT: Old data exists but new data does not. Migration may have failed.';
  END IF;

  RAISE NOTICE 'Safety check passed. Old motivation: %, New seller: %', v_old_count, v_new_count;
END $$;

-- Remove old namespaces
UPDATE deals
SET payload = payload - 'motivation' - 'condition' - 'financial',
    updated_at = NOW()
WHERE payload->'motivation' IS NOT NULL
   OR payload->'condition' IS NOT NULL
   OR payload->'financial' IS NOT NULL;

-- Remove old seller.strike_price (keeping lowest_acceptable_price)
UPDATE deals
SET payload = payload #- '{seller,strike_price}',
    updated_at = NOW()
WHERE payload->'seller'->'strike_price' IS NOT NULL;

-- Remove old condition fields that were stored as age (roof_age_years, hvac_age_years)
-- These are no longer needed since we now store year_installed
UPDATE deals
SET payload = payload #- '{condition,roof_age_years}' #- '{condition,hvac_age_years}',
    updated_at = NOW()
WHERE payload->'condition'->'roof_age_years' IS NOT NULL
   OR payload->'condition'->'hvac_age_years' IS NOT NULL;

-- Drop audit table (no longer needed after cleanup)
DROP TABLE IF EXISTS _migration_audit_v1_1_0;

COMMIT;

RESET ROLE;

RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
RAISE NOTICE 'CLEANUP COMPLETE. Old namespaces have been removed.';
RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
