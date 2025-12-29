-- =========================================================
-- HPS DealEngine - DealFlow Guide (Slice 3)
-- Table: public.deal_workflow_events
-- Purpose: Append-only workflow milestones (e.g., Underwriting Complete)
-- Security: RLS-first (caller JWT), no updates/deletes, membership + deal org guard
-- Audit: public.audit_log_row_change() on INSERT
-- Snapshot: BEFORE INSERT trigger stores current deal_task_states into metadata.overrides_snapshot
-- Hash: event_hash computed in Edge via Web Crypto (NOT pgcrypto); stored as text.
-- =========================================================

begin;

-- Enum for workflow event types
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='deal_workflow_event_type') then
    create type public.deal_workflow_event_type as enum ('UNDERWRITING_COMPLETE');
  end if;
end $$;

create table if not exists public.deal_workflow_events (
  id uuid primary key, -- generated in Edge via crypto.randomUUID()

  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,

  event_type public.deal_workflow_event_type not null,

  run_id uuid not null references public.runs(id) on delete restrict,
  policy_hash text not null,

  event_hash text not null, -- hex sha256 of canonical template string
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint deal_workflow_events_event_hash_len check (char_length(event_hash) = 64),
  constraint deal_workflow_events_policy_hash_nonempty check (char_length(policy_hash) > 0)
);

create unique index if not exists deal_workflow_events_event_hash_uq
  on public.deal_workflow_events (event_hash);

create index if not exists deal_workflow_events_deal_id_idx
  on public.deal_workflow_events (deal_id);

alter table public.deal_workflow_events enable row level security;

-- SELECT: membership + deal belongs to org
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_workflow_events' and policyname='deal_workflow_events_select_members'
  ) then
    execute $sql$
      create policy deal_workflow_events_select_members
      on public.deal_workflow_events
      for select
      using (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_workflow_events.deal_id
            and d.org_id = deal_workflow_events.org_id
        )
      );
    $sql$;
  end if;
end $pol$;

-- INSERT: membership + deal belongs to org
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_workflow_events' and policyname='deal_workflow_events_insert_members'
  ) then
    execute $sql$
      create policy deal_workflow_events_insert_members
      on public.deal_workflow_events
      for insert
      with check (
        exists (
          select 1
          from public.deals d
          join public.memberships m
            on m.org_id = d.org_id
           and m.user_id = auth.uid()
          where d.id = deal_workflow_events.deal_id
            and d.org_id = deal_workflow_events.org_id
        )
      );
    $sql$;
  end if;
end $pol$;

-- Append-only enforcement:
-- No UPDATE/DELETE policies => those operations are denied under RLS.

-- Snapshot current overrides atomically into metadata
create or replace function public.tg_deal_workflow_events_snapshot_overrides()
returns trigger
language plpgsql
as $$
begin
  new.metadata =
    jsonb_set(
      coalesce(new.metadata, '{}'::jsonb),
      '{overrides_snapshot}',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'task_key', s.task_key,
              'override_status', s.override_status,
              'note', s.note,
              'expected_by', s.expected_by,
              'created_at', s.created_at,
              'updated_at', s.updated_at
            )
            order by s.task_key
          )
          from public.deal_task_states s
          where s.deal_id = new.deal_id
            and s.org_id = new.org_id
        ),
        '[]'::jsonb
      ),
      true
    );

  return new;
end;
$$;

drop trigger if exists deal_workflow_events_snapshot_overrides on public.deal_workflow_events;
create trigger deal_workflow_events_snapshot_overrides
before insert on public.deal_workflow_events
for each row execute function public.tg_deal_workflow_events_snapshot_overrides();

-- Audit trigger (append-only insert)
drop trigger if exists deal_workflow_events_audit_row_change on public.deal_workflow_events;
create trigger deal_workflow_events_audit_row_change
after insert on public.deal_workflow_events
for each row execute function public.audit_log_row_change();

commit;
