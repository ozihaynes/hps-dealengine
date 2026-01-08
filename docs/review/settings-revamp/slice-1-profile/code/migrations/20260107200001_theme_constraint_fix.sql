-- Migration: Fix theme CHECK constraint to include violet and pink
-- Gap: G-006 (Theme constraint missing violet/pink)
-- Evidence: lib/themeTokens.ts includes these themes but DB constraint rejects them
-- Rollback: ALTER TABLE user_settings DROP CONSTRAINT user_settings_theme_check;
--           ALTER TABLE user_settings ADD CONSTRAINT user_settings_theme_check
--             CHECK (theme IN ('system','dark','light','navy','burgundy','green','black','white'));

BEGIN;

-- Only run if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_check;
    ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_theme_check
      CHECK (theme IN ('system','dark','light','navy','burgundy','green','black','white','violet','pink'));
  END IF;
END;
$$;

COMMIT;
