# Changes Log - Slice 01: Database Migration

## Generated
2026-01-10

## Summary
Added database schema for enhanced underwriting features including seller motivation, foreclosure tracking, lien risk assessment, and property systems.

## Files Created/Modified

| File | Location | Purpose |
|------|----------|---------|
| 20260110_001_underwrite_enhancements.sql | supabase/migrations/ | Forward migration |
| 20260110_001_underwrite_enhancements_DOWN.sql | docs/review/slice-01-database-migration/ | Rollback script |
| 20260107200000_profiles_table.sql | supabase/migrations/ | Fixed TRIGGER ALL -> TRIGGER USER |

## Database Changes

### Enums Created (8)

1. **reason_for_selling** (14 values)
   - foreclosure, pre_foreclosure, divorce, probate, relocation, downsizing, financial_distress, tired_landlord, inherited, tax_lien, code_violations, health_issues, job_loss, other

2. **seller_timeline** (5 values)
   - immediate, urgent, flexible, no_rush, testing_market

3. **decision_maker_status** (6 values)
   - sole_owner, joint_decision, power_of_attorney, estate_executor, multiple_parties, unknown

4. **foreclosure_status** (7 values) - FL-specific stages
   - none, pre_foreclosure, lis_pendens_filed, judgment_entered, sale_scheduled, post_sale_redemption, reo_bank_owned

5. **lien_status** (5 values)
   - none, current, delinquent, in_arrears, unknown

6. **tax_status** (6 values)
   - current, delinquent_1_year, delinquent_2_years, delinquent_3_plus, tax_deed_pending, unknown

7. **property_condition** (6 values)
   - excellent, good, fair, poor, distressed, uninhabitable

8. **deferred_maintenance** (5 values)
   - none, minor, moderate, significant, extensive

### deals Table Columns Added (29)

**Seller Situation (7 columns)**
- reason_for_selling, seller_timeline, lowest_acceptable_price
- decision_maker_status, mortgage_delinquent, listed_with_agent, seller_notes

**Foreclosure (6 columns)**
- foreclosure_status, days_delinquent, first_missed_payment_date
- lis_pendens_date, judgment_date, auction_date

**Lien Risk (11 columns)**
- hoa_status, hoa_arrears_amount, hoa_monthly_assessment
- cdd_status, cdd_arrears_amount
- property_tax_status, property_tax_arrears
- municipal_liens_present, municipal_lien_amount
- title_search_completed, title_issues_notes

**Property Systems (5 columns)**
- overall_condition, deferred_maintenance_level
- roof_year_installed, hvac_year_installed, water_heater_year_installed

### engine_outputs Table Created (19 columns)

**Base columns (5)**
- id, run_id, deal_id, org_id, created_at

**Motivation (4 columns)**
- motivation_score, motivation_level, motivation_confidence, motivation_red_flags

**Foreclosure (4 columns)**
- foreclosure_timeline_position, foreclosure_days_until_sale
- foreclosure_urgency_level, foreclosure_motivation_boost

**Lien (4 columns)**
- lien_total_surviving, lien_risk_level
- lien_joint_liability_warning, lien_blocking_gate

**Systems (2 columns)**
- systems_total_replacement_cost, systems_urgent_replacements

### Indexes Created (5)

1. idx_deals_foreclosure_status - Partial index for foreclosure queries
2. idx_deals_auction_date - Partial index for auction date lookups
3. idx_engine_outputs_motivation - Partial index for high-motivation (>=70) deals
4. idx_engine_outputs_run_id - FK index for run lookups
5. idx_engine_outputs_deal_id - Partial index for deal lookups

### RLS Policies Created (3)

- engine_outputs_select_in_org - Org-scoped SELECT
- engine_outputs_insert_in_org - Org-scoped INSERT
- engine_outputs_update_in_org - Org-scoped UPDATE

## Bug Fix Applied

Fixed pre-existing issue in `20260107200000_profiles_table.sql`:
- Changed `DISABLE TRIGGER ALL` to `DISABLE TRIGGER USER`
- Prevents error when system FK triggers exist

## Rollback Plan

Execute: `docs/review/slice-01-database-migration/20260110_001_underwrite_enhancements_DOWN.sql`

**Note:** Rollback script is stored in review folder, not migrations folder, to prevent accidental execution.

## RLS Impact

- No existing RLS policies modified
- New engine_outputs table has org-scoped RLS matching runs table pattern
- Existing deals RLS applies to new columns automatically

## FL Statute References

- FL 702.10 - Lis pendens filing
- FL 45.031 - Final judgment procedure
- FL 720.3085 - HOA joint and several liability (buyer inherits seller's arrears)
