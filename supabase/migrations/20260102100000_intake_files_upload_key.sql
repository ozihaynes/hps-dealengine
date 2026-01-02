-- Migration: Add upload_key column to intake_submission_files
-- This column stores the category/type of upload (e.g., "photos", "mortgage_statement")
-- Used to map uploaded files to the correct evidence kind during population

-- Add upload_key column
ALTER TABLE public.intake_submission_files
ADD COLUMN IF NOT EXISTS upload_key TEXT;

-- Add index for faster lookups by upload_key
CREATE INDEX IF NOT EXISTS idx_intake_submission_files_upload_key
ON public.intake_submission_files(upload_key)
WHERE upload_key IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.intake_submission_files.upload_key IS
  'Category key for this upload, maps to evidence_mappings.source_upload_key in schema';
