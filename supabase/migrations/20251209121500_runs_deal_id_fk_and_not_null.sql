begin;

-- Enforce deal_id presence for new runs (legacy rows tolerated via NOT VALID)
do $$
begin
  alter table public.runs
    add constraint runs_deal_id_not_null
    check (deal_id is not null)
    not valid;
exception
  when duplicate_object then
    null;
end
$$;

-- Enforce deal_id references a deals row for new inserts/updates (NOT VALID for legacy rows)
do $$
begin
  alter table public.runs
    add constraint runs_deal_id_fkey
    foreign key (deal_id)
    references public.deals (id)
    on delete restrict
    not valid;
exception
  when duplicate_object then
    null;
end
$$;

commit;
