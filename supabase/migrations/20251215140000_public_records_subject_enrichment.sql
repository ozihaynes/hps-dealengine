-- Seed valuation.public_records_subject defaults when missing (ATTOM-only)
begin;

do $$
declare
  _default jsonb := jsonb_build_object(
    'public_records_subject',
    jsonb_build_object(
      'enabled', true,
      'provider', 'attom',
      'prefer_over_rentcast_subject', true
    )
  );
begin
  -- active policies
  update public.policies p
  set policy_json = jsonb_set(
    p.policy_json,
    '{valuation}',
    coalesce(p.policy_json->'valuation','{}') || _default
  )
  where p.is_active = true
    and (p.policy_json->'valuation'->'public_records_subject') is null;

  -- matching policy_versions for those org/posture combos
  update public.policy_versions pv
  set policy_json = jsonb_set(
    pv.policy_json,
    '{valuation}',
    coalesce(pv.policy_json->'valuation','{}') || _default
  )
  where (pv.policy_json->'valuation'->'public_records_subject') is null
    and exists (
      select 1
      from public.policies p2
      where p2.org_id = pv.org_id
        and p2.posture = pv.posture
        and p2.is_active = true
    );
end
$$;

commit;
