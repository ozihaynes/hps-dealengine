-- =========================================================
-- HPS DealEngine - DealFlow Guide (Slice 1)
-- Table: public.deal_task_states
-- Purpose: Persist per-task override states (NYA/NA) bound to canonical checklist task_key.
-- RLS: membership + deal org guard (caller JWT only)
-- Audit: public.audit_log_row_change()
-- =========================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.deal_task_states (
  id uuid primary key default gen_random_uuid(),

  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  task_key text not null,

  override_status text not null
    check (override_status in ('NOT_APPLICABLE', 'NOT_YET_AVAILABLE')),

  note text,
  expected_by timestamptz,

  schema_version int not null default 1,

  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid(),

  constraint deal_task_states_task_key_nonempty check (char_length(task_key) > 0),
  constraint deal_task_states_note_len check (note is null or char_length(note) <= 1000)
);

create unique index if not exists deal_task_states_org_deal_task_uq
  on public.deal_task_states (org_id, deal_id, task_key);

create index if not exists deal_task_states_deal_id_idx
  on public.deal_task_states (deal_id);

alter table public.deal_task_states enable row level security;

-- SELECT: membership + deal belongs to org
-- Policy name: deal_task_states_select_members
-- INSERT: membership + deal belongs to org
-- Policy name: deal_task_states_insert_members
-- UPDATE: membership + deal belongs to org
-- Policy name: deal_task_states_update_members
-- DELETE: membership + deal belongs to org
-- Policy name: deal_task_states_delete_members

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_task_states' and policyname='deal_task_states_select_members'
  ) then
    execute $$create policy deal_task_states_select_members
      on public.deal_task_states
      for select
      using (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_task_states.deal_id
            and d.org_id = deal_task_states.org_id
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_task_states' and policyname='deal_task_states_insert_members'
  ) then
    execute $$create policy deal_task_states_insert_members
      on public.deal_task_states
      for insert
      with check (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_task_states.deal_id
            and d.org_id = deal_task_states.org_id
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_task_states' and policyname='deal_task_states_update_members'
  ) then
    execute $$create policy deal_task_states_update_members
      on public.deal_task_states
      for update
      using (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_task_states.deal_id
            and d.org_id = deal_task_states.org_id
        )
      )
      with check (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_task_states.deal_id
            and d.org_id = deal_task_states.org_id
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_task_states' and policyname='deal_task_states_delete_members'
  ) then
    execute $$create policy deal_task_states_delete_members
      on public.deal_task_states
      for delete
      using (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_task_states.deal_id
            and d.org_id = deal_task_states.org_id
        )
      );$$;
  end if;
end $pol$;

-- updated_at trigger (shared helper)
drop trigger if exists deal_task_states_set_updated_at on public.deal_task_states;
create trigger deal_task_states_set_updated_at
before update on public.deal_task_states
for each row execute function public.tg_set_updated_at();

-- updated_by trigger (small helper)
create or replace function public.tg_deal_task_states_set_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists deal_task_states_set_updated_by on public.deal_task_states;
create trigger deal_task_states_set_updated_by
before update on public.deal_task_states
for each row execute function public.tg_deal_task_states_set_updated_by();

-- audit trigger (shared helper)
drop trigger if exists deal_task_states_audit_row_change on public.deal_task_states;
create trigger deal_task_states_audit_row_change
after insert or update or delete on public.deal_task_states
for each row execute function public.audit_log_row_change();

commit;
