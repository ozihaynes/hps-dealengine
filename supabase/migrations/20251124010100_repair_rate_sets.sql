-- 20251124010100_repair_rate_sets.sql
-- Create org-scoped, versioned repair rate sets with RLS + audit trigger.

begin;

create table if not exists public.repair_rate_sets (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  market_code      text not null,
  as_of            date not null,
  source           text,
  version          text not null,
  is_active        boolean not null default true,
  repair_psf_tiers jsonb not null default '{}'::jsonb,
  repair_big5      jsonb not null default '{}'::jsonb,
  line_item_rates  jsonb not null default '{}'::jsonb,
  created_by       uuid not null default auth.uid(),
  created_at       timestamptz not null default timezone('utc', now())
);

comment on table public.repair_rate_sets is
  'Versioned repair rate sets (PSF tiers, Big 5, line item rates) scoped by org/market.';

-- Basic indexes
create index if not exists repair_rate_sets_org_id_idx
  on public.repair_rate_sets (org_id);

create unique index if not exists repair_rate_sets_org_market_active_uidx
  on public.repair_rate_sets (org_id, market_code)
  where is_active;

-- Enable RLS
alter table public.repair_rate_sets
  enable row level security;

-- SELECT policy: any member of the org can read rate sets
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_select_in_org'
  ) then
    execute $$
      create policy repair_rate_sets_select_in_org on public.repair_rate_sets
        for select
        using (
          exists (
            select 1 from public.memberships m
            where m.org_id = repair_rate_sets.org_id
              and m.user_id = auth.uid()
          )
        );
    $$;
  end if;
end $pol$;

-- INSERT policy: manager/vp only
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_insert_manager'
  ) then
    execute $$
      create policy repair_rate_sets_insert_manager on public.repair_rate_sets
        for insert
        with check (
          exists (
            select 1 from public.memberships m
            where m.org_id = repair_rate_sets.org_id
              and m.user_id = auth.uid()
              and m.role in ('manager','vp')
          )
        );
    $$;
  end if;
end $pol$;

-- UPDATE policy: manager/vp only
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_update_manager'
  ) then
    execute $$
      create policy repair_rate_sets_update_manager on public.repair_rate_sets
        for update
        using (
          exists (
            select 1 from public.memberships m
            where m.org_id = repair_rate_sets.org_id
              and m.user_id = auth.uid()
              and m.role in ('manager','vp')
          )
        )
        with check (
          exists (
            select 1 from public.memberships m
            where m.org_id = repair_rate_sets.org_id
              and m.user_id = auth.uid()
              and m.role in ('manager','vp')
          )
        );
    $$;
  end if;
end $pol$;

-- DELETE policy: manager/vp only
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_delete_manager'
  ) then
    execute $$
      create policy repair_rate_sets_delete_manager on public.repair_rate_sets
        for delete
        using (
          exists (
            select 1 from public.memberships m
            where m.org_id = repair_rate_sets.org_id
              and m.user_id = auth.uid()
              and m.role in ('manager','vp')
          )
        );
    $$;
  end if;
end $pol$;

-- Attach audit trigger using existing audit_log_row_change()
drop trigger if exists audit_repair_rate_sets on public.repair_rate_sets;
create trigger audit_repair_rate_sets
after insert or update or delete on public.repair_rate_sets
for each row execute function public.audit_log_row_change();

commit;
