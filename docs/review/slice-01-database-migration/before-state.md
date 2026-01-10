# BEFORE STATE - Slice 01: Database Migration

Generated: 2026-01-10

## Current Schema Analysis

### deals table (public schema)
Source: `supabase/migrations/20251109000708_org_deals_and_audit_rls.sql`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | uuid | PK, gen_random_uuid() |
| org_id | uuid | FK -> organizations |
| created_by | uuid | default auth.uid() |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| address | text | |
| city | text | |
| state | text | |
| zip | text | |
| payload | jsonb | default '{}' |

RLS: Enabled with org-scoped policies

### engine_outputs table
**Status: Does NOT exist**

Engine outputs are currently stored in `runs.output` as JSONB.

### runs table columns (relevant)
Source: `supabase/migrations/20251108001201_remote_schema.sql`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | uuid | PK |
| org_id | uuid | NOT NULL |
| created_by | uuid | NOT NULL |
| created_at | timestamptz | NOT NULL |
| posture | policy_posture | NOT NULL |
| policy_version_id | uuid | |
| input | jsonb | NOT NULL |
| output | jsonb | NOT NULL - stores engine results |
| trace | jsonb | NOT NULL |
| input_hash | text | NOT NULL |
| output_hash | text | NOT NULL |
| policy_hash | text | |
| deal_id | uuid | Added in later migration |

### Existing enums
From migrations:
- membership_role: 'analyst', 'manager', 'vp'
- policy_posture: 'conservative', 'base', 'aggressive'

### New enums needed (from slice spec)
1. reason_for_selling
2. seller_timeline
3. decision_maker_status
4. foreclosure_status
5. lien_status
6. tax_status
7. property_condition
8. deferred_maintenance

## Migration Strategy

Since `engine_outputs` table does not exist, the migration will:
1. Create 8 new enums for underwriting fields
2. Add 29 new columns to `deals` table for input data
3. Create new `engine_outputs` table with 14 columns for computed results
4. Add 3 performance indexes

The `engine_outputs` table will be linked to `runs` via `run_id` foreign key.
