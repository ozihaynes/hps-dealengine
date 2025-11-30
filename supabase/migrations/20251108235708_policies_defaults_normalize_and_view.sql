-- 20251108235708_policies_defaults_normalize_and_view.sql
begin;

-- Ensure policy_json is always present and non-null.
alter table if exists public.policies
  alter column policy_json set default '{}'::jsonb;

update public.policies set policy_json = '{}'::jsonb where policy_json is null;

alter table if exists public.policies
  alter column policy_json set not null;

-- Tokens column was legacy in some branches; only touch if it exists.
DO $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'policies' and column_name = 'tokens'
  ) then
    update public.policies set tokens = coalesce(tokens, '{}'::jsonb) where tokens is null;
    execute 'alter table public.policies alter column tokens set default ''{}''::jsonb';
    execute 'alter table public.policies alter column tokens set not null';
  end if;
end$$;

-- Enforce a single active policy per (org_id, posture) using a partial unique index.
DO $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='policies_uni_org_posture_active'
  ) then
    execute 'create unique index policies_uni_org_posture_active
             on public.policies (org_id, posture) where is_active = true';
  end if;
end$$;

-- Stable view for audit/history UI.
create or replace view public.policy_versions_api as
select
  pv.id             as version_id,
  pv.org_id         as org_id,
  pv.posture        as posture,
  pv.created_by     as actor_user_id,
  pv.created_at     as created_at,
  pv.change_summary as change_summary
from public.policy_versions pv;

commit;