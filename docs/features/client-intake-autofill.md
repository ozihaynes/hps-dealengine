# Client Intake Autofill (CLIENT-INTAKE-AUTOFILL-v1)

Feature documentation for the token-gated client intake form system.

## Overview

The Client Intake Autofill feature enables HPS staff to send secure, token-gated intake forms to clients (sellers). Clients fill out property details, financial information, and upload supporting documents. Staff can then review submissions and populate deal records with a single click.

## Architecture

### Core Components

```
Staff sends link -> Client fills form -> Staff reviews -> Populate to deal
       |                    |                 |               |
  intake_links      intake_submissions    intake-inbox    v1-intake-populate
  (token_hash)       (payload_json)        (UI)          (deterministic)
```

### Security Model

- **Token-gated access**: Links use 64-character hex tokens, stored as SHA-256 hashes
- **No authentication required**: Clients access forms anonymously via token
- **RLS policies**: All tables enforce org-scoped access for staff
- **Quarantine model**: Uploaded files go to quarantine, scanned before promotion
- **Immutability**: Submissions become immutable after status changes from DRAFT

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `intake_schema_versions` | Versioned form schemas + field mappings (immutable) |
| `intake_links` | Token-gated access links with expiration |
| `intake_submissions` | Client form submissions |
| `intake_submission_files` | File uploads with quarantine/scan state |
| `intake_population_events` | Idempotent population log |
| `intake_revision_requests` | Revision tracking |
| `intake_rejections` | Rejection tracking |

### Key Relationships

```
intake_schema_versions
        |
        v
   intake_links -----> intake_submissions -----> intake_population_events
        |                     |
        v                     v
      deals         intake_submission_files
```

## API Endpoints

### Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `v1-intake-link-create` | JWT | Staff creates intake link |
| `v1-intake-schema` | Token | Client fetches form schema |
| `v1-intake-submission` | Token | Client saves/submits form |
| `v1-intake-upload-start` | Token | Client initiates file upload |
| `v1-intake-upload-complete` | Token | Client completes upload, triggers scan |
| `v1-intake-populate` | JWT | Staff populates deal from submission |

### Token Header

All token-gated endpoints require:
```
x-intake-token: <64-char-hex-token>
```

## UI Components

### Staff Components

- `SendIntakeLinkModal` - Create and send intake links
- `IntakeInboxPage` - List all submissions by status
- `IntakeSubmissionDetail` - View submission details
- `PopulateSubmissionModal` - Preview and confirm population

### Client Components

- `IntakeForm` - Multi-section wizard form with auto-save
- `FileUploadZone` - Drag-and-drop file upload with scan status
- `FileListDisplay` - Show uploaded files with status badges

## Form Schema Format

### Public Schema (schema_public_json)

```json
{
  "version": "1.0.0",
  "title": "Property Information Form",
  "sections": [
    {
      "id": "seller_info",
      "title": "Seller Information",
      "fields": [
        {
          "key": "seller_name",
          "label": "Full Name",
          "type": "text",
          "required": true
        }
      ]
    }
  ],
  "evidence_uploads": [
    {
      "key": "photos",
      "label": "Property Photos",
      "accept": ["image/jpeg", "image/png"],
      "max_files": 10,
      "required": false
    }
  ]
}
```

### Private Mapping (mapping_private_json)

```json
{
  "version": "1.0.0",
  "mappings": [
    {
      "source_field_key": "seller_name",
      "target_deal_path": "payload.client.name",
      "transform": null,
      "overwrite_policy": "skip"
    }
  ],
  "evidence_mappings": [
    {
      "source_upload_key": "photos",
      "target_evidence_kind": "property_photos"
    }
  ]
}
```

## Population Engine

The population engine (`lib/populationEngine.ts`) processes submissions deterministically:

### Features

- **Idempotency key**: SHA-256 of (submission_id + payload_hash + mapping_version + overwrite_mode)
- **Transform functions**: parseInt, parseFloat, parseCurrency, parseBoolean, parseDate
- **Overwrite modes**: "skip" (default), "overwrite" (requires reasons)
- **Detailed results**: Every field action logged with before/after values

### Population Flow

1. Validate submission status (must be SUBMITTED or PENDING_REVIEW)
2. Check idempotency key (prevent duplicate population)
3. For each mapping:
   - Extract source value from payload
   - Apply transform if specified
   - Check if target path has existing value
   - Apply overwrite policy
   - Record action (created/skipped/overwritten/error)
4. Update deal with merged payload
5. Create population event record
6. Update submission status to COMPLETED

## File Upload Flow

### Upload Process

1. Client selects files in `FileUploadZone`
2. Call `v1-intake-upload-start` to get signed URL
3. Upload directly to Supabase Storage
4. Call `v1-intake-upload-complete` to trigger scan
5. File status updates (PENDING -> CLEAN/INFECTED)

### Storage Structure

```
intake/
  quarantine/
    {submission_id}/
      {file_id}.pdf
```

### Scan Status

| Status | Meaning |
|--------|---------|
| PENDING | Upload started, not scanned |
| CLEAN | Passed virus scan |
| INFECTED | Failed virus scan |
| SCAN_FAILED | Scanner error |

## Status Lifecycle

### Link Status

```
SENT -> IN_PROGRESS -> SUBMITTED
     |              |
     +-> EXPIRED    +-> REVOKED
```

### Submission Status

```
DRAFT -> SUBMITTED -> PENDING_REVIEW -> COMPLETED
                   |                 |
                   +-> REVISION_REQUESTED -> (new submission)
                   |
                   +-> REJECTED
```

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Edge Functions |

### Storage Bucket

The `intake` bucket is configured with:
- 25MB file size limit
- Allowed MIME types: PDF, JPEG, PNG, DOCX, XLSX
- Private (no public access)

## Development

### Bootstrap Data

Run seeds in order:
```bash
# 1. Create dev org
psql -f supabase/bootstrap/dev_org_seed.sql

# 2. Create intake schema
psql -f supabase/bootstrap/intake_schema_seed.sql
```

### Testing

E2E tests are in `tests/e2e/intake-flow.spec.ts`:
- Staff sends intake link
- Client fills form
- Staff reviews and populates

Requires QA environment credentials:
```
QA_USER_EMAIL=...
QA_USER_PASSWORD=...
QA_DEAL_ID=...
```

## Related Documentation

- [Roadmap](../roadmap-v1-v2-v3.md) - Feature timeline
- [Devlog](../devlog-hps-dealengine.md) - Development history
- [Routes Overview](../app/routes-overview.md) - Application routing
