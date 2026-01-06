# API Routes & Edge Functions Audit
Date: 2026-01-03
Auditor: Claude Code

## Overview

The HPS DealEngine uses **Supabase Edge Functions** (Deno runtime) for API endpoints. All functions are located in `supabase/functions/`.

---

## Edge Function Inventory

### Total Functions: 40+

---

## Core Analysis Functions

### v1-analyze

**Purpose:** Main underwriting analysis endpoint.

**Method:** POST

**Request:**
```typescript
{
  deal_id: string;
  posture?: 'aggressive' | 'balanced' | 'conservative';
  policy_overrides?: PolicyOverride[];
}
```

**Response:**
```typescript
{
  run_id: string;
  outputs: AnalyzeOutputs;
  trace: TraceFrame[];
  policy_hash: string;
}
```

**Calls:**
- `computeUnderwriting()` from engine
- Saves run to `runs` table
- Emits `MARKET_PROVENANCE` trace frame

---

### v1-valuation-run

**Purpose:** Run valuation analysis for ARV/AIV.

**Method:** POST

**Request:**
```typescript
{
  deal_id: string;
  override_market?: {
    arv?: number;
    aiv?: number;
  };
}
```

**Response:**
```typescript
{
  run_id: string;
  arv: number | null;
  aiv: number | null;
  confidence: ValuationConfidence;
  comps: Comp[];
}
```

---

### v1-valuation-apply-arv

**Purpose:** Apply selected ARV to deal.

**Method:** POST

---

### v1-valuation-ensemble-sweep

**Purpose:** Run ensemble valuation sweep.

**Method:** POST

---

### v1-valuation-continuous-calibrate

**Purpose:** Continuous calibration for valuation model.

**Method:** POST

---

### v1-valuation-override-market

**Purpose:** Manual market value override.

**Method:** POST

---

## Evidence Functions

### v1-evidence-start

**Purpose:** Initiate evidence file upload.

**Method:** POST

**Request:**
```typescript
{
  deal_id: string;
  kind: EvidenceKind;
  filename: string;
  mime_type: string;
  size_bytes: number;
}
```

**Response:**
```typescript
{
  evidence_id: string;
  upload_url: string;
  upload_token: string;
}
```

---

### v1-evidence-url

**Purpose:** Get signed URL for evidence file.

**Method:** POST

**Request:**
```typescript
{
  evidence_id: string;
}
```

**Response:**
```typescript
{
  url: string;
  expires_at: string;
}
```

---

## Intake Functions

### v1-intake-send-link

**Purpose:** Send intake form link to client.

**Method:** POST

**Request:**
```typescript
{
  deal_id?: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_phone?: string;
  expires_in_days?: number;
  schema_key?: string;
  send_method?: 'email' | 'sms' | 'both' | 'none';
}
```

**Response:**
```typescript
{
  link_id: string;
  token: string;
  public_url: string;
}
```

---

### v1-intake-validate-token

**Purpose:** Validate public intake token (no auth required).

**Method:** POST

**Request:**
```typescript
{
  token: string;
}
```

**Response:**
```typescript
{
  link_id: string;
  recipient_name: string;
  expires_at: string;
  existing_payload: object | null;
  can_edit: boolean;
  submission_status: string | null;
}
```

---

### v1-intake-save-draft

**Purpose:** Auto-save intake form draft.

**Method:** POST

**Request:**
```typescript
{
  token: string;
  link_id: string;
  payload: object;
  section_index?: number;
}
```

---

### v1-intake-submit

**Purpose:** Submit completed intake form.

**Method:** POST

**Request:**
```typescript
{
  token: string;
  link_id: string;
  payload: object;
}
```

**Response:**
```typescript
{
  submission_id: string;
  payload_hash: string;
}
```

---

### v1-intake-inbox

**Purpose:** Staff inbox listing submissions.

**Method:** GET

**Response:**
```typescript
{
  submissions: IntakeSubmission[];
  total: number;
}
```

---

### v1-intake-submission-detail

**Purpose:** Get submission details.

**Method:** GET

---

### v1-intake-populate

**Purpose:** Create deal from submission.

**Method:** POST

---

### v1-intake-request-revision

**Purpose:** Request client revision.

**Method:** POST

---

### v1-intake-reject

**Purpose:** Reject submission.

**Method:** POST

---

### v1-intake-upload-start

**Purpose:** Start intake file upload.

**Method:** POST

---

### v1-intake-upload-complete

**Purpose:** Complete intake file upload.

**Method:** POST

---

## Import Functions

### v1-import-job-create

**Purpose:** Create new import job.

**Method:** POST

**Request:**
```typescript
{
  label?: string;
  source_type: string;
  source_meta?: object;
}
```

**Response:**
```typescript
{
  job_id: string;
}
```

---

### v1-import-jobs-list

**Purpose:** List import jobs.

**Method:** GET

---

### v1-import-job-update

**Purpose:** Update import job status.

**Method:** POST

---

### v1-import-job-archive

**Purpose:** Archive import job.

**Method:** POST

---

### v1-import-items-upsert

**Purpose:** Upsert import items to job.

**Method:** POST

**Request:**
```typescript
{
  job_id: string;
  items: ImportItem[];
}
```

---

### v1-import-items-list

**Purpose:** List items in import job.

**Method:** GET

---

### v1-import-item-update

**Purpose:** Update single import item.

**Method:** POST

---

### v1-import-promote

**Purpose:** Promote import items to deals.

**Method:** POST

**Request:**
```typescript
{
  job_id: string;
  item_ids: string[];
}
```

**Response:**
```typescript
{
  promoted: number;
  skipped: number;
  errors: string[];
}
```

---

## Snapshot Functions

### v1-snapshot-generate

**Purpose:** Generate portfolio snapshot.

**Method:** POST

**Request:**
```typescript
{
  snapshot_type: 'portfolio' | 'deal_summary';
  deal_ids?: string[];
  as_of_date?: string;
}
```

**Response:**
```typescript
{
  snapshot_id: string;
  snapshot_data: PortfolioSnapshot;
}
```

---

### v1-snapshot-get

**Purpose:** Get snapshot by ID.

**Method:** GET

---

### v1-snapshot-list

**Purpose:** List snapshots.

**Method:** GET

---

## Deal Functions

### v1-deal-contract-upsert

**Purpose:** Create/update deal contract.

**Method:** POST

**Request:**
```typescript
{
  deal_id: string;
  executed_contract_price?: number;
  status: 'under_contract' | 'closed' | 'cancelled';
  notes?: string;
}
```

---

### v1-deal-task-states

**Purpose:** Manage deal task state overrides.

**Method:** POST/GET

---

### v1-deal-workflow-events

**Purpose:** Record workflow events.

**Method:** POST

---

## Policy Functions

### v1-policy-get

**Purpose:** Get current policy for org.

**Method:** GET

**Response:**
```typescript
{
  policy_id: string;
  posture: string;
  policy_json: object;
}
```

---

## Offer Package Functions

### v1-offer-package-generate

**Purpose:** Generate offer package PDF.

**Method:** POST

---

## Utility Functions

### v1-ping

**Purpose:** Health check endpoint.

**Method:** GET

**Response:**
```typescript
{
  status: 'ok';
  timestamp: string;
}
```

---

## Authentication

All endpoints (except public intake) require:
- Supabase JWT token in `Authorization` header
- Valid org membership via RLS

Public endpoints:
- `v1-intake-validate-token`
- `v1-intake-save-draft`
- `v1-intake-submit`
- `v1-intake-upload-start`
- `v1-intake-upload-complete`

---

## CORS Configuration

Configured in `supabase/config.toml`:
- Allowed origins: `*` (dev), specific domains (prod)
- Allowed methods: GET, POST, OPTIONS
- Allowed headers: Authorization, Content-Type

---

## Rate Limiting

- Standard endpoints: 100 req/min per user
- Analysis endpoints: 20 req/min per deal
- Public intake: 30 req/min per IP

---

## Summary

| Category | Endpoint Count |
|----------|---------------|
| Analysis/Valuation | 6 |
| Evidence | 2 |
| Intake | 11 |
| Import | 8 |
| Snapshot | 3 |
| Deal/Contract | 3 |
| Policy | 1 |
| Offer Package | 1 |
| Utility | 1 |
| **Total** | **36** |

### Endpoint Status

| Status | Count |
|--------|-------|
| Live/Deployed | 36 |
| In Development | 4 |
| **Total** | **40** |
