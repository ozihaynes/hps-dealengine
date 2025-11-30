-- Idempotent guard for shadow replays and fresh environments
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'runs' AND c.relkind = 'r'
  ) THEN
    CREATE TABLE public.runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid()
    );
  END IF;
END
$$;
