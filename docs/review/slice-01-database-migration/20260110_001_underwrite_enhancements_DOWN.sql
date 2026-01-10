-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Underwrite Page Enhancements
-- Slice: 01 of 22
-- WARNING: This will DELETE data in the new columns and drop the engine_outputs table
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop indexes first
-- ═══════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.idx_deals_foreclosure_status;
DROP INDEX IF EXISTS public.idx_deals_auction_date;
DROP INDEX IF EXISTS public.idx_engine_outputs_motivation;
DROP INDEX IF EXISTS public.idx_engine_outputs_run_id;
DROP INDEX IF EXISTS public.idx_engine_outputs_deal_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop engine_outputs table (includes RLS policies)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.engine_outputs CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop deals columns - Property Systems (5 columns)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.deals DROP COLUMN IF EXISTS overall_condition;
ALTER TABLE public.deals DROP COLUMN IF EXISTS deferred_maintenance_level;
ALTER TABLE public.deals DROP COLUMN IF EXISTS roof_year_installed;
ALTER TABLE public.deals DROP COLUMN IF EXISTS hvac_year_installed;
ALTER TABLE public.deals DROP COLUMN IF EXISTS water_heater_year_installed;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop deals columns - Lien Risk (11 columns)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.deals DROP COLUMN IF EXISTS hoa_status;
ALTER TABLE public.deals DROP COLUMN IF EXISTS hoa_arrears_amount;
ALTER TABLE public.deals DROP COLUMN IF EXISTS hoa_monthly_assessment;
ALTER TABLE public.deals DROP COLUMN IF EXISTS cdd_status;
ALTER TABLE public.deals DROP COLUMN IF EXISTS cdd_arrears_amount;
ALTER TABLE public.deals DROP COLUMN IF EXISTS property_tax_status;
ALTER TABLE public.deals DROP COLUMN IF EXISTS property_tax_arrears;
ALTER TABLE public.deals DROP COLUMN IF EXISTS municipal_liens_present;
ALTER TABLE public.deals DROP COLUMN IF EXISTS municipal_lien_amount;
ALTER TABLE public.deals DROP COLUMN IF EXISTS title_search_completed;
ALTER TABLE public.deals DROP COLUMN IF EXISTS title_issues_notes;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop deals columns - Foreclosure (6 columns)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.deals DROP COLUMN IF EXISTS foreclosure_status;
ALTER TABLE public.deals DROP COLUMN IF EXISTS days_delinquent;
ALTER TABLE public.deals DROP COLUMN IF EXISTS first_missed_payment_date;
ALTER TABLE public.deals DROP COLUMN IF EXISTS lis_pendens_date;
ALTER TABLE public.deals DROP COLUMN IF EXISTS judgment_date;
ALTER TABLE public.deals DROP COLUMN IF EXISTS auction_date;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop deals columns - Seller Situation (7 columns)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.deals DROP COLUMN IF EXISTS reason_for_selling;
ALTER TABLE public.deals DROP COLUMN IF EXISTS seller_timeline;
ALTER TABLE public.deals DROP COLUMN IF EXISTS lowest_acceptable_price;
ALTER TABLE public.deals DROP COLUMN IF EXISTS decision_maker_status;
ALTER TABLE public.deals DROP COLUMN IF EXISTS mortgage_delinquent;
ALTER TABLE public.deals DROP COLUMN IF EXISTS listed_with_agent;
ALTER TABLE public.deals DROP COLUMN IF EXISTS seller_notes;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTE: Enums are NOT dropped automatically - they may be used elsewhere
-- Manually drop after confirming no usage:
-- ═══════════════════════════════════════════════════════════════════════════════

-- Uncomment these lines ONLY if you're sure no other tables/columns use these types:
-- DROP TYPE IF EXISTS reason_for_selling;
-- DROP TYPE IF EXISTS seller_timeline;
-- DROP TYPE IF EXISTS decision_maker_status;
-- DROP TYPE IF EXISTS foreclosure_status;
-- DROP TYPE IF EXISTS lien_status;
-- DROP TYPE IF EXISTS tax_status;
-- DROP TYPE IF EXISTS property_condition;
-- DROP TYPE IF EXISTS deferred_maintenance;

COMMIT;
