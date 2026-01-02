-- Migration: Add section progress tracking to intake_submissions
-- This enables save/resume functionality for intake forms

-- Add last_section_index to track where client left off
ALTER TABLE public.intake_submissions
ADD COLUMN IF NOT EXISTS last_section_index INTEGER NOT NULL DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.intake_submissions.last_section_index IS
  'Index of the last section the client was viewing (0-indexed). Used for resume functionality.';

-- Index for queries that filter by section progress (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_intake_submissions_last_section
ON public.intake_submissions(last_section_index)
WHERE status = 'DRAFT';
