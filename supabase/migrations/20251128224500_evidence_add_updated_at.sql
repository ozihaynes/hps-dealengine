-- 20251128224500_evidence_add_updated_at.sql
-- Ensure public.evidence has updated_at column used by triggers/UI

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evidence'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.evidence
      ADD COLUMN updated_at timestamptz;
  END IF;
END $$;
