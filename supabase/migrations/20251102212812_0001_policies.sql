-- 0001_policies.sql
create extension if not exists pgcrypto;

create table if not exists public.policies (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid      not null,
  posture    text      not null check (posture in ('conservative','base','aggressive')),
  tokens     jsonb     not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

alter table public.policies enable row level security;

create policy "tenant can select own policies"
  on public.policies for select
  using (org_id = auth.uid());

create policy "tenant can insert own policies"
  on public.policies for insert
  with check (org_id = auth.uid());

create policy "tenant can update own policies"
  on public.policies for update
  using (org_id = auth.uid())
  with check (org_id = auth.uid());

create index if not exists policies_org_posture_created_at_idx
  on public.policies (org_id, posture, created_at desc);
