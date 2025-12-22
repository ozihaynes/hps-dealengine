-- 20251219231058_v1_truth_schema_fixes.sql
-- Codify runs.policy_snapshot shape and make audit_logs.actor_user_id nullable.

-- Ensure policy_snapshot exists on runs with deterministic default.
alter table public.runs
  add column if not exists policy_snapshot jsonb;

alter table public.runs
  alter column policy_snapshot set default '{}'::jsonb;

update public.runs
  set policy_snapshot = '{}'::jsonb
  where policy_snapshot is null;

-- Keep audit_logs.actor_user_id nullable (default untouched).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'actor_user_id'
      and is_nullable = 'NO'
  ) then
    alter table public.audit_logs
      alter column actor_user_id drop not null;
  end if;
end $$;
