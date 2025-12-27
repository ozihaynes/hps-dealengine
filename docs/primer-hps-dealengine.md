---
doc_id: 'engine.primer-hps-dealengine'
category: 'engine'
audience: ['ai-assistant', 'engineer', 'product', 'exec', 'ops']
trust_tier: 1
summary: 'Stable architecture, invariants, and operating model for HPS DealEngine (deterministic underwriting SaaS).'
---

# HPS DealEngine: Project & Development Primer

This primer is the **stable, high-signal Source of Truth** for architecture + invariants.
For “what changed recently” and “what’s next,” use:

- `docs/devlog-hps-dealengine.md` — what actually shipped and current blockers
- `docs/roadmap-v1-v2-v3.md` — phased roadmap framing, v1.1 hardening, v2/v3 themes

---

## Table of contents

- [1. What DealEngine is](#1-what-dealengine-is)
- [2. Non-negotiable principles](#2-non-negotiable-principles)
- [3. Current shipped baseline](#3-current-shipped-baseline)
- [4. Documentation routing and trust tiers](#4-documentation-routing-and-trust-tiers)
- [5. Core architecture and repo layout](#5-core-architecture-and-repo-layout)
- [6. App structure and UX invariants](#6-app-structure-and-ux-invariants)
- [7. Deterministic underwriting engine](#7-deterministic-underwriting-engine)
- [8. Data model (tables) overview](#8-data-model-tables-overview)
- [9. Runtime endpoints inventory](#9-runtime-endpoints-inventory)
- [10. AI and agent platform](#10-ai-and-agent-platform)
- [11. Testing, QA, and quality gates](#11-testing-qa-and-quality-gates)
- [12. Operating mode for assistants and agents](#12-operating-mode-for-assistants-and-agents)

---

## 1. What DealEngine is

**Repo name:** `hps-dealengine`

**Product definition:**
A production-grade, multi-tenant SaaS for **deterministic**, **evidence-backed** real-estate underwriting and execution support.

**Initial focus:**
Distressed **SFR / townhome** deals in **Central Florida**.

**Designed to grow into:**
A national, multi-strategy underwriting platform (connectors, portfolio analytics, CRM, billing, SRE) without compromising determinism, auditability, or RLS posture.

**Core product claim (what must stay true):**
DealEngine is a **deterministic filter** (policy + math + evidence) — not “gut feel,” not an opaque AI.

---

## 2. Non-negotiable principles

These are invariants. If anything conflicts with these, **these win**.

### 2.1 Policy-driven underwriting

- Underwriting rules live as **versioned policy JSON in Postgres**, not hard-coded in React, not hidden in scripts.
- Policy artifacts are org-scoped and posture-scoped:
  - `policies`
  - `policy_versions`
  - consumption views like `policy_versions_api`
- Changing policy JSON can change behavior **without redeploying the UI**.

**Implication:**
If you “need a rule,” ask: “Should this be a policy token?”

### 2.2 Full determinism

Given the same:

- deal input (normalized),
- active policy snapshot (org + posture),
- engine version,

…the system must produce **bit-identical outputs, trace, and hashes**.

**Enforcement anchor:** the `runs` table

- `runs` persists:
  - `input`, `output`, `trace`, `policy_snapshot`
  - `input_hash`, `policy_hash`, `output_hash`
- uniqueness constraint on:
  - `(org_id, posture, input_hash, policy_hash)`

**Implication:**
No hidden randomness. No time-of-day branching. No “AI computed MAO.” If something changes, it must be attributable to input/policy/version.

### 2.3 Complete audit trail

Every underwrite and policy change must be:

- explainable
- replayable
- diffable

**Core audit surfaces:**

- `runs` — canonical execution log
- `policy_versions` — full policy history by org/posture
- `audit_logs` — row-level change sink for critical org-scoped tables

**Implication:**
A human (or agent) must be able to answer: “Who changed what, when, and why?” with evidence in the DB.

### 2.4 Traceable AI

AI is an **advisor/strategist layer**, not a magic calculator.

Rules:

- AI **does not invent numbers**.
- AI references numbers only from:
  - engine outputs (`AnalyzeOutputs`)
  - trace frames
  - policy snapshots/tokens
  - evidence stored and accessible under RLS (and/or connector artifacts with provenance)

AI I/O must be schema-validated:

- All “client ↔ function/route” payloads are defined in `packages/contracts` (Zod).
- AI outputs should cite which outputs/trace/policies they referenced.

### 2.5 RLS-first, zero-trust posture

Security fundamentals:

- All user-facing reads/writes use the **caller’s JWT**, never `service_role`.
- Every org/user-scoped table is protected by **Row-Level Security (RLS)**.
- `service_role` is reserved strictly for:
  - bootstrap/seed scripts,
  - admin maintenance tasks,
  - migrations (non-user flows).

**Implication:**
No `service_role` in browser code. No `service_role` in Edge Functions invoked by normal users. Org access is always verified via `memberships`.

### 2.6 Vertical-slice delivery

Features ship as narrow, end-to-end slices:

> UI → Route/Edge Function → DB → Trace/Audit → Tests

No “UI-only” business rules. No DB changes without wiring.

### 2.7 Pixel parity and UX consistency

UI work must be **pixel-parity** with the existing system:

- reuse existing components/patterns
- match spacing/typography/interaction
- if visuals change intentionally, update Playwright snapshots intentionally (and explain why)

---

## 3. Current shipped baseline

DealEngine is already **field-ready** for v1 and includes v1.1 hardening elements.

At a high level, what is already true (and must be preserved):

- deterministic underwriting through `v1-analyze` + `runs` persistence
- Business Sandbox v1 (policy-driven knobs) wired into runtime math/risk/workflow
- Dashboard (“/overview”) + Trace surfaces render engine outputs and trace frames (no recompute)
- repairs pricing backed by org-scoped repair rate sets + profiles
- valuation spine: property snapshot caching + valuation runs + comps UI rails
- QA/E2E harness is env-gated and skip-safe when QA env isn’t configured
- AI platform: tri-agent personas (Analyst/Strategist/Negotiator), logged to `agent_runs`, with Supabase-backed chat history and stale-run gating

---

## 4. Documentation routing and trust tiers

DealEngine docs use lightweight metadata and a trust system so agents and humans can resolve conflicts.

### 4.1 Doc router

If you’re unsure where a rule “should live,” start here:

- `docs/index-for-ai.md` — doc sitemap / boot sequence
- `docs/ai/doc-registry.json` — structured doc registry (path + category + trust tier)
- `docs/ai/doc-metadata-schema.md` — frontmatter schema
- `docs/ai/data-sources-and-trust-tiers.md` — conflict resolution rules

### 4.2 Trust tiers (when sources conflict)

Docs may declare `trust_tier` where **lower is stronger**.

When sources conflict:

1. Prefer the **lowest trust tier number**
2. Call out the conflict explicitly
3. If the conflict affects implementation, stop and get an owner decision

Default hierarchy:

- Tier 0: math/contracts/manuals + saved runs/trace
- Tier 1: engine/app/ops docs (implementation truth)
- Tier 2: product vision, examples, playbooks
- Tier 3: external market context (cite; never overrides deal math)

---

## 5. Core architecture and repo layout

DealEngine is a pnpm-workspace monorepo with:

- a Next.js App Router frontend
- Supabase backend (Postgres + RLS, Auth, Storage, Edge Functions)
- a deterministic engine package used by Edge Functions
- contract schemas shared across boundaries (Zod)

### 5.1 Monorepo: where things live

Typical top-level structure:

- `apps/hps-dealengine/` — Next.js app (App Router)
- `packages/engine/` — deterministic underwriting engine (math + trace)
- `packages/contracts/` — Zod schemas for input/output shapes
- `packages/ui-v2/` — design system + UI primitives
- `packages/agents/` — persona agent SDK (Analyst/Strategist/Negotiator)
- `packages/hps-mcp/` — MCP server for tooling (stdio + Streamable HTTP)
- `supabase/` — migrations, edge functions, seed/ops utilities
- `tests/e2e/` — Playwright E2E specs (env-gated)
- `docs/` — project docs, specs, and runbooks
- `scripts/` — PowerShell + Node runbooks (CI, proofs, doctor scripts)

---

## 6. App structure and UX invariants

### 6.1 Next.js app

- Framework: **Next.js 14 App Router**
- Language: TypeScript (strict)
- Styling: Tailwind CSS
- Animations: Framer Motion

The app is **presentation + orchestration** only.
Business math/rules live in:

- deterministic engine (`packages/engine`)
- Supabase Edge Functions (JWT + RLS)

### 6.2 Core routes

Public (unauthenticated):

- `/`
- `/login`
- `/logout`

Post-login routing:

- `/startup` — hub (empty state + “View all deals”)
- `/deals` — org-scoped deals list (create/select deal, set DealSession)
- `/overview` — labeled **Dashboard** in the UI (route path remains `/overview`)

Authenticated app routes (deal-required unless noted):

- `/overview` (Dashboard)
- `/underwrite`
- `/repairs`
- `/trace`
- `/runs`
- `/sandbox`
- `/settings`
- `/sources` (source/provenance surface)
- `/ai-bridge/debug` (debug tooling)
- `/debug/ping` (health checks)

### 6.3 Deal session model

DealEngine is deal-centric. Many routes require an “active deal.”

- `/deals` sets the active deal (DealSession) and navigates to `/overview?dealId=...`
- `DealGuard` protects deal-required routes and bounces to `/startup` when no active deal is present
- Deep links must survive hydration: `DealGuard` should defer redirect until it can resolve whether a deal is present

### 6.4 Layout invariants (App Router)

- `apps/hps-dealengine/app/layout.tsx`:

  - global HTML shell + theme + fonts
  - root `DealSessionProvider` so session exists across `/startup`, `/login`, and authenticated routes

- `apps/hps-dealengine/app/(app)/layout.tsx`:
  - authenticated shell
  - `AuthGate` for session guard
  - `DealGuard` for deal-required routes
  - `AppTopNav` (desktop)
  - `MobileBottomNav` (mobile)

### 6.5 UI-v2 and pixel parity

- `packages/ui-v2` is the design-system reference for pixel parity.
- `.tmp/ui-v2` is **prototype-only** and excluded from deploy artifacts (it must not be a production dependency).
- App code should import stable constants/types via:
  - `apps/hps-dealengine/lib/ui-v2-constants.ts`
  - `apps/hps-dealengine/types.ts`
  - and committed `apps/hps-dealengine/constants*` modules

---

## 7. Deterministic underwriting engine

### 7.1 `packages/contracts` (schemas)

`packages/contracts` defines the canonical shared contracts:

- underwriting:
  - `AnalyzeInput`
  - `AnalyzeOutputs` / `AnalyzeResult`
- repairs:
  - repair rates and profile shapes
- evidence:
  - upload metadata, evidence summary shapes
- valuation:
  - `PropertySnapshot`, `MarketSnapshot`, `Comp`, `ValuationRun` (and policy-gated additions)
- AI:
  - persona request/response shapes
  - guardrails schemas (no fabricated numbers)

### 7.2 `packages/engine` (math + trace)

The deterministic engine:

- consumes normalized deal input + policy snapshot
- computes underwriting outputs (MAO corridors, spread, caps, risk/workflow, timeline/carry, etc.)
- emits a structured **trace** (frames like RISK_GATES_POLICY, EVIDENCE_FRESHNESS_POLICY, etc.)
- produces stable hashes through the run persistence layer

Edge Functions do not “re-implement math”:

- Edge uses a bundled engine artifact (vendor bundle) aligned to `packages/engine`
- The browser does not recompute underwriting numbers

### 7.3 Policies: how behavior changes without deploy

Policies live in Postgres and are versioned.

- the active policy per org/posture is loaded by functions like `v1-policy-get`
- changes are written via RLS-safe governance flows (`v1-policy-put` and future override pipelines)
- run persistence stores the exact `policy_snapshot` so outputs are diffable over time

### 7.4 Runs: deterministic persistence

`runs` is the canonical underwriting execution log:

- each run stores `input`, `output`, `trace`, `policy_snapshot`
- hashes (`input_hash`, `policy_hash`, `output_hash`) enable replay and dedupe

The dedupe invariant is critical:

- repeated runs with identical input+policy produce one canonical row
- regression tests can compare hashes across code changes

---

## 8. Data model (tables) overview

This section is a conceptual map (not an exhaustive schema dump).
Migrations under `supabase/migrations/` are the canonical schema truth.

### 8.1 Multi-tenancy backbone

- `organizations`
  - one portfolio / business entity per row
- `memberships`
  - links `user_id` to `org_id` with a role
  - the anchor for RLS scoping: `auth.uid()` → memberships → org_id

### 8.2 Deals and working state

- `deals` (canonical org-scoped deals table)

  - id, org_id
  - address fields + normalized JSON `payload`
  - audit fields (created_by, created_at, updated_at)

- `deal_working_states` (UI autosave buffer, if present in schema)
  - stores in-progress Underwrite/Repairs edits so UI can autosave without mutating canonical deal fields prematurely
  - still org-scoped and RLS-protected

### 8.3 Runs and traces

- `runs`
  - deterministic execution log
  - persisted input/output/trace/policy_snapshot + hashes
  - ties to `deal_id` and posture

### 8.4 Policies and governance

- `policies`
- `policy_versions`
- `policy_versions_api` (consumption view)

(Planned/iterating) governance surfaces may include:

- `policy_override_requests` (request/review/approve pattern)
- any additional tables must be org-scoped + RLS + audit-triggered

### 8.5 Repairs

- `repair_rate_sets` (and related normalized structures)
  - org + market + posture aware
  - supports PSF tiers and “Big 5 budget killers”
- repair profiles (backed by tables served via `v1-repair-profiles`)

### 8.6 Evidence and artifacts

Evidence is treated as first-class underwriting input.

- evidence metadata tables (org-scoped, RLS)
- `audit_logs` is the row-change sink
- evidence files live in private Supabase Storage buckets and are served by signed URLs

### 8.7 Valuation spine (v1.1 baseline)

Valuation is append-only and policy-driven.

- `property_snapshots`
  - org-scoped caching of provider snapshots (with TTL/policy gates)
- `valuation_runs`
  - append-only valuation run history
  - ties to deal + property snapshot + policy gates
  - includes comps set, selection basis/version, confidence/warnings, and provenance
- `valuation_comp_overrides` (when policy-gated features are enabled)
  - org/deal/comp-keyed overrides with required notes, RLS, audit

### 8.8 Sandbox and settings

- `user_settings`
  - user preferences by org (default posture/market, ui prefs, etc.)
- `sandbox_settings`
  - org + posture scoped runtime config JSON
- `sandbox_presets`
  - org + posture scoped saved sandbox configurations

Business Sandbox v1 lives in policy + these settings layers (not hard-coded UI).

### 8.9 AI / agent platform

- `agent_runs`

  - canonical logging sink for persona agents
  - org/user/persona + workflow_version + model + input/output/error + timing/tokens
  - RLS via memberships and `auth.uid()` + audit trigger

- Supabase-backed chat history tables
  - org/user scoped, RLS-protected
  - retention via TTL (default 30 days)
  - used by tri-agent UI surfaces and “Your Chats” history

---

## 9. Runtime endpoints inventory

DealEngine has two main server-side execution surfaces:

1. Supabase Edge Functions (Deno)
2. Next.js runtime routes (node) for agent personas and app-specific runtime needs

### 9.1 Supabase Edge Functions (Deno)

**Health**

- `v1-ping` — simple health check (used by `/debug/ping`)

**Core underwriting**

- `v1-analyze`

  - deterministic underwriting entrypoint
  - uses the shared engine bundle and policy builder
  - returns output + trace + hashes

- `v1-runs-save`
  - persists analyze results to `runs`
  - enforces dedupe constraint and ties to `deal_id`

**Policy**

- `v1-policy-get` / `v1-policy-put`
  - load and update org/posture policy artifacts
  - must remain RLS-safe and audit-friendly

**Repairs**

- `v1-repair-rates`
  - serves PSF tiers + Big 5 from `repair_rate_sets`
- `v1-repair-profiles`
  - CRUD for repair profiles (org/market/posture scoped)

**Evidence**

- `v1-evidence-start`
  - creates evidence metadata row + returns upload URL/path
- `v1-evidence-url`
  - returns signed URL for viewing a stored evidence artifact

**Settings / sandbox**

- `v1-user-settings` — GET/PUT upsert (user/org scoped)
- `v1-sandbox-settings` — GET/PUT upsert (org/posture scoped)
- `v1-sandbox-presets` — GET/POST/DELETE presets (org/posture scoped)

**Valuation**

- `v1-connectors-proxy`
  - provider proxy with deterministic stub fallback when configured
- `v1-valuation-run`
  - policy-driven valuation run creation and persistence
  - loads overrides when enabled and remains deterministic (hash gated)
- `v1-valuation-apply-arv` (or equivalent)
  - persists “use suggested ARV” with provenance under caller JWT
- valuation override endpoints (read-only display + audited override writes)
  - must require reason and preserve provenance

**AI (edge bridge)**

- `v1-ai-bridge`
  - schema-validated AI interface on top of engine outputs/trace/policy snapshots
  - must not mint numbers; must reference existing outputs and evidence

> **JWT rule:** Every user-facing Edge Function must use the caller JWT and enforce org membership; no `service_role` in user flows.

### 9.2 Next.js runtime routes (node)

**Persona agent routes:**

- `/api/agents/analyst`
- `/api/agents/strategist`
- `/api/agents/negotiator`

Responsibilities:

- require `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`
- resolve `org_id` via memberships
- forbid cross-org deal access
- log to `agent_runs` (success and error)
- return schema-validated output for UI

These routes are the canonical surface for tri-agent UI behavior.

---

## 10. AI and agent platform

### 10.1 Tri-agent model (canonical)

All in-app AI is delivered through **three personas**:

- **Deal Analyst**

  - per-deal, per-run underwriting and gating explanations
  - default: tactical, evidence-first

- **Deal Strategist**

  - system/sandbox/market strategy and what-if framing
  - default: operational strategist, policy-aware

- **Deal Negotiator**
  - seller-facing negotiation planning + playbooks
  - default: calm closer, structured objections, anchored to engine outputs

If older docs mention a dual-agent model, treat **tri-agent as current**.

### 10.2 AI guardrails (hard)

AI must:

- ground numbers in engine output + trace frames
- call out missing/stale evidence rather than guessing
- never weaken risk/compliance gates
- never write direct offer numbers that conflict with policy/outputs
- stay RLS-safe: only discuss records the caller can access

### 10.3 Chat history persistence

- AI chats are persisted in Supabase (org/user scoped)
- protected by RLS
- TTL retention (default 30 days)
- UI includes “Your Chats” per persona

### 10.4 Negotiator dataset and strategy matrix

Negotiator relies on a structured dataset:

- preferred path: `data/negotiation-matrix/negotiation-matrix.data.json`
- fallback/dev path: `docs/ai/negotiation-matrix/negotiation-matrix.example.json`
- schema reference:
  - `docs/ai/negotiation-matrix/negotiation-matrix.schema.json`
  - `docs/ai/negotiation-matrix/spec-negotiation-matrix.md`

The dataset provides scenario → pre-emptive script mappings, with numeric placeholders populated from engine outputs.

### 10.5 HPS MCP server (tooling surface)

There is an MCP server package for vNext tooling:

- package: `packages/hps-mcp`
- supports stdio and Streamable HTTP
- HTTP auth uses `HPS_MCP_HTTP_TOKEN`

Example commands (PowerShell):

```powershell
# From repo root
pnpm --filter "@hps/hps-mcp" start:http

# Or via a root script if present
pnpm dev:hps-mcp:http
Tools include deal/run/evidence retrieval, negotiation strategy lookup, KPI and risk stats aggregation, sandbox settings fetch, and strategist KB search.

11. Testing, QA, and quality gates
11.1 The “Green Check” baseline
Before recommending any commit/push/deploy, these must be green:

PowerShell

pnpm -w typecheck
pnpm -w test
pnpm -w build
11.2 Preferred local runner (Windows / PowerShell)
If present, prefer the repo’s local CI runner:

PowerShell

.\scripts\local-ci.ps1
Playwright is opt-in locally via an env flag (when supported by the script):

PowerShell

$env:PLAYWRIGHT_ENABLE="true"
.\scripts\local-ci.ps1
11.3 QA / E2E harness
DealEngine uses env-gated Playwright specs that:

follow the IA: /login → /startup → /deals → /overview?dealId=...

validate core vertical slices end-to-end

skip cleanly when QA env is not configured

Reference doc: docs/QA_ENV_V1.md

Preflight gate (when present): .\scripts\qa-preflight.ps1

Playwright specs live under: tests/e2e/

Common E2E runner (when present): pnpm -w test:e2e

11.4 Pixel snapshots
UI changes that affect layout/visuals require:

intentional snapshot updates

a clear explanation of what changed and why

12. Operating mode for assistants and agents
This repo is designed to be worked on by:

humans

Codex-style execution agents

in-app AI surfaces

The strict behavioral protocol is defined in: AGENTS.md

High-level non-negotiables for all assistants/agents:

do not bypass determinism, policy-first design, or RLS posture

do not introduce service_role into user flows

work in vertical slices and leave an audit trail

keep UI pixel-parity and avoid business rules in React

when something fails: use diagnostics-first and minimal deterministic fixes

prefer PowerShell commands and explicit file paths (Windows-first workflow)

Cross references (high signal):

AGENTS.md — operating manual for all agents (strict rules)

docs/devlog-hps-dealengine.md — current state + latest shipped slices

docs/roadmap-v1-v2-v3.md — phased plan and “already true” baseline

docs/index-for-ai.md — doc router / boot sequence

docs/ai/data-sources-and-trust-tiers.md — conflict resolution rules

docs/QA_ENV_V1.md — QA Supabase + Playwright env config

docs/knobs-audit-v1.md — sandbox knob inventory + KEEP/DROP classification

tools/knob-coverage-report.cjs — runtime wiring coverage report
```
