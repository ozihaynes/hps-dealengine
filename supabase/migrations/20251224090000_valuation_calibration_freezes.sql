-- HPS DealEngine: Calibration freeze switch (market-level)
-- Allows privileged roles to freeze calibration publishing per org + market_key.
-- RLS-first, audit-logged, deterministic.
begin;

create extension if not exists "pgcrypto";

create table if not exists public.valuation_calibration_freezes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  market_key text not null,
  is_frozen boolean not null default true,
  reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create unique index if not exists valuation_calibration_freezes_uq
  on public.valuation_calibration_freezes (org_id, market_key);

create index if not exists valuation_calibration_freezes_org_market_idx
  on public.valuation_calibration_freezes (org_id, market_key);

alter table public.valuation_calibration_freezes enable row level security;

drop policy if exists valuation_calibration_freezes_select on public.valuation_calibration_freezes;
create policy valuation_calibration_freezes_select
on public.valuation_calibration_freezes
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists valuation_calibration_freezes_write on public.valuation_calibration_freezes;
create policy valuation_calibration_freezes_write
on public.valuation_calibration_freezes
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('manager','vp','owner')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('manager','vp','owner')
  )
);

drop trigger if exists set_valuation_calibration_freezes_updated_at on public.valuation_calibration_freezes;
create trigger set_valuation_calibration_freezes_updated_at
before update on public.valuation_calibration_freezes
for each row execute function public.tg_set_updated_at();

drop trigger if exists audit_valuation_calibration_freezes on public.valuation_calibration_freezes;
create trigger audit_valuation_calibration_freezes
after insert or update or delete on public.valuation_calibration_freezes
for each row execute function public.audit_log_row_change();

commit;
