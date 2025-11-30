-- supabase/migrations/20251201120000_sandbox_presets.sql
-- Org-scoped sandbox presets (Business Logic Sandbox)
begin;

create table if not exists public.sandbox_presets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  posture     text not null check (posture in ('conservative','base','aggressive')),
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sandbox_presets_unique_org_name_posture unique (org_id, name, posture)
);

alter table public.sandbox_presets enable row level security;

-- RLS policies (org membership)
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_presets' and policyname='sandbox_presets_select'
  ) then
    execute $$create policy sandbox_presets_select on public.sandbox_presets
      for select
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_presets.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_presets' and policyname='sandbox_presets_insert'
  ) then
    execute $$create policy sandbox_presets_insert on public.sandbox_presets
      for insert
      with check (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_presets.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_presets' and policyname='sandbox_presets_update'
  ) then
    execute $$create policy sandbox_presets_update on public.sandbox_presets
      for update
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_presets.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_presets.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_presets' and policyname='sandbox_presets_delete'
  ) then
    execute $$create policy sandbox_presets_delete on public.sandbox_presets
      for delete
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_presets.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

-- updated_at trigger (shared helper already defined elsewhere)
drop trigger if exists set_sandbox_presets_updated_at on public.sandbox_presets;
create trigger set_sandbox_presets_updated_at
before update on public.sandbox_presets
for each row execute function public.tg_set_updated_at();

-- audit trigger (shared helper already defined elsewhere)
drop trigger if exists audit_sandbox_presets on public.sandbox_presets;
create trigger audit_sandbox_presets
after insert or update or delete on public.sandbox_presets
for each row execute function public.audit_log_row_change();

commit;
