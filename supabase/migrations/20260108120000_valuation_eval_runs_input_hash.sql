-- Add input_hash for valuation_eval_runs (idempotent), scoped to active rows
begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'valuation_eval_runs'
      and column_name = 'input_hash'
  ) then
    alter table public.valuation_eval_runs
      add column input_hash text;
  end if;
end
$$;

create unique index if not exists idx_valuation_eval_runs_org_input_hash
  on public.valuation_eval_runs (org_id, input_hash)
  where input_hash is not null;

commit;
