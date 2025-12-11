begin;

-- Add client contact fields to deals (idempotent-friendly)
alter table public.deals
  add column if not exists client_name text,
  add column if not exists client_phone text,
  add column if not exists client_email text;

commit;
