-- 20251123163000_audit_logs_fix_columns.sql
-- Ensure public.audit_logs has the columns expected by audit_log_row_change()
-- (table_name, row_id_uuid). Safe to run multiple times.

alter table public.audit_logs
  add column if not exists table_name text;

alter table public.audit_logs
  add column if not exists row_id_uuid uuid;