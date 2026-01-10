# AFTER STATE - Slice 01: Database Migration

Generated: 2026-01-10

## Verification Results

### Enums Created (8 total)

| Enum Name | Values | Status |
|-----------|--------|--------|
| reason_for_selling | 14 values | Created |
| seller_timeline | 5 values | Created |
| decision_maker_status | 6 values | Created |
| foreclosure_status | 7 values | Created |
| lien_status | 5 values | Created |
| tax_status | 6 values | Created |
| property_condition | 6 values | Created |
| deferred_maintenance | 5 values | Created |

### deals Table New Columns (29 total)

| Category | Column | Type | Status |
|----------|--------|------|--------|
| Seller | reason_for_selling | reason_for_selling | Added |
| Seller | seller_timeline | seller_timeline | Added |
| Seller | lowest_acceptable_price | numeric(12,2) | Added |
| Seller | decision_maker_status | decision_maker_status | Added |
| Seller | mortgage_delinquent | boolean | Added |
| Seller | listed_with_agent | boolean | Added |
| Seller | seller_notes | text | Added |
| Foreclosure | foreclosure_status | foreclosure_status | Added |
| Foreclosure | days_delinquent | integer | Added |
| Foreclosure | first_missed_payment_date | date | Added |
| Foreclosure | lis_pendens_date | date | Added |
| Foreclosure | judgment_date | date | Added |
| Foreclosure | auction_date | date | Added |
| Lien | hoa_status | lien_status | Added |
| Lien | hoa_arrears_amount | numeric(10,2) | Added |
| Lien | hoa_monthly_assessment | numeric(8,2) | Added |
| Lien | cdd_status | lien_status | Added |
| Lien | cdd_arrears_amount | numeric(10,2) | Added |
| Lien | property_tax_status | tax_status | Added |
| Lien | property_tax_arrears | numeric(10,2) | Added |
| Lien | municipal_liens_present | boolean | Added |
| Lien | municipal_lien_amount | numeric(10,2) | Added |
| Lien | title_search_completed | boolean | Added |
| Lien | title_issues_notes | text | Added |
| Systems | overall_condition | property_condition | Added |
| Systems | deferred_maintenance_level | deferred_maintenance | Added |
| Systems | roof_year_installed | integer | Added |
| Systems | hvac_year_installed | integer | Added |
| Systems | water_heater_year_installed | integer | Added |

### engine_outputs Table Created (19 columns total)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| run_id | uuid | FK -> runs |
| deal_id | uuid | FK -> deals |
| org_id | uuid | Org scope |
| created_at | timestamptz | Timestamp |
| motivation_score | integer | Computed 0-100 |
| motivation_level | text | High/Medium/Low |
| motivation_confidence | text | Confidence level |
| motivation_red_flags | jsonb | Array of flags |
| foreclosure_timeline_position | text | Stage in process |
| foreclosure_days_until_sale | integer | Days remaining |
| foreclosure_urgency_level | text | Urgency rating |
| foreclosure_motivation_boost | integer | Boost factor |
| lien_total_surviving | numeric(12,2) | Total liens |
| lien_risk_level | text | Risk rating |
| lien_joint_liability_warning | boolean | FL 720.3085 |
| lien_blocking_gate | boolean | Block threshold |
| systems_total_replacement_cost | numeric(10,2) | Total cost |
| systems_urgent_replacements | jsonb | Urgent items |

### Indexes Created (5 total)

| Index Name | Table | Purpose |
|------------|-------|---------|
| idx_deals_foreclosure_status | deals | Foreclosure queries |
| idx_deals_auction_date | deals | Auction date queries |
| idx_engine_outputs_motivation | engine_outputs | High-motivation queries |
| idx_engine_outputs_run_id | engine_outputs | Run lookups |
| idx_engine_outputs_deal_id | engine_outputs | Deal lookups |

### RLS Policies Created

| Table | Policy | Action |
|-------|--------|--------|
| engine_outputs | engine_outputs_select_in_org | SELECT |
| engine_outputs | engine_outputs_insert_in_org | INSERT |
| engine_outputs | engine_outputs_update_in_org | UPDATE |

## Summary

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Enums | 8 | 8 | PASS |
| deals columns | 29 | 29 | PASS |
| engine_outputs columns | 14+ | 19 | PASS |
| Indexes | 5 | 5 | PASS |
| RLS Policies | 3 | 3 | PASS |
| Migration applied | Yes | Yes | PASS |
