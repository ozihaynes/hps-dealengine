-- valuation_comp_overrides table: org-scoped manual comp overrides (concessions + condition)
begin;

create extension if not exists pgcrypto;

create table if not exists public.valuation_comp_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  comp_id text not null,
  comp_kind text not null check (comp_kind in ('closed_sale','sale_listing')),
  seller_credit_pct numeric null,
  seller_credit_usd numeric null,
  condition_adjustment_usd numeric null,
  notes text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valuation_comp_overrides_unique unique (org_id, deal_id, comp_id, comp_kind),
  constraint valuation_comp_overrides_seller_credit_pct_check check (seller_credit_pct is null or (seller_credit_pct >= 0 and seller_credit_pct <= 0.5))
);

create index if not exists idx_valuation_comp_overrides_org_deal
  on public.valuation_comp_overrides (org_id, deal_id);

create index if not exists idx_valuation_comp_overrides_org_deal_kind
  on public.valuation_comp_overrides (org_id, deal_id, comp_kind);

alter table public.valuation_comp_overrides
  enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='memberships') then
    perform public._ensure_policy_cmd(
      'valuation_comp_overrides_sel',
      'public.valuation_comp_overrides',
      'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_comp_overrides.org_id AND m.user_id = auth.uid())',
      null
    );
    perform public._ensure_policy_cmd(
      'valuation_comp_overrides_ins',
      'public.valuation_comp_overrides',
      'INSERT',
      null,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_comp_overrides.org_id AND m.user_id = auth.uid() AND m.role IN (''owner'',''manager'',''vp''))'
    );
    perform public._ensure_policy_cmd(
      'valuation_comp_overrides_upd',
      'public.valuation_comp_overrides',
      'UPDATE',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_comp_overrides.org_id AND m.user_id = auth.uid() AND m.role IN (''owner'',''manager'',''vp''))',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_comp_overrides.org_id AND m.user_id = auth.uid() AND m.role IN (''owner'',''manager'',''vp''))'
    );
    perform public._ensure_policy_cmd(
      'valuation_comp_overrides_del',
      'public.valuation_comp_overrides',
      'DELETE',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_comp_overrides.org_id AND m.user_id = auth.uid() AND m.role IN (''owner'',''manager'',''vp''))',
      null
    );
  else
    raise notice 'RLS policies for valuation_comp_overrides skipped (memberships missing)';
  end if;
end
$$;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_valuation_comp_overrides_updated_at on public.valuation_comp_overrides;
create trigger set_valuation_comp_overrides_updated_at
before update on public.valuation_comp_overrides
for each row execute function public.tg_set_updated_at();

drop trigger if exists audit_valuation_comp_overrides on public.valuation_comp_overrides;
create trigger audit_valuation_comp_overrides
after insert or update or delete on public.valuation_comp_overrides
for each row execute function public.audit_log_row_change();

commit;
