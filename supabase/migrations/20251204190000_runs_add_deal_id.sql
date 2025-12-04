-- Add deal_id to public.runs and backfill from historical input envelopes.
-- This stays nullable for legacy rows but all new inserts must set it.
begin;

alter table public.runs
  add column if not exists deal_id uuid references public.deals(id) on delete set null;

-- Backfill deal_id from the input envelope when present.
update public.runs
set deal_id = (input->>'dealId')::uuid
where deal_id is null
  and (input->>'dealId') ~* '^[0-9a-f-]{36}$';

-- Helpful org/deal lookup for trace pages.
create index if not exists runs_org_deal_created_idx
  on public.runs (org_id, deal_id, created_at desc);

commit;
