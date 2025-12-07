-- 20251208104500_repair_rate_sets_org_alignment.sql
-- Normalize repair_rate_sets so every org with deals has one active/default ORL/base profile.
-- This prevents org mismatches between deals (org-scoped) and repair profiles resolved via dealId.

begin;

-- Provide an actor for audit triggers during the migration run
select set_config('request.jwt.claim.sub', coalesce(current_setting('request.jwt.claim.sub', true), '00000000-0000-0000-0000-000000000000'), true);

do $$
declare
  v_org record;
  v_existing uuid;
  v_clone_source record;
  v_final uuid;
begin
  for v_org in
    select distinct org_id from public.deals
  loop
    -- Pick the best existing row for this org/market/posture
    select id
      into v_existing
      from public.repair_rate_sets
     where org_id = v_org.org_id
       and market_code = 'ORL'
       and posture = 'base'
     order by is_active desc, is_default desc, created_at desc
     limit 1;

    -- If none exist, clone the latest ORL/base profile from any org as a seed
    if v_existing is null then
      select id,
             name,
             as_of,
             source,
             version,
             repair_psf_tiers,
             repair_big5,
             line_item_rates
        into v_clone_source
        from public.repair_rate_sets
       where market_code = 'ORL'
         and posture = 'base'
       order by is_active desc, is_default desc, created_at desc
       limit 1;

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
      values (
        gen_random_uuid(),
        v_org.org_id,
        coalesce(v_clone_source.name, 'Default (org aligned)'),
        'ORL',
        'base',
        coalesce(v_clone_source.as_of, current_date),
        coalesce(v_clone_source.source, 'normalized'),
        coalesce(v_clone_source.version, 'v1'),
        true,
        true,
        coalesce(v_clone_source.repair_psf_tiers, jsonb_build_object('none', 0, 'light', 25, 'medium', 40, 'heavy', 60)),
        coalesce(v_clone_source.repair_big5, jsonb_build_object('roof', 6, 'hvac', 6, 'repipe', 5, 'electrical', 5.5, 'foundation', 15)),
        coalesce(v_clone_source.line_item_rates, '{}'::jsonb)
      )
      returning id into v_final;
    else
      v_final := v_existing;
    end if;

    -- Ensure exactly one active/default per org/market/posture
    update public.repair_rate_sets
       set is_active = false,
           is_default = false
     where org_id = v_org.org_id
       and market_code = 'ORL'
       and posture = 'base'
       and id <> v_final
       and (is_active or is_default);

    update public.repair_rate_sets
       set is_active = true,
           is_default = true
     where id = v_final;
  end loop;
end $$;

commit;
