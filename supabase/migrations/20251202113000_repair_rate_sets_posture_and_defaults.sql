-- 20251202113000_repair_rate_sets_posture_and_defaults.sql
-- Extend repair_rate_sets with posture/name/is_default and tighten indexes/RLS roles.
-- Backwards-compatible: fills defaults for existing rows and preserves audit trigger.

begin;

-- Add new columns if missing
alter table if exists public.repair_rate_sets
  add column if not exists name text not null default 'Default';

alter table if exists public.repair_rate_sets
  add column if not exists posture text not null default 'base';

alter table if exists public.repair_rate_sets
  add column if not exists is_default boolean not null default false;

-- Posture check constraint (align with policy_posture semantics)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'repair_rate_sets_posture_check'
      and conrelid = 'public.repair_rate_sets'::regclass
  ) then
    alter table public.repair_rate_sets
      add constraint repair_rate_sets_posture_check
      check (posture in ('conservative','base','aggressive')) not valid;
    alter table public.repair_rate_sets validate constraint repair_rate_sets_posture_check;
  end if;
end
$$;

-- Replace unique active index to include posture dimension
do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'repair_rate_sets_org_market_active_uidx'
  ) then
    drop index if exists public.repair_rate_sets_org_market_active_uidx;
  end if;
end
$$;

create unique index if not exists repair_rate_sets_org_market_posture_active_uidx
  on public.repair_rate_sets (org_id, market_code, posture)
  where is_active;

-- Default-selection guard per org/market/posture
create unique index if not exists repair_rate_sets_org_market_posture_default_uidx
  on public.repair_rate_sets (org_id, market_code, posture)
  where is_default;

-- Policy updates: allow owner role for mutating actions; keep existing select rule
do $pol$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_insert_manager'
  ) then
    drop policy repair_rate_sets_insert_manager on public.repair_rate_sets;
  end if;

  create policy repair_rate_sets_insert_manager on public.repair_rate_sets
    for insert
    with check (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('manager','vp','owner')
      )
    );
end
$pol$;

do $pol$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_update_manager'
  ) then
    drop policy repair_rate_sets_update_manager on public.repair_rate_sets;
  end if;

  create policy repair_rate_sets_update_manager on public.repair_rate_sets
    for update
    using (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('manager','vp','owner')
      )
    )
    with check (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('manager','vp','owner')
      )
    );
end
$pol$;

do $pol$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_delete_manager'
  ) then
    drop policy repair_rate_sets_delete_manager on public.repair_rate_sets;
  end if;

  create policy repair_rate_sets_delete_manager on public.repair_rate_sets
    for delete
    using (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('manager','vp','owner')
      )
    );
end
$pol$;

-- Keep select policy unchanged (already allows any org member).

commit;
