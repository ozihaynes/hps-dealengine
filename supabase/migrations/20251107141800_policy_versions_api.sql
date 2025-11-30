-- Self-sufficient, idempotent view creation for policy_versions_api (shadow-safe).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $blk$
BEGIN
  -- Create stub table if missing (only affects shadow; prod already has it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='policy_versions'
  ) THEN
    CREATE TABLE public.policy_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      --
      -- ↓↓↓ THIS IS THE FIX: Added the missing policy_id foreign key ↓↓↓
      --
      policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
      --
      -- ↑↑↑ END OF FIX ↑↑↑
      --
      org_id uuid NOT NULL,
      posture text NOT NULL,
      policy_json jsonb,
      change_summary text,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    );
  END IF;

  -- Create or replace API view with invoker rights
  EXECUTE $v$
    CREATE OR REPLACE VIEW public.policy_versions_api
    WITH (security_invoker = on)
    AS
    SELECT
      pv.id         AS version_id,
      pv.org_id     AS org_id,
      pv.posture    AS posture,
      pv.created_by AS actor_user_id,
      pv.created_at AS created_at,
      pv.change_summary
    FROM public.policy_versions pv;
  $v$;
END
$blk$;