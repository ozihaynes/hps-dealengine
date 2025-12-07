-- 20251206220000_repair_rate_sets_align_ed6a.sql
-- Align ORL/base repair profiles to the ed6ae332... org and ensure one active/default row exists.
-- This fixes the mismatch where active profiles lived under a different org and v1-repair-rates
-- (which resolves org_id via dealId) returned 404/400.

begin;

-- Ensure audit trigger has an actor
select set_config('request.jwt.claim.sub', '52a1b235-0761-4b05-b765-f3df1a324387', true);

do $$
declare
  v_target_org uuid := 'ed6ae332-2d15-44be-a8fb-36005522ad60';
  v_source_org uuid := '6dc153c2-6f6d-4076-afe1-e8b0aad97fe9';
  v_market    text := 'ORL';
  v_posture   text := 'base';
  v_candidate uuid;
  v_inserted  uuid;
begin
  -- Clear existing active/default in the target org for this market/posture to avoid unique conflicts.
  update public.repair_rate_sets
    set is_active = false,
        is_default = false
    where org_id = v_target_org
      and market_code = v_market
      and posture = v_posture
      and (is_active or is_default);

  -- Pick a source profile from the legacy org (prefer named '11111' if present).
  select id
    into v_candidate
    from public.repair_rate_sets
   where org_id = v_source_org
     and market_code = v_market
     and posture = v_posture
   order by (name = '11111') desc, created_at desc
   limit 1;

  -- Clone it into the target org (inactive by default to avoid uniqueness), preserving rates/meta.
  if v_candidate is not null then
    insert into public.repair_rate_sets (
      id,
      org_id,
      name,
      market_code,
      posture,
      as_of,
      source,
      version,
      is_active,
      is_default,
      repair_psf_tiers,
      repair_big5,
      line_item_rates
    )
    select
      gen_random_uuid(),
      v_target_org,
      concat(name, ' (migrated)'),
      market_code,
      posture,
      as_of,
      source,
      version,
      false,
      false,
      repair_psf_tiers,
      repair_big5,
      line_item_rates
    from public.repair_rate_sets
    where id = v_candidate
    limit 1
    returning id into v_inserted;
  end if;

  -- Pick a row to activate: prefer the freshly inserted clone, otherwise the most recent target-row.
  if v_inserted is null then
    select id
      into v_inserted
      from public.repair_rate_sets
     where org_id = v_target_org
       and market_code = v_market
       and posture = v_posture
     order by created_at desc
     limit 1;
  end if;

  -- Mark the chosen row as the sole active/default.
  if v_inserted is not null then
    update public.repair_rate_sets
      set is_active = true,
          is_default = true
      where id = v_inserted;
  end if;
end $$;

commit;
