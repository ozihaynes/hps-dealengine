-- Seed valuation policy tokens: min_closed_comps_required, snapshot_ttl_hours, confidence_rubric
begin;

-- Helper to ensure valuation object
update public.policy_versions
set policy_json = jsonb_set(
  policy_json,
  '{valuation}',
  coalesce(policy_json->'valuation', '{}'::jsonb)
)
where policy_json->'valuation' is null;

update public.policies
set policy_json = jsonb_set(
  policy_json,
  '{valuation}',
  coalesce(policy_json->'valuation', '{}'::jsonb)
)
where policy_json->'valuation' is null;

-- min_closed_comps_required (default seed 3 where missing)
update public.policy_versions
set policy_json = jsonb_set(
  policy_json,
  '{valuation,min_closed_comps_required}',
  to_jsonb(3),
  true
)
where (policy_json->'valuation'->'min_closed_comps_required') is null;

update public.policies
set policy_json = jsonb_set(
  policy_json,
  '{valuation,min_closed_comps_required}',
  to_jsonb(3),
  true
)
where (policy_json->'valuation'->'min_closed_comps_required') is null;

-- snapshot_ttl_hours (default seed 24 where missing)
update public.policy_versions
set policy_json = jsonb_set(
  policy_json,
  '{valuation,snapshot_ttl_hours}',
  to_jsonb(24),
  true
)
where (policy_json->'valuation'->'snapshot_ttl_hours') is null;

update public.policies
set policy_json = jsonb_set(
  policy_json,
  '{valuation,snapshot_ttl_hours}',
  to_jsonb(24),
  true
)
where (policy_json->'valuation'->'snapshot_ttl_hours') is null;

-- confidence_rubric seed (A/B/C bands)
do $$
declare
  rubric jsonb := jsonb_build_object(
    'A', jsonb_build_object(
      'min_comps_multiplier', 1.5,
      'min_median_correlation', 0.85,
      'max_range_pct', 0.15
    ),
    'B', jsonb_build_object(
      'min_comps_multiplier', 1.0,
      'min_median_correlation', 0.75,
      'max_range_pct', 0.25
    ),
    'C', jsonb_build_object(
      'min_comps_multiplier', 0.0,
      'min_median_correlation', 0.0,
      'max_range_pct', 1.0
    )
  );
begin
  update public.policy_versions
  set policy_json = jsonb_set(
    policy_json,
    '{valuation,confidence_rubric}',
    rubric,
    true
  )
  where (policy_json->'valuation'->'confidence_rubric') is null;

  update public.policies
  set policy_json = jsonb_set(
    policy_json,
    '{valuation,confidence_rubric}',
    rubric,
    true
  )
  where (policy_json->'valuation'->'confidence_rubric') is null;
end $$;

commit;
