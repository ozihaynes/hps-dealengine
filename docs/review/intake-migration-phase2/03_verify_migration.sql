-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFY: Check migration results
-- Run after migration to verify data was correctly moved
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Check audit trail summary
SELECT '=== Migration Audit Trail ===' as section;
SELECT migration_step, COUNT(*) as records_migrated
FROM _migration_audit_v1_1_0
GROUP BY migration_step
ORDER BY migration_step;

-- 2. Check new namespace counts
SELECT '=== New Namespace Counts ===' as section;
SELECT
  COUNT(*) FILTER (WHERE payload->'seller'->>'reason_for_selling' IS NOT NULL) as seller_reason,
  COUNT(*) FILTER (WHERE payload->'seller'->>'lowest_acceptable_price' IS NOT NULL) as seller_price,
  COUNT(*) FILTER (WHERE payload->'systems'->>'overall_condition' IS NOT NULL) as systems_condition,
  COUNT(*) FILTER (WHERE payload->'systems'->>'roof_year_installed' IS NOT NULL) as roof_year,
  COUNT(*) FILTER (WHERE payload->'systems'->>'hvac_year_installed' IS NOT NULL) as hvac_year,
  COUNT(*) FILTER (WHERE payload->'debt'->>'senior_principal' IS NOT NULL) as debt_principal,
  COUNT(*) FILTER (WHERE payload->'foreclosure'->>'is_in_foreclosure' IS NOT NULL) as foreclosure_status,
  COUNT(*) FILTER (WHERE payload->'market'->>'asking_price' IS NOT NULL) as market_asking
FROM deals;

-- 3. Sample migrated records
SELECT '=== Sample Migrated Records ===' as section;
SELECT
  d.id,
  d.address,
  d.payload->'seller'->>'reason_for_selling' as seller_reason,
  d.payload->'systems'->>'overall_condition' as systems_condition,
  d.payload->'systems'->>'roof_year_installed' as roof_year,
  d.payload->'debt'->>'senior_principal' as debt_principal,
  d.payload->'foreclosure'->>'is_in_foreclosure' as in_foreclosure,
  -- Verify old data preserved
  d.payload->'motivation'->>'reason' as OLD_motivation_reason,
  d.payload->'condition'->>'overall' as OLD_condition
FROM deals d
WHERE EXISTS (SELECT 1 FROM _migration_audit_v1_1_0 a WHERE a.deal_id = d.id)
LIMIT 5;

-- 4. Verify year calculation is correct
SELECT '=== Year Calculation Verification ===' as section;
SELECT
  id,
  (payload->'condition'->>'roof_age_years')::int as original_age,
  (payload->'systems'->>'roof_year_installed')::int as calculated_year,
  EXTRACT(YEAR FROM CURRENT_DATE)::int as current_year,
  EXTRACT(YEAR FROM CURRENT_DATE)::int - (payload->'condition'->>'roof_age_years')::int as expected_year,
  CASE
    WHEN (payload->'systems'->>'roof_year_installed')::int =
         EXTRACT(YEAR FROM CURRENT_DATE)::int - (payload->'condition'->>'roof_age_years')::int
    THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM deals
WHERE payload->'condition'->>'roof_age_years' IS NOT NULL
  AND payload->'systems'->>'roof_year_installed' IS NOT NULL
LIMIT 5;

-- 5. Check for any errors (NULL where shouldn't be)
SELECT '=== Error Check: Missing New Values ===' as section;
SELECT
  a.migration_step,
  COUNT(*) as potential_errors
FROM _migration_audit_v1_1_0 a
JOIN deals d ON d.id = a.deal_id
WHERE (a.migration_step = 'motivation_to_seller' AND d.payload->'seller'->>'reason_for_selling' IS NULL)
   OR (a.migration_step = 'condition_to_systems' AND d.payload->'systems'->>'overall_condition' IS NULL)
   OR (a.migration_step = 'financial_to_debt_foreclosure' AND d.payload->'debt'->>'senior_principal' IS NULL AND d.payload->'foreclosure'->>'is_in_foreclosure' IS NULL)
GROUP BY a.migration_step;
