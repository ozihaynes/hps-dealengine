# Runs & Hashing Contract

## 1. Purpose

`public.runs` is the authoritative audit trail for underwriting engine executions.

For a given organization (`org_id`), posture (`posture`), input envelope, and policy snapshot, we:

- Normalize the inputs into a **RunInputEnvelope**.
- Normalize the outputs and trace into a **RunOutputEnvelope**.
- Optionally attach a **PolicySnapshot**.
- Compute deterministic hashes over the envelopes.
- Persist a row in `public.runs` under RLS.

This enables:

- Deterministic replay (same inputs + policy → same outputs + hashes).
- Auditable runs for investors, operators, and compliance.
- Idempotent persistence via a unique index.

---

## 2. Envelopes

### 2.1 RunInputEnvelope

Type: `RunInputEnvelope` (from `packages/contracts/src/runs.ts`)

**Semantic shape (conceptual):**

- `posture: string`
  - Policy posture used for the run (e.g. `"base"`, `"aggressive"`, `"conservative"`).
- `deal: object`
  - Normalized deal input as seen by the engine (ARV, AIV, DOM, fees, etc.).
- `sandbox: object | null`
  - Optional caller-provided context (notes, scenario tag, UI flags).
- `meta: { engineVersion: string; policyVersion: string; source: string }`
  - `engineVersion`: engine build/version identifier.
  - `policyVersion`: active policy version label or id.
  - `source`: origin of the run (e.g. `"ui-underwrite"`, `"ui-debug"`, `"cli-smoke"`).

**Notes**

- This envelope is what we conceptually “sign” as **input**.
- Client-facing surfaces should treat it as immutable once saved.

---

### 2.2 RunOutputEnvelope

Type: `RunOutputEnvelope` (from `packages/contracts/src/runs.ts`)

**Semantic shape (conceptual):**

- `outputs: object`
  - Structured engine outputs (MAO corridor, caps, flags, etc.).
- `trace: RunTraceFrame[]`
  - Ordered list of atomic reasoning steps from the engine.
- `meta: { engineVersion: string; policyVersion: string; durationMs: number }`
  - `engineVersion`: engine build/version actually used for this run.
  - `policyVersion`: policy version actually applied.
  - `durationMs`: measured engine execution duration (ms).

**Notes**

- This envelope is what we conceptually “sign” as **output**.
- The trace is intended to be human-readable and UI-renderable.

---

### 2.3 RunTraceFrame

Type: `RunTraceFrame` (from `packages/contracts/src/runs.ts`)

At a high level, each frame represents **one step** in the engine’s reasoning chain.

Conceptually:

- `key: string`  
  Stable identifier (e.g. `"inputs"`, `"aiv_safety_cap"`, `"carry_months"`).
- `label: string`  
  Human-readable description of what this step does.
- `details: object`  
  Structured payload used for debugging and UI (numbers, flags, intermediate values).

---

### 2.4 PolicySnapshot

Type: `PolicySnapshot` (from `packages/contracts/src/runs.ts`)

Conceptually:

- `tokens: object`
  - Policy knobs and scalar parameters (caps, floors, limits).
- `meta: object`
  - Policy metadata (version, posture, author/approver, timestamps, etc.).

Notes:

- Policy snapshot is optional in the run row but **highly recommended** when available.
- When absent, `policy_hash` will typically be `null`.

---

## 3. Hashing

Hashing utilities live in the contracts package, imported as `hashJson` (from `./runs`).

### 3.1 canonicalJson(value)

Internal concept behind `hashJson`:

- Serialize arbitrary JSON-compatible data into a **stable string**:
  - Keys use a deterministic order (no dependence on JS object iteration).
  - Numbers, strings, booleans, null, arrays and objects are handled predictably.
- The goal: **same logical data → same canonical string** regardless of key order in input.

Clients should not call `canonicalJson` directly; treat it as implementation detail of `hashJson`.

---

### 3.2 hashJson(value)

`hashJson(value)`:

- Takes arbitrary JSON-compatible value.
- Internally uses canonical JSON representation.
- Returns a **deterministic hex string** used as a content hash.

Key invariants:

- Same logical value → **same hash** (idempotent).
- Different logical value → **different hash** with very high probability.
- Clients must treat the hash as **opaque**; do not infer length or algorithm.

### 3.3 Hash usage in runs

For each run we compute:

- `input_hash = hashJson(RunInputEnvelope)`
- `output_hash = hashJson(RunOutputEnvelope)`
- `policy_hash = PolicySnapshot ? hashJson(PolicySnapshot) : null`

These hashes are persisted in `public.runs` and used for:

- Dedupe / idempotency.
- Change detection (policy or engine changes).
- Future replay and audit tooling.

---

## 4. Database mapping (public.runs)

The `public.runs` table is the physical home for run records.

### 4.1 Key columns (conceptual)

Relevant columns (conceptual mapping):

- `id: uuid PRIMARY KEY`
- `org_id: uuid NOT NULL`
- `posture: text NOT NULL`
- `input_hash: text NOT NULL`
- `output_hash: text NOT NULL`
- `policy_hash: text NULL`
- `created_at: timestamptz NOT NULL DEFAULT now()`
- JSON/JSONB payload columns for:
  - Input envelope
  - Output envelope
  - Trace
  - Policy snapshot
  - Optional sandbox / meta

The exact column names are defined in the database schema; this document focuses on their semantic role.

### 4.2 Unique dedupe index

We enforce dedupe with:

- Unique index on:

  - `(org_id, posture, input_hash, policy_hash)`

Interpretation:

- For a given **organization**, **posture**, **logical input**, and **policy snapshot**, there can be at most **one canonical run record**.
- Re-sending the same combination should **not** create a swarm of duplicates; the Edge function can use the unique index to upsert or no-op as desired.

### 4.3 RLS and ownership

`public.runs` is RLS-protected.

Conceptually:

- Every row is owned by an organization (`org_id`).
- Access is granted via `memberships` using `auth.uid()` from the caller’s JWT.
- Policies ensure:

  - You can only `SELECT` / `INSERT` / `UPDATE` / `DELETE` runs that belong to orgs where you have a membership.
  - There is **no** `service_role` used in user-facing paths; all access is enforced via caller JWT.

This means:

- CLI tools, UI, and automated jobs must all use **caller-scoped tokens**.
- The `v1-runs-save` Edge Function simply enforces this contract and relies on RLS for final gatekeeping.

---

## 5. Edge Function: v1-runs-save (high-level behavior)

`v1-runs-save` is the canonical entrypoint for persisting runs.

High-level behavior:

1. Accepts JSON payload shaped like `SaveRunArgs`:

   - `orgId`
   - `posture`
   - `deal`
   - `sandbox`
   - `outputs`
   - `trace`
   - `meta`

2. Calls `buildRunEnvelopes` / `buildRunRow` in `packages/contracts/src/runsSave.ts` to:

   - Construct `RunInputEnvelope` and `RunOutputEnvelope`.
   - Compute `input_hash`, `output_hash`, and optionally `policy_hash`.
   - Build a `RunRowInsert` object ready for `public.runs`.

3. Writes the row into `public.runs` under RLS, using the unique index on
   `(org_id, posture, input_hash, policy_hash)` for dedupe/idempotency.

4. Returns a JSON payload such as:

   - `{ ok: true, run: { id, org_id, posture, input_hash, output_hash, policy_hash, created_at } }`

The function is JWT-gated and must be called with:

- `Authorization: Bearer <user JWT>`
- `apikey: <anon key>`

---

## 6. Invariants & guarantees

1. **Deterministic hashing**
   - Same logical envelopes → same hashes.
   - Different logical envelopes → different hashes (with high probability).

2. **Org-scoped isolation**
   - Runs are always tied to an `org_id`.
   - RLS prevents cross-org access.

3. **Dedupe**
   - `(org_id, posture, input_hash, policy_hash)` uniquely identifies a canonical run.
   - Edge layer uses this to avoid uncontrolled duplication.

4. **Replayability**
   - With `RunInputEnvelope`, `RunOutputEnvelope`, and optional `PolicySnapshot` persisted,
     a future engine can replay or compare behavior against historical decisions.

---

## 7. Future extensions (non-binding)

The following are expected but not guaranteed by this version of the contract:

- Attach `created_by` (user id) and richer actor metadata.
- Tight coupling with `audit_logs` for full “who/what/when/why” stories.
- Versioning hooks when policy or engine upgrades change behavior for the same inputs.
