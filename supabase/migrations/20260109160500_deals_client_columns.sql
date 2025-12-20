-- Align deals table with UI expectations for client contact fields.
alter table public.deals
  add column if not exists client_name text,
  add column if not exists client_phone text,
  add column if not exists client_email text;
