# HPS DealEngine: Project & Development Primer

---

## 1. Project Overview: HPS DealEngine

**Name:** `hps-dealengine`

**Purpose:**
A production-grade, multi-tenant SaaS for deterministic, evidence-backed real-estate underwriting.
Initial focus is **distressed SFR/townhome deals in Central Florida**, with the architecture designed to grow into a **national, multi-strategy underwriting platform**.

---

## 1.1 Core Principles (Non-Negotiables)

### 1. Policy-Driven Underwriting

- Underwriting rules live as **policies in Postgres**, not hard-coded in React or hidden in ad-hoc scripts.
- Policies are versioned by **org** and **posture** in `policies` + `policy_versions`.
- Engine behavior is controlled by:

  - Policy tokens / JSON in the DB.
  - Engine version.

- Updating policy JSON can change behavior **without redeploying the UI**.

### 2. Full Determinism

Given the same:

- Deal input,
- Active policy for that org + posture,
- Engine version,

…the system must produce **bit-identical outputs, hashes, and trace**.

Determinism is enforced via the `runs` table:

- Each run stores:

  - `input`, `output`, `trace`, `policy_snapshot`,
  - `input_hash`, `policy_hash`, `output_hash`.

- A unique index on:

  - `(org_id, posture, input_hash, policy_hash)`

- This guarantees:

  - Idempotent runs.
  - Clean detection of duplicates.
  - Strong guarantees for replay / regression.

### 3. Complete Audit Trail

Every underwrite and every policy change must be:

- **Explainable**
- **Replayable**
- **Diffable**

Key pieces:

- `runs`:

  - Captures the exact `input`, `output`, `trace`, and hashes for every underwriting run.

- `policy_versions`:

  - Stores the full JSON policy artifacts over time.
  - Allows “what was the policy on 2025-11-10?”.

- `audit_logs`:

  - Row-level change history for critical tables.
  - Enables “who changed what, when, and how?”.

Future v3 SRE (observability) features:

- **Golden replay jobs**:

  - Re-run selected historical deals on the current engine + policy.
  - Compare hashes and flag regressions.

### 4. Traceable AI

AI is a **strategist layer**, not a magical source of numbers.

Rules:

- AI **cannot invent numeric values** out of thin air.
- All numbers must trace back to:

  - Policy tokens,
  - Explicit deal inputs,
  - External connectors with logged evidence (e.g. MLS / county / FEMA).

- Every AI-assisted output:

  - Is validated by Zod schemas from `packages/contracts`.
  - Includes a justification/trace or a link to evidence.
  - Never silently overwrites deterministic engine results coming from `v1-analyze`.

### 5. RLS-First, Zero-Trust Posture

Security fundamentals:

- All user-facing reads/writes use the **caller’s JWT**, never `service_role`.
- Every org/user table is protected by **Row-Level Security (RLS)**.
- **No `service_role` key** appears in:

  - Client-side code,
  - Edge functions invoked directly by users.

`service_role` is reserved strictly for:

- Bootstrap/seed scripts,
- Admin maintenance and migrations (never user flows).

### 6. Vertical-Slice Delivery

Features are always implemented as **narrow, end-to-end vertical slices**:

- UI → Edge Function → DB → Trace/Audit.

Each slice:

- Has a clear, testable Definition of Done.
- Includes routing, data flow, and persistence.
- Does not break determinism or RLS guarantees.

---

## 2. Core Architecture & Stack

### 2.1 Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **Design System:** `packages/ui-v2` (and `.tmp/ui-v2`) as the **pixel-parity reference**

Responsibilities:

- The Next.js app is **presentation + orchestration** only.
- All core underwriting math, risk gates, and policy logic live in:

  - Supabase Edge Functions, and
  - `packages/engine` (the deterministic engine).

- React components **never** become the source of truth for business rules.

### 2.2 Backend & Infra

- **Platform:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Database:** Postgres with RLS on all tenant data
- **Auth:** Supabase Auth (email/password, JWT)

Business logic:

- **Supabase Edge Functions (Deno)** are the only place where:

  - Underwriting math,
  - Policy interpretation,
  - Repairs / rate logic,
  - External connectors (MLS, county, FEMA, tax),
  - AVM logic (v3),
  - CRM sync (v3),
  - Billing logic (v3),
  - and other domain-critical logic run.

Storage:

- Supabase Storage buckets (private).
- Evidence (photos, PDFs, docs) is accessed via **short-lived signed URLs** returned from functions like `v1-evidence-start` / `v1-evidence-url`.

### 2.3 Contracts & Engine

#### `packages/contracts`

- Zod schemas defining all externalized shapes:

  - `AnalyzeInput`, `AnalyzeResult`
  - Repair rate contracts
  - Evidence payloads
  - Connectors / AVM / CRM payloads (v2/v3)

- Roles:

  - Single source of truth for **client ↔ Edge** contracts.
  - Enforces schema-strict **AI I/O**.
  - Protects against untyped JSON from functions and external APIs.

#### `packages/engine`

- Deterministic underwriting engine used by Edge Functions.
- Inputs:

  - Deal facts (normalized structure),
  - Policy JSON (tokens for that org/posture).

- Outputs:

  - Underwriting calculations:

    - Respect Floor
    - Buyer Ceiling
    - MAO corridors
    - Risk gates / flags
    - Double-close impact

  - Detailed `trace`:

    - Step-by-step calculation log.

  - `infoNeeded`:

    - Evidence or information required before making an offer.

### 2.4 Monorepo & Tooling

- **Package Manager:** `pnpm` workspaces
- **Workspaces:**

  - `apps/hps-dealengine` — Next.js UI app
  - `packages/engine` — deterministic engine
  - `packages/contracts` — contracts and schemas
  - `packages/ui-v2` — design system and shared components

- **Testing:** Vitest for engine and shared logic
- **Build:**

  - `tsc` for packages
  - `next build` for the app

- **CI/CD (planned/expanding):**

  - `pnpm -w typecheck`
  - `pnpm -w test`
  - `pnpm -w build`
  - Later: Playwright E2E pixel tests

- **Dev Environment:**

  - Default: Windows + VS Code + PowerShell
  - PowerShell scripts handle:

    - Zipping repo snapshots,
    - Diagnostics,
    - Schema exports,
    - Local CI helpers.

---

## 3. Data Model, Multi-Tenancy & RLS

### 3.1 Core Multi-Tenant Model

**Org & membership backbone:**

- `organizations`

  - One row per org/portfolio.
  - Holds settings like plan, default markets, etc. (v3).

- `memberships`

  - Join table: `{ org_id, user_id, role }`
  - Roles: `analyst`, `manager`, `admin` (and any future roles)
  - Every request is scoped via `auth.uid()` → `memberships`.

Typical RLS pattern:

```sql
USING (
  org_id IN (
    SELECT org_id
    FROM memberships
    WHERE user_id = auth.uid()
  )
)
```

Users:

- Managed by Supabase Auth.
- Mapped via `auth.uid()` to membership rows.

### 3.2 Underwriting Policy & Runs

**`policies`**

- Per-org & per-posture metadata.
- Partial unique index:

  - `(org_id, posture) WHERE is_active = true`

- Defines active policy posture for a given org.

**`policy_versions`**

- Full JSON policy documents:

  - `{ id, org_id, posture, version, policy_json, created_by, created_at, ... }`

- Supports:

  - Deterministic replay with exact historical policy.
  - Approvals/governance (v2/v3).

**`runs`**

- Core execution log for every underwriting run:

  - `id`
  - `org_id`
  - `posture`
  - `deal_id` (link to deals table)
  - `input` (JSON)
  - `output` (JSON)
  - `trace` (JSON)
  - `policy_snapshot` (JSON)
  - `input_hash`, `policy_hash`, `output_hash`
  - `created_by`, `created_at`

- Unique index:

  - `runs_uni_org_posture_iohash_polhash` on `(org_id, posture, input_hash, policy_hash)`

- Enables:

  - Deterministic dedupe
  - Hash-based replays
  - CRM exports (v3) tied to deals and runs

**`audit_logs`**

- Row-level audit for key tables (deals, policies, runs, etc.):

  - `table_name`, `row_id`, `change_type`, `before`, `after`, `changed_by`, `changed_at`

- Used by:

  - Policy governance
  - Evidence trail
  - SRE diagnostics (v3)

### 3.3 Deals

Canonical deals table created via migration (e.g. `20251109000708_org_deals_and_audit_rls.sql`):

Core fields:

- `id`, `org_id`, `created_by`, `created_at`, `updated_at`
- `address`, `city`, `state`, `zip`
- `payload` (JSON with normalized deal data)

RLS:

- Org-scoped via `memberships` + `auth.uid()`.

This table is the single source of truth for deal identity in v1.

### 3.4 Repairs (Current + Future)

**`repair_rate_sets`**

Per-org, per-market repair configuration:

- `id`, `org_id`, `market_code` (e.g. `ORL`)
- `as_of`, `source`, `version`, `is_active`
- `psf_tiers_json` (light / medium / heavy PSF)
- `big5_json` (roof / HVAC / repipe / electrical / foundation)

RLS:

- Org-scoped.

Seeded with investor-grade defaults for ORL; extensible to more markets.

Future (v2/v3):

- Potential split into granular tables:

  - `repair_items`, `repair_rates`, etc.

- For more complex unit cost curves if needed.

### 3.5 Connectors / Property Data (v2)

**`property_snapshots`**

Cache of external data for an address:

- `id`
- `org_id`
- `address_normalized`
- `source` (`mls` | `county` | `fema` | `tax` | others)
- `data_json` (normalized payload)
- `expires_at`

Used to:

- Reduce connector/api calls.
- Maintain reproducibility within a TTL window.

### 3.6 AVM Logs (v3)

**`avm_runs`**

Logs each AVM evaluation:

- `id`
- `org_id`
- `deal_id` / `run_id`
- `inputs_hash`
- `predicted_values` (AIV/ARV, confidence)
- `comps_snapshot`
- `created_at`

Enables:

- AVM accuracy tracking vs. final numbers.
- Feedback loops and QA for AVM behavior.

### 3.7 CRM / Billing (v3)

**`crm_connections`**

Per-org CRM configuration:

- `org_id`
- `provider` (salesforce, hubspot, etc.)
- Encrypted tokens
- Field mapping config (`mapping_config` JSON)

**`plans`**

SaaS plans (Free, Pro, Enterprise):

- `id`, `name`, `run_quota`, `price`, `features_json`.

**`org_subscriptions`**

- Per-org subscription and billing state.

**`usage_counters`**

- Tracks runs/usage per org for quotas and dashboards.

---

## 4. Edge Functions Inventory & Responsibilities

All domain logic runs through Supabase Edge Functions.

### 4.1 v1.x — Core Underwriting & Evidence

- `v1-ping`
  Simple health check.

- `v1-policy-get`
  Returns active policy for caller’s org/posture.
  Respects RLS and membership.

- `v1-policy-put`
  Updates policy metadata.
  Appends to `policy_versions` with a full policy snapshot.
  Triggers audit logs.

- `v1-analyze`
  Core deterministic underwriting endpoint:

  - Resolves caller’s org via `memberships`.
  - Fetches active `policy_versions` row.
  - Calls `packages/engine` with `{ deal, policy }`.
  - Produces deterministic outputs + trace + hashes.
  - Either:

    - Persists runs directly, or
    - Returns a payload that `v1-runs-save` persists.

- `v1-runs-save`
  Accepts engine outputs + metadata.
  Inserts into `runs` with:

  - `org_id`, `posture`, `deal_id`, `input`, `output`, `trace`, `policy_snapshot`, hashes, meta.
    Respects RLS and uniqueness constraints.

- `v1-repair-rates`
  Returns normalized `RepairRates` per org/market:

  - PSF tiers
  - Big 5 increments
  - Metadata (`as_of`, `source`, `version`)
    Backed by `repair_rate_sets`.

- `v1-ai-bridge`
  Strict wrapper for AI:

  - Uses contracts from `packages/contracts`.
  - Accepts well-defined modes (e.g. strategist).
  - Enforces traceable, non-number-inventing behavior.

- `v1-evidence-start` / `v1-evidence-url`
  Handles evidence uploads:

  - Inserts evidence rows.
  - Issues signed URLs.
  - Ensures `org_id` scoping and RLS compliance.

- `v1-runs-relay`, `v1-runs-replay`, `v1-policy-override-request`, `v1-policy-override-approve`
  Support functions for:

  - Replaying runs,
  - Relay patterns,
  - Policy override governance.

### 4.1.1 Function Environment Vars

Set these in Supabase Dashboard → Settings → Functions (project `zjkihnihhqmnhpxkecpy`):

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (all functions).
- `OPENAI_API_KEY` (required for `v1-ai-bridge`; missing keys return a `CONFIG_ERROR` response).

### 4.2 v2.x - Connectors, Strategy Packs, Multi-Posture

- `v2-connectors-proxy`
  Unified gateway for external property data:

  - MLS
  - County
  - FEMA
  - Tax data
    Normalizes responses and caches to `property_snapshots`.

- Future v2 functions:

  - Strategy pack load/save.
  - Multi-posture comparison queries.

### 4.3 v3.x — AVM, CRM, Billing, SRE

- `v3-avm-predict`
  Combines connectors and AVM logic to propose AIV/ARV with:

  - Comps
  - Confidence
  - Method trace

- `v3-crm-sync`
  Pushes runs or deal updates into CRM based on `crm_connections` config.

- `v3-billing-portal` / Stripe webhooks
  Handles:

  - Customer portal links.
  - Plan changes.
  - Subscription events for `org_subscriptions` and `usage_counters`.

- SRE-oriented functions:

  - Golden replay jobs.
  - Telemetry exporters.
  - Health checks and failure simulations.

---

## 5. Frontend Application Structure & UX Targets

### 5.1 Major Routes (App Router)

All under `apps/hps-dealengine/app`:

**Public:**

- `/` (landing/brochure or redirect)
- `/login`
- `/logout`

**App shell (protected `(app)` group):**

- `/overview` — summary metrics and negotiation playbook for the current deal.
- `/underwrite` — main underwriting UX for deal inputs and running `v1-analyze`.
- `/repairs` — repair/rehab UI (QuickEstimate + detailed estimator).
- `/trace` — run trace explorer (runs, hashes, input/output/trace).
- `/runs` — (optional) runs list view by deal or org.
- `/settings/*` — user/org/team settings.
- `/sandbox` — business logic sandbox / policy editor.
- `/sources` — connectors/source-of-truth debugging.
- `/ai-bridge/debug` — AI bridge debug console.
- `/debug/ping` — internal health checks.

### 5.2 Shell & Navigation

- `app/layout.tsx`:

  - Global HTML shell.

- `app/(app)/layout.tsx`:

  - Protected dashboard shell:

    - `AuthGate`
    - `DealSessionProvider`
    - Top nav (`AppTopNav`)
    - Desktop nav (Overview / Repairs / Underwrite / Trace / Settings)
    - `MobileBottomNav`

UX targets:

- Single SPA-style dashboard look/feel across main routes.
- Navy theme, consistent typography and spacing.
- Pixel parity with `ui-v2` reference components.

### 5.3 Pixel Parity & Testing

- `packages/ui-v2` and `.tmp/ui-v2`:

  - The truth for look & feel.

- Playwright pixel tests:

  - Capture snapshots of:

    - `/overview`
    - `/underwrite`
    - `/repairs`
    - `/sandbox`
    - `/settings`
    - `/underwrite/debug`

  - Used as tripwires for visual regressions.

---

## 6. Roadmap Snapshot (v1 → v2 → v3)

Detailed v1 execution lives in `docs/roadmap-v1-v2-v3.md`.
This section provides a high-level snapshot.

### 6.1 v1 — Deterministic Underwriting Engine (Core)

**Goal:**
Ship a deterministic underwriting OS that is usable day-to-day by HPS and early investors.

**Definition of Done:**

- Fully deterministic `v1-analyze` with:

  - `runs` persistence,
  - Hashes,
  - Trace.

- Evidence flows:

  - At least one evidence type wired end-to-end via `v1-evidence-*`.

- Pixel-parity UI:

  - `/overview`, `/underwrite`, `/repairs`, `/settings`, `/sandbox`.

- Trace explorer:

  - `/trace` shows latest runs with hashes and trace.

- No manual DB hacks needed for normal underwriting usage.

### 6.2 v2 — Connectors, Strategy Packs, Multi-Posture

**Goal:**
Move from “manual entry + engine” to “connected, strategy-driven underwriting”.

Key elements:

- Address → connectors → autofill:

  - MLS, county, FEMA, tax.

- Strategy Packs:

  - Multiple buy boxes per org/investor.
  - Switchable via UI.

- Multi-posture:

  - Conservative / Base / Aggressive comparisons in both:

    - Underwrite page,
    - Overview KPIs.

Supporting pieces:

- `property_snapshots` table and connectors proxy.
- Policy-driven posture matrix outputs.
- UI for posture comparison and toggling.

### 6.3 v3 — Ecosystem, Billing & SRE

**Goal:**
Turn HPS DealEngine into a connected, billable, observable platform.

Key elements:

- AVM:

  - `v3-avm-predict` + `avm_runs`.
  - Evidence-backed AVM suggestions with confidence.

- CRM Integration:

  - `crm_connections` + `v3-crm-sync`.
  - Push key outputs into CRM pipelines.

- Billing:

  - Plans, subscriptions, quotas.
  - Stripe integration and usage tracking.

- SRE / Observability:

  - Golden replays.
  - Telemetry and tracing.
  - Chaos/failure simulations.

---

## 7. Assistant / Agent Interaction Protocol (High-Level)

Any AI agent (ChatGPT, Codex, or others) working on this project must:

- Treat this primer as a high-level architectural guide.
- Respect all non-negotiables:

  - Determinism
  - Policy-driven design
  - RLS-first
  - No `service_role` in user flows
  - Vertical-slice delivery

Use the following documents as the local operating manual:

- `AGENTS.md` — detailed agent behavior and execution protocol.
- `docs/roadmap-v1-v2-v3.md` — detailed roadmap, sprints/slices, and v1/v2/v3 definitions.
- `docs/devlog-hps-dealengine.md` — current progress and “what’s next”.

Before editing code or schema, agents must read and align with:

- `AGENTS.md`
- `docs/primer-hps-dealengine.md`
- `docs/roadmap-v1-v2-v3.md`
- (Optionally) the latest entries in `docs/devlog-hps-dealengine.md`

---

## 8. Summary for Future Sessions

When this primer is present in the repo, any future session (human or AI) should assume:

**Primary project:** `hps-dealengine` (and its evolution through v1 → v2 → v3).

**Stack + architecture are fixed:**

- Next.js 14 App Router.
- Supabase (Postgres + Auth + Edge Functions + Storage).
- Deterministic engine + versioned policies.
- RLS-first, zero trust, no `service_role` in user flows.

**Execution mode:**

- Vertical slices from UI → Edge Function → DB → Trace/Audit.
- Heavy reliance on `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` as gates.
- Pixel parity enforced via `ui-v2` and Playwright snapshots.

**Roadmap context:**

- v1: deterministic engine + runs + evidence + pixel-parity SPA.
- v2: connectors, strategy packs, multi-posture comparison.
- v3: AVM, CRM, billing, SRE hardening.

This document is meant to be stable: roadmap and slice-level details should be maintained primarily in:

- `docs/roadmap-v1-v2-v3.md`
- `docs/devlog-hps-dealengine.md`

while this primer anchors the why and high-level how of HPS DealEngine.
