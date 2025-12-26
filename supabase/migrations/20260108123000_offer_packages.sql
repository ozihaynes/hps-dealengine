-- 20260108123000_offer_packages.sql
-- Offer package generation (offer_packages) with RLS + audit.

begin;

create extension if not exists pgcrypto;

create table if not exists public.offer_packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  deal_id uuid not null references public.deals (id),
  run_id uuid not null references public.runs (id),
  template_version text not null default 'v1',
  policy_snapshot jsonb not null,
  arv_source text null,
  arv_as_of text null,
  arv_valuation_run_id uuid null,
  as_is_value_source text null,
  as_is_value_as_of text null,
  as_is_value_valuation_run_id uuid null,
  payload jsonb not null,
  payload_hash text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, run_id, template_version)
);

create index if not exists offer_packages_deal_created_desc
  on public.offer_packages (deal_id, created_at desc);

create index if not exists offer_packages_org_created_desc
  on public.offer_packages (org_id, created_at desc);

alter table public.offer_packages enable row level security;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='offer_packages' and policyname='offer_packages_select'
  ) then
    execute $$create policy offer_packages_select on public.offer_packages
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
    where schemaname='public' and tablename='offer_packages' and policyname='offer_packages_insert'
  ) then
    execute $$create policy offer_packages_insert on public.offer_packages
      for insert
      with check (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and created_by = auth.uid()
      );$$;
  end if;
end $pol$;

-- Keep updated_at fresh on updates (project-standard helper).
drop trigger if exists set_offer_packages_updated_at on public.offer_packages;
create trigger set_offer_packages_updated_at
before update on public.offer_packages
for each row execute function public.tg_set_updated_at();

-- Audit trail
drop trigger if exists audit_offer_packages on public.offer_packages;
create trigger audit_offer_packages
after insert or update or delete on public.offer_packages
for each row execute function public.audit_log_row_change();

commit;
