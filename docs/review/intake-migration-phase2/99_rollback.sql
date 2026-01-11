-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Undo namespace migration
-- Use only if migration needs to be reverted
--
-- NOTE: This removes the NEW namespace data that was COPIED from old namespaces.
--       The OLD namespace data (motivation, condition, financial) is preserved
--       and will still be available after rollback.
-- ═══════════════════════════════════════════════════════════════════════════════

SET LOCAL ROLE postgres;

BEGIN;

-- Remove new seller fields that were created by migration
-- (but preserve any seller fields that existed before migration)
UPDATE deals d
SET payload = CASE
  WHEN a.migration_step = 'motivation_to_seller' THEN
    jsonb_set(
      d.payload,
      '{seller}',
      COALESCE(d.payload->'seller', '{}'::jsonb)
        - 'reason_for_selling'
        - 'seller_timeline'
        - 'seller_notes'
    )
  ELSE d.payload
END
FROM _migration_audit_v1_1_0 a
WHERE d.id = a.deal_id
  AND a.migration_step = 'motivation_to_seller';

-- Remove lowest_acceptable_price (was copied from strike_price)
UPDATE deals d
SET payload = d.payload #- '{seller,lowest_acceptable_price}'
FROM _migration_audit_v1_1_0 a
WHERE d.id = a.deal_id
  AND a.migration_step = 'strike_to_lowest';

-- Remove new systems fields that were created by migration
UPDATE deals d
SET payload = CASE
  WHEN a.migration_step IN ('condition_to_systems', 'roof_age_to_year', 'hvac_age_to_year') THEN
    jsonb_set(
      d.payload,
      '{systems}',
      COALESCE(d.payload->'systems', '{}'::jsonb)
        - 'overall_condition'
        - 'repair_notes'
        - 'roof_year_installed'
        - 'hvac_year_installed'
    )
  ELSE d.payload
END
FROM _migration_audit_v1_1_0 a
WHERE d.id = a.deal_id
  AND a.migration_step IN ('condition_to_systems', 'roof_age_to_year', 'hvac_age_to_year');

-- Remove new debt fields
UPDATE deals d
SET payload = CASE
  WHEN a.migration_step = 'financial_to_debt_foreclosure' THEN
    jsonb_set(
      d.payload,
      '{debt}',
      COALESCE(d.payload->'debt', '{}'::jsonb)
        - 'senior_principal'
        - 'monthly_payment'
    )
  ELSE d.payload
END
FROM _migration_audit_v1_1_0 a
WHERE d.id = a.deal_id
  AND a.migration_step = 'financial_to_debt_foreclosure';

-- Remove new foreclosure fields
UPDATE deals d
SET payload = CASE
  WHEN a.migration_step = 'financial_to_debt_foreclosure' THEN
    jsonb_set(
      d.payload,
      '{foreclosure}',
      COALESCE(d.payload->'foreclosure', '{}'::jsonb)
        - 'is_in_foreclosure'
        - 'auction_date'
        - 'behind_on_payments'
    )
  ELSE d.payload
END
FROM _migration_audit_v1_1_0 a
WHERE d.id = a.deal_id
  AND a.migration_step = 'financial_to_debt_foreclosure';

-- Remove asking_price from market
UPDATE deals d
SET payload = d.payload #- '{market,asking_price}'
FROM _migration_audit_v1_1_0 a
WHERE d.id = a.deal_id
  AND a.migration_step = 'asking_price_to_market';

-- Note: We keep the audit table for reference
-- Run this separately if you want to delete it:
-- DROP TABLE IF EXISTS _migration_audit_v1_1_0;

COMMIT;

RESET ROLE;

-- After rollback, verify old data is still there:
-- SELECT id, payload->'motivation', payload->'condition', payload->'financial'
-- FROM deals WHERE payload->'motivation' IS NOT NULL LIMIT 5;
