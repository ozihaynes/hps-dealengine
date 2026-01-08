-- Migration: Create invitations table for team invite flow
-- Slice: 2 (Team Access & Invitations)
-- Gap: G-009, G-010 (No invitations table, no invite flow)
-- Security: Cryptographic tokens, 7-day expiry, Manager+ RLS

BEGIN;

-- Enable pgcrypto for gen_random_bytes (cryptographic token generation)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role membership_role NOT NULL DEFAULT 'analyst',
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT invitations_email_format CHECK (email <> '' AND email LIKE '%@%'),
  CONSTRAINT invitations_expires_future CHECK (expires_at > created_at)
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Manager+ can SELECT org invitations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='invitations' AND policyname='invitations_select_manager'
  ) THEN
    CREATE POLICY invitations_select_manager ON public.invitations FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = invitations.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('manager', 'vp')
    ));
  END IF;
END $$;

-- Manager+ can INSERT invitations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='invitations' AND policyname='invitations_insert_manager'
  ) THEN
    CREATE POLICY invitations_insert_manager ON public.invitations FOR INSERT
    WITH CHECK (
      invited_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.org_id = invitations.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('manager', 'vp')
      )
    );
  END IF;
END $$;

-- Manager+ can UPDATE (for revocation)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='invitations' AND policyname='invitations_update_manager'
  ) THEN
    CREATE POLICY invitations_update_manager ON public.invitations FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = invitations.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('manager', 'vp')
    ));
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Token lookup (invite acceptance - most critical)
CREATE INDEX IF NOT EXISTS idx_invitations_token_pending
  ON public.invitations(token)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Listing pending by org
CREATE INDEX IF NOT EXISTS idx_invitations_org_pending
  ON public.invitations(org_id, created_at DESC)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Duplicate check (org + email for pending invites)
CREATE INDEX IF NOT EXISTS idx_invitations_org_email_pending
  ON public.invitations(org_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger (reuse existing function if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tg_set_updated_at') THEN
    DROP TRIGGER IF EXISTS set_invitations_updated_at ON public.invitations;
    CREATE TRIGGER set_invitations_updated_at
      BEFORE UPDATE ON public.invitations
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  ELSE
    -- Create a simple updated_at trigger function if not exists
    CREATE OR REPLACE FUNCTION public.invitations_set_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS set_invitations_updated_at ON public.invitations;
    CREATE TRIGGER set_invitations_updated_at
      BEFORE UPDATE ON public.invitations
      FOR EACH ROW EXECUTE FUNCTION public.invitations_set_updated_at();
  END IF;
END;
$$;

-- Audit trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_table_changes') THEN
    DROP TRIGGER IF EXISTS audit_invitations ON public.invitations;
    CREATE TRIGGER audit_invitations
      AFTER INSERT OR UPDATE OR DELETE ON public.invitations
      FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();
  END IF;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.invitations IS 'Team invitations with secure tokens and 7-day expiry';
COMMENT ON COLUMN public.invitations.token IS 'Cryptographic 32-byte hex token for invite link';
COMMENT ON COLUMN public.invitations.expires_at IS 'Invitation expires 7 days after creation';
COMMENT ON COLUMN public.invitations.accepted_at IS 'When accepted (null = pending)';
COMMENT ON COLUMN public.invitations.revoked_at IS 'When revoked (null = active)';

COMMIT;
