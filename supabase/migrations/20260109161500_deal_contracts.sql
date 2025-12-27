-- 20260109161500_deal_contracts.sql
-- Deal contract capture (deal_contracts) with RLS + audit.

begin;

create extension if not exists pgcrypto;

create table if not exists public.deal_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  deal_id uuid not null references public.deals (id),
  status text not null default 'under_contract',
  executed_contract_price numeric null,
  executed_contract_date date null,
  notes text null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, deal_id),
  constraint deal_contracts_status_check
    check (status in ('under_contract', 'closed', 'cancelled')),
  constraint deal_contracts_under_contract_price_check
    check (status <> 'under_contract' or executed_contract_price is not null)
);

create index if not exists deal_contracts_deal_id_idx
  on public.deal_contracts (deal_id);

alter table public.deal_contracts enable row level security;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_contracts' and policyname='deal_contracts_select'
  ) then
    execute $$create policy deal_contracts_select on public.deal_contracts
      for select
      using (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_contracts' and policyname='deal_contracts_insert'
  ) then
    execute $$create policy deal_contracts_insert on public.deal_contracts
      for insert
      with check (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and created_by = auth.uid()
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_contracts' and policyname='deal_contracts_update'
  ) then
    execute $$create policy deal_contracts_update on public.deal_contracts
      for update
      using (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
      )
      with check (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and created_by = (
          select dc.created_by from public.deal_contracts dc where dc.id = deal_contracts.id
        )
      );$$;
  end if;
end $pol$;

-- Keep updated_at fresh on updates (project-standard helper).
drop trigger if exists set_deal_contracts_updated_at on public.deal_contracts;
create trigger set_deal_contracts_updated_at
before update on public.deal_contracts
for each row execute function public.tg_set_updated_at();

-- Audit trail
drop trigger if exists audit_deal_contracts on public.deal_contracts;
create trigger audit_deal_contracts
after insert or update or delete on public.deal_contracts
for each row execute function public.audit_log_row_change();

commit;
