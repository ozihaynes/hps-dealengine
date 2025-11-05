create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  org_id  uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role    text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.memberships  enable row level security;

-- Make the migration idempotent: drop+recreate policies
drop policy if exists orgs_select_members on public.organizations;
create policy orgs_select_members on public.organizations
  for select using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists mships_select_self on public.memberships;
create policy mships_select_self on public.memberships
  for select using (user_id = auth.uid());

-- Seed one org and attach the current user as owner
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'HPS Test Org')
on conflict (id) do nothing;

insert into public.memberships (org_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', '391ec2a5-4330-497a-b4ff-f510ab61fddf', 'owner')
on conflict (org_id, user_id) do nothing;
