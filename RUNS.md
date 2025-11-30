# Runs & Hashing Contract (v1.0)

## 1. Purpose

The `runs` system is the deterministic audit spine of HPS DealEngine.

For any given combination of:

- **Org** (`org_id`)
- **Posture** (e.g. `"base"`, `"safe"`, `"push"`)
- **Inputs** (deal + sandbox + posture)
- **Policy snapshot** (effective policy tokens/settings at run time)

the engine **must**:

1. Produce the **same outputs and trace**, and
2. Produce the **same hashes**:

   - `input_hash`
   - `policy_hash`
   - `output_hash`

This enables:

- Idempotent dedupe on identical runs.
- Replay/comparison when policy or engine versions change.
- A clear, provable audit trail for investors and partners.

---

## 2. DB Shape: `public.runs`

Logical columns (source of truth for schema alignment):

- `id` (uuid, PK, default `gen_random_uuid()`)
- `org_id` (uuid, NOT NULL)
- `posture` (text, NOT NULL) — values like `"base"`, `"safe"`, `"push"`.
- `input` (jsonb, NOT NULL) — full **RunInputEnvelope**.
- `policy_snapshot` (jsonb, NOT NULL) — full **PolicySnapshot** for this run.
- `output` (jsonb, NOT NULL) — full **RunOutputEnvelope**.
- `trace` (jsonb, NOT NULL) — full engine trace, array of trace frames.
- `input_hash` (text, NOT NULL)
- `policy_hash` (text, NOT NULL)
- `output_hash` (text, NOT NULL)
- `created_at` (timestamptz, NOT NULL, default `now()`)
- `created_by` (uuid, NOT NULL) — `auth.users.id` of the caller.

### Unique index (dedupe)

We enforce **one canonical row per unique run**:

```sql
UNIQUE (org_id, posture, input_hash, policy_hash)
```
