-- Seed missing ensemble weight keys on ACTIVE policies only.
-- Do not overwrite existing values. Do not touch policy_versions.

-- Ensure weights object exists if ensemble subtree exists.
update policies
set policy_json = jsonb_set(
  policy_json,
  '{valuation,ensemble,weights}',
  coalesce(policy_json #> '{valuation,ensemble,weights}', '{}'::jsonb),
  true
)
where is_active = true
  and policy_json #> '{valuation,ensemble}' is not null;

-- Backfill comps weight only if missing.
update policies
set policy_json = jsonb_set(
  policy_json,
  '{valuation,ensemble,weights,comps}',
  '0.7'::jsonb,
  true
)
where is_active = true
  and policy_json #> '{valuation,ensemble}' is not null
  and (policy_json #> '{valuation,ensemble,weights,comps}') is null;

-- Backfill avm weight only if missing.
update policies
set policy_json = jsonb_set(
  policy_json,
  '{valuation,ensemble,weights,avm}',
  '0.3'::jsonb,
  true
)
where is_active = true
  and policy_json #> '{valuation,ensemble}' is not null
  and (policy_json #> '{valuation,ensemble,weights,avm}') is null;
