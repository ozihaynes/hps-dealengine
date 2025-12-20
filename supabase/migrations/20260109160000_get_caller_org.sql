-- Ensure get_caller_org is available via PostgREST for caller org resolution.
create or replace function public.get_caller_org()
returns uuid
language sql
security definer
set search_path = public
as $$
  select m.org_id
  from public.memberships m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit 1;
$$;

grant execute on function public.get_caller_org() to anon, authenticated, service_role;
