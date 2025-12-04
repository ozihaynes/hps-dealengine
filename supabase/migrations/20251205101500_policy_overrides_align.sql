-- Align policy_overrides with governance needs: deal linkage, old_value, justification required.
begin;

-- Add deal_id if missing (nullable for legacy rows)
alter table public.policy_overrides
  add column if not exists deal_id uuid references public.deals(id) on delete set null;

-- Ensure requested_by/requested_at are not null with defaults
alter table public.policy_overrides
  alter column requested_by set not null,
  alter column requested_by set default auth.uid(),
  alter column requested_at set not null,
  alter column requested_at set default now();

-- Add old_value column for auditability
alter table public.policy_overrides
  add column if not exists old_value jsonb;

-- Justification required
alter table public.policy_overrides
  alter column justification set not null,
  alter column justification set default ''::text;

-- Helpful indexes for org/status sorting
create index if not exists policy_overrides_org_status_idx
  on public.policy_overrides (org_id, status, requested_at desc);

create index if not exists policy_overrides_deal_idx
  on public.policy_overrides (deal_id, posture);

commit;
