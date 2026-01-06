# Database Schema Audit
Date: 2026-01-03
Auditor: Claude Code

## Overview

The HPS DealEngine uses **Supabase/PostgreSQL** with 87+ migrations. The database is organized into multiple schemas:
- `public` - Main application tables
- `hps` - Legacy/core property tables
- `storage` - File storage buckets

---

## Core Tables

### public.deals
Primary deal record table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| payload_json | jsonb | NULL | '{}' | Deal payload data |
| results_json | jsonb | NULL | '{}' | Analysis results |
| client_name | text | NULL | - | Client name |
| client_phone | text | NULL | - | Client phone |
| client_email | text | NULL | - | Client email |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL | now() | Last update |

**RLS Policies:**
- SELECT/INSERT/UPDATE/DELETE: `org_id = get_caller_org()`

---

### public.runs
Underwriting analysis runs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| deal_id | uuid | NOT NULL | - | Deal FK |
| posture | text | NULL | 'balanced' | Analysis posture |
| input_hash | text | NULL | - | Input determinism hash |
| policy_hash | text | NULL | - | Policy version hash |
| input | jsonb | NOT NULL | - | Input payload |
| output | jsonb | NOT NULL | - | Analysis outputs |
| trace | jsonb | NULL | '[]' | Trace frames array |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

**RLS Policies:**
- SELECT/INSERT/UPDATE: `org_id = get_caller_org()`

**Indexes:**
- `runs_deal_id_idx` on (deal_id)
- `runs_org_id_idx` on (org_id)
- `runs_input_hash_idx` on (input_hash)

---

### public.policy_versions
Policy configuration snapshots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| posture | text | NOT NULL | 'balanced' | Policy posture |
| policy_json | jsonb | NOT NULL | - | Full policy config |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

**RLS Policies:**
- SELECT: `org_id = get_caller_org()`
- INSERT: `org_id = get_caller_org()` (managers only)

---

### public.offer_packages
Generated offer package snapshots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| deal_id | uuid | NOT NULL | - | Deal FK |
| run_id | uuid | NOT NULL | - | Analysis run FK |
| policy_snapshot | jsonb | NOT NULL | - | Policy at generation time |
| payload | jsonb | NOT NULL | - | Package payload |
| payload_hash | text | NOT NULL | - | Deduplication hash |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

**RLS Policies:**
- SELECT/INSERT: `org_id = get_caller_org()`

---

### public.deal_contracts
Contract tracking for deals.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| deal_id | uuid | NOT NULL | - | Deal FK (unique) |
| executed_contract_price | numeric | NULL | - | Contract price |
| status | text | NOT NULL | 'under_contract' | Status enum |
| notes | text | NULL | - | Contract notes |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL | now() | Last update |

**Status Enum:** 'under_contract', 'closed', 'cancelled'

**RLS Policies:**
- SELECT/INSERT/UPDATE/DELETE: `org_id = get_caller_org()`

---

### public.deal_task_states
DealFlow Guide task state overrides.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| deal_id | uuid | NOT NULL | - | Deal FK |
| task_key | text | NOT NULL | - | Task identifier |
| override_status | text | NOT NULL | - | Override status |
| override_reason | text | NULL | - | Reason for override |
| overridden_by | uuid | NULL | - | User who overrode |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL | now() | Last update |

**Override Status Enum:** 'NOT_APPLICABLE', 'NOT_YET_AVAILABLE'

**Unique Constraint:** (deal_id, task_key)

---

### public.deal_import_jobs
Bulk import job provenance container.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| label | text | NULL | - | Job label |
| source_type | text | NOT NULL | - | Source type |
| source_meta | jsonb | NULL | '{}' | Source metadata |
| status | text | NOT NULL | 'pending' | Job status |
| total_count | integer | NULL | - | Total items |
| processed_count | integer | NULL | 0 | Processed items |
| created_by | uuid | NULL | - | Creator user |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL | now() | Last update |

**Status Enum:** 'pending', 'processing', 'completed', 'failed', 'archived'

---

### public.deal_import_items
Individual import rows with deduplication.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| import_job_id | uuid | NOT NULL | - | Import job FK |
| row_number | integer | NOT NULL | - | Source row number |
| payload_json | jsonb | NOT NULL | - | Row payload |
| dedupe_key | text | NOT NULL | - | SHA256 dedupe hash |
| is_duplicate | boolean | NOT NULL | false | Duplicate flag |
| duplicate_of_deal_id | uuid | NULL | - | Original deal FK |
| validation_errors | jsonb | NULL | '[]' | Validation errors |
| status | text | NOT NULL | 'pending' | Item status |
| promoted_deal_id | uuid | NULL | - | Promoted deal FK |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL | now() | Last update |

**Status Enum:** 'pending', 'validated', 'skipped', 'promoted', 'error'

**Function:** `compute_deal_dedupe_key(payload_json)` - SHA256 of normalized address

---

### public.dashboard_snapshots
Portfolio dashboard snapshots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| snapshot_type | text | NOT NULL | 'portfolio' | Snapshot type |
| snapshot_data | jsonb | NOT NULL | - | Computed snapshot |
| as_of_date | date | NOT NULL | - | Snapshot date |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

---

### public.organizations
Multi-tenant organization records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| name | text | NOT NULL | - | Org name |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

---

### public.memberships
User-organization membership with roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| user_id | uuid | NOT NULL | - | User FK |
| org_id | uuid | NOT NULL | - | Organization FK |
| role | text | NOT NULL | 'member' | Role |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

**Role Enum:** 'owner', 'manager', 'vp', 'member'

---

### public.audit_logs
Comprehensive audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| user_id | uuid | NULL | - | Acting user |
| action | text | NOT NULL | - | Action type |
| resource_type | text | NOT NULL | - | Resource type |
| resource_id | text | NULL | - | Resource ID |
| diff | jsonb | NULL | - | Change diff |
| created_at | timestamptz | NOT NULL | now() | Action timestamp |

---

## Intake Tables

### public.intake_links
Public intake form links.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| org_id | uuid | NOT NULL | - | Organization FK |
| deal_id | uuid | NULL | - | Optional deal FK |
| token | text | NOT NULL | - | Public access token |
| recipient_name | text | NULL | - | Recipient name |
| recipient_email | text | NULL | - | Recipient email |
| recipient_phone | text | NULL | - | Recipient phone |
| expires_at | timestamptz | NULL | - | Expiration |
| status | text | NOT NULL | 'active' | Link status |
| schema_key | text | NOT NULL | 'default' | Form schema key |
| created_by | uuid | NULL | - | Creator user |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

### public.intake_submissions
Form submissions from clients.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| link_id | uuid | NOT NULL | - | Intake link FK |
| org_id | uuid | NOT NULL | - | Organization FK |
| payload_json | jsonb | NOT NULL | '{}' | Form data |
| payload_hash | text | NOT NULL | - | Integrity hash |
| section_index | integer | NULL | 0 | Last section |
| status | text | NOT NULL | 'DRAFT' | Submission status |
| submitted_at | timestamptz | NULL | - | Submit timestamp |
| reviewed_by | uuid | NULL | - | Reviewer user |
| reviewed_at | timestamptz | NULL | - | Review timestamp |
| populated_deal_id | uuid | NULL | - | Created deal FK |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL | now() | Last update |

**Status Enum:** 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'REJECTED', 'POPULATED'

### public.intake_files
Uploaded evidence files.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| submission_id | uuid | NOT NULL | - | Submission FK |
| org_id | uuid | NOT NULL | - | Organization FK |
| upload_key | text | NOT NULL | - | Upload category key |
| filename | text | NOT NULL | - | Original filename |
| mime_type | text | NOT NULL | - | MIME type |
| size_bytes | integer | NOT NULL | - | File size |
| storage_path | text | NULL | - | Storage path |
| storage_state | text | NOT NULL | 'pending' | Storage state |
| scan_status | text | NOT NULL | 'pending' | AV scan status |
| created_at | timestamptz | NOT NULL | now() | Creation timestamp |

---

## Legacy/Core Tables (hps schema)

### hps.deals
Core deal records (legacy).

### hps.attachments
Evidence file attachments.

### hps.scenarios
Analysis scenario records.

---

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| evidence | Deal evidence files |
| intake-uploads | Client intake uploads |

---

## Key Functions

### get_caller_org()
Returns the org_id for the current authenticated user.

### is_org_manager(uid, org)
Checks if user has manager+ role in org.

### compute_deal_dedupe_key(payload_json)
Generates SHA256 hash for deduplication based on normalized address.

---

## Migration Count

Total migrations: **87+** (as of 2026-01-03)

Key migration families:
- Organizations & memberships
- Deals & runs
- Policy versions & overrides
- Evidence & attachments
- Valuation & calibration
- Intake system
- Import pipeline
- Dashboard snapshots
