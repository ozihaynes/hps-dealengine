-- Seed closed-sales valuation policy tokens (only when missing)
-- Defaults sourced from HPS SoTruth Underwriting Manual: comps <= 90 days; radius 0.5 mi with 1.0 mi stepout.

-- Ensure valuation object exists
update policies
set policy_json = jsonb_set(policy_json, '{valuation}', coalesce(policy_json->'valuation', '{}'::jsonb))
where policy_json->'valuation' is null;

update policy_versions
set policy_json = jsonb_set(policy_json, '{valuation}', coalesce(policy_json->'valuation', '{}'::jsonb))
where policy_json->'valuation' is null;

-- Seed closed_sales_sale_date_range_days (days)
update policies
set policy_json = jsonb_set(policy_json, '{valuation,closed_sales_sale_date_range_days}', '90'::jsonb, true)
where (policy_json->'valuation'->'closed_sales_sale_date_range_days') is null;

update policy_versions
set policy_json = jsonb_set(policy_json, '{valuation,closed_sales_sale_date_range_days}', '90'::jsonb, true)
where (policy_json->'valuation'->'closed_sales_sale_date_range_days') is null;

-- Seed closed_sales_primary_radius_miles (miles)
update policies
set policy_json = jsonb_set(policy_json, '{valuation,closed_sales_primary_radius_miles}', '0.5'::jsonb, true)
where (policy_json->'valuation'->'closed_sales_primary_radius_miles') is null;

update policy_versions
set policy_json = jsonb_set(policy_json, '{valuation,closed_sales_primary_radius_miles}', '0.5'::jsonb, true)
where (policy_json->'valuation'->'closed_sales_primary_radius_miles') is null;

-- Seed closed_sales_stepout_radius_miles (miles) - used when primary radius returns insufficient comps
update policies
set policy_json = jsonb_set(policy_json, '{valuation,closed_sales_stepout_radius_miles}', '1.0'::jsonb, true)
where (policy_json->'valuation'->'closed_sales_stepout_radius_miles') is null;

update policy_versions
set policy_json = jsonb_set(policy_json, '{valuation,closed_sales_stepout_radius_miles}', '1.0'::jsonb, true)
where (policy_json->'valuation'->'closed_sales_stepout_radius_miles') is null;
