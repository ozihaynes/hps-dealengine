-- Ensure active policies and their corresponding policy_versions carry closed-sales valuation tokens.
-- Only fills missing fields; existing non-null values remain unchanged.
begin;

-- Normalize valuation object for active policies.
update public.policies p
set policy_json = jsonb_set(p.policy_json, '{valuation}', coalesce(p.policy_json->'valuation', '{}'::jsonb))
where p.is_active = true
  and p.policy_json->'valuation' is null;

-- Normalize valuation object for policy_versions that match an active policy (org + posture).
update public.policy_versions pv
set policy_json = jsonb_set(pv.policy_json, '{valuation}', coalesce(pv.policy_json->'valuation', '{}'::jsonb))
where pv.policy_json->'valuation' is null
  and exists (
    select 1
    from public.policies p
    where p.org_id = pv.org_id
      and p.posture = pv.posture
      and p.is_active = true
  );

-- Seed closed_sales_sale_date_range_days where missing (default 90 days).
update public.policies p
set policy_json = jsonb_set(p.policy_json, '{valuation,closed_sales_sale_date_range_days}', to_jsonb(90), true)
where p.is_active = true
  and (p.policy_json->'valuation'->'closed_sales_sale_date_range_days') is null;

update public.policy_versions pv
set policy_json = jsonb_set(pv.policy_json, '{valuation,closed_sales_sale_date_range_days}', to_jsonb(90), true)
where (pv.policy_json->'valuation'->'closed_sales_sale_date_range_days') is null
  and exists (
    select 1
    from public.policies p
    where p.org_id = pv.org_id
      and p.posture = pv.posture
      and p.is_active = true
  );

-- Seed closed_sales_primary_radius_miles where missing (default 0.5 miles).
update public.policies p
set policy_json = jsonb_set(p.policy_json, '{valuation,closed_sales_primary_radius_miles}', to_jsonb(0.5), true)
where p.is_active = true
  and (p.policy_json->'valuation'->'closed_sales_primary_radius_miles') is null;

update public.policy_versions pv
set policy_json = jsonb_set(pv.policy_json, '{valuation,closed_sales_primary_radius_miles}', to_jsonb(0.5), true)
where (pv.policy_json->'valuation'->'closed_sales_primary_radius_miles') is null
  and exists (
    select 1
    from public.policies p
    where p.org_id = pv.org_id
      and p.posture = pv.posture
      and p.is_active = true
  );

-- Seed closed_sales_stepout_radius_miles where missing (default 1.0 miles).
update public.policies p
set policy_json = jsonb_set(p.policy_json, '{valuation,closed_sales_stepout_radius_miles}', to_jsonb(1.0), true)
where p.is_active = true
  and (p.policy_json->'valuation'->'closed_sales_stepout_radius_miles') is null;

update public.policy_versions pv
set policy_json = jsonb_set(pv.policy_json, '{valuation,closed_sales_stepout_radius_miles}', to_jsonb(1.0), true)
where (pv.policy_json->'valuation'->'closed_sales_stepout_radius_miles') is null
  and exists (
    select 1
    from public.policies p
    where p.org_id = pv.org_id
      and p.posture = pv.posture
      and p.is_active = true
  );

commit;
