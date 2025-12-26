-- 20260109163000_deal_contracts_rls_fix.sql
-- Fix deal_contracts update RLS and enforce immutability via trigger.

begin;

-- Replace UPDATE policy to avoid self-referencing recursion.
drop policy if exists deal_contracts_update on public.deal_contracts;

create policy deal_contracts_update on public.deal_contracts
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
  );

-- Enforce immutability for key columns.
create or replace function public.tg_deal_contracts_immutable()
returns trigger as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'deal_contracts.created_by is immutable';
  end if;
  if new.org_id is distinct from old.org_id then
    raise exception 'deal_contracts.org_id is immutable';
  end if;
  if new.deal_id is distinct from old.deal_id then
    raise exception 'deal_contracts.deal_id is immutable';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'deal_contracts.created_at is immutable';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_deal_contracts_immutable on public.deal_contracts;
create trigger prevent_deal_contracts_immutable
before update on public.deal_contracts
for each row execute function public.tg_deal_contracts_immutable();

commit;
