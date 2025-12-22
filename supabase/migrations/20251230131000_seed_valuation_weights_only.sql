-- Seed valuation.weights for active policies and matching policy_versions when missing.
-- Weights: distance 0.35, recency 0.25, sqft 0.25, bed_bath 0.10, year_built 0.05

-- Active policies
update public.policies p
set policy_json = jsonb_set(
  policy_json,
  '{valuation,weights}',
  '{"distance":0.35,"recency":0.25,"sqft":0.25,"bed_bath":0.10,"year_built":0.05}'::jsonb,
  true
)
where p.is_active = true
  and (policy_json -> 'valuation' -> 'weights') is null;

-- Matching policy_versions for active policies (by org_id + posture)
update public.policy_versions pv
set policy_json = jsonb_set(
  policy_json,
  '{valuation,weights}',
  '{"distance":0.35,"recency":0.25,"sqft":0.25,"bed_bath":0.10,"year_built":0.05}'::jsonb,
  true
)
where (policy_json -> 'valuation' -> 'weights') is null
  and exists (
    select 1
    from public.policies p
    where p.org_id = pv.org_id
      and p.posture = pv.posture
      and p.is_active = true
  );
