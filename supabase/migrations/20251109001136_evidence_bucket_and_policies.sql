-- Guarded: create 'evidence' bucket only when Storage SQL functions are present.
-- Rationale: local bootstrap can run before storage schema is fully installed; skip instead of failing.
DO $evidence$
BEGIN
  -- ensure 'storage' schema exists and function 'create_bucket' is installed before calling it
  IF EXISTS (
       SELECT 1 FROM pg_namespace WHERE nspname = 'storage'
     ) AND EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'storage' AND p.proname = 'create_bucket'
     ) THEN
    -- optional: also ensure the buckets table exists
    IF EXISTS (
         SELECT 1
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'storage' AND c.relname = 'buckets'
       ) THEN
      IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'evidence') THEN
        PERFORM storage.create_bucket('evidence', public => false);
      END IF;
    END IF;
  END IF;
END
$evidence$;
