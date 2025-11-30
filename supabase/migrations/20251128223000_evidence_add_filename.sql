-- 20251128223000_evidence_add_filename.sql
-- Ensure public.evidence has a filename column used by UI + v1-ai-bridge

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evidence'
      AND column_name = 'filename'
  ) THEN
    ALTER TABLE public.evidence
      ADD COLUMN filename text;
  END IF;
END $$;
