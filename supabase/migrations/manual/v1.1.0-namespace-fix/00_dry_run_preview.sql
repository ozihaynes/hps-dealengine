-- ═══════════════════════════════════════════════════════════════════════════════
-- DRY RUN: Preview what would be migrated
-- Run this BEFORE the actual migration to understand scope
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'motivation → seller' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'motivation' IS NOT NULL
  AND payload->'motivation'->>'reason' IS NOT NULL
  AND payload->'seller'->>'reason_for_selling' IS NULL

UNION ALL

SELECT 'strike_price → lowest_acceptable_price' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'seller'->'strike_price' IS NOT NULL
  AND payload->'seller'->'lowest_acceptable_price' IS NULL

UNION ALL

SELECT 'condition → systems' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'condition' IS NOT NULL
  AND payload->'condition'->>'overall' IS NOT NULL
  AND payload->'systems'->>'overall_condition' IS NULL

UNION ALL

SELECT 'roof_age → roof_year' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'condition'->>'roof_age_years' IS NOT NULL
  AND payload->'systems'->>'roof_year_installed' IS NULL

UNION ALL

SELECT 'hvac_age → hvac_year' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'condition'->>'hvac_age_years' IS NOT NULL
  AND payload->'systems'->>'hvac_year_installed' IS NULL

UNION ALL

SELECT 'financial → debt+foreclosure' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'financial' IS NOT NULL
  AND payload->'debt'->>'senior_principal' IS NULL

UNION ALL

SELECT 'asking_price → market' as migration,
       COUNT(*) as would_migrate
FROM deals
WHERE payload->'financial'->'asking_price' IS NOT NULL
  AND payload->'market'->'asking_price' IS NULL;
