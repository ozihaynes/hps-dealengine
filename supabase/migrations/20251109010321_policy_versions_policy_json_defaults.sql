-- 20251109010321_policy_versions_policy_json_defaults.sql
begin;

-- Backfill any NULLs defensively (should be none if app behaved)
update public.policy_versions
set policy_json = '{}'::jsonb
where policy_json is null;

-- Enforce default + NOT NULL
alter table public.policy_versions
  alter column policy_json set default '{}'::jsonb;

alter table public.policy_versions
  alter column policy_json set not null;

commit;
