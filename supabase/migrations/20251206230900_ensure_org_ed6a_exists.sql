-- 20251206230900_ensure_org_ed6a_exists.sql
-- Ensure the ed6a QA org exists before downstream seeds run.

insert into public.organizations (id, name)
values ('ed6ae332-2d15-44be-a8fb-36005522ad60', 'ed6a QA org (seed)')
on conflict (id) do nothing;
