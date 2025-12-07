# HPS DealEngine — Dev Environment (DEV_ENV)

This document describes the canonical dev environment for the HPS DealEngine app.
It is the source of truth for local setup, Supabase wiring, and the primary
dev organization + user used in tests and demos.

---

## 1. Repo & Project Overview

- Repo name: `hps-dealengine`
- App name: HPS DealEngine
- Purpose: Multi-tenant, RLS-first underwriting OS for distressed single-family /
  townhome real estate (starting with Central Florida). The engine takes structured
  deal facts + versioned policy tokens and returns deterministic outputs such as
  Respect Floor, Buyer Ceiling, MAO corridors, and detailed fee/tax breakdowns.

The Next.js app is UI-only; all business logic runs in Supabase Edge Functions,
scoped by the caller's JWT (no service_role in any user-facing path).

---

## 2. Core Stack (Dev)

- Monorepo: pnpm workspaces
- Frontend: Next.js 14 (App Router), React, Tailwind / internal UI kit
- Engine: `packages/engine` (deterministic underwriting logic)
- Contracts: `packages/contracts` (Zod schemas for AnalyzeInput / AnalyzeResult)
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions)
- Tests: Vitest for engine; Playwright for visual checks
- CI: GitHub Actions (typecheck, test, build)

---

## 3. Supabase Project (Dev)

- Project ref: `zjkihnihhqmnhpxkecpy`
- API base URL: `https://zjkihnihhqmnhpxkecpy.supabase.co`
- Auth / Storage / Edge Functions: all live under this project.

The Next.js app uses public anon key + user JWT. User-facing flows must not use
the service_role key. Only admin/seed tooling may use service_role, never from
the browser.

---

## 4. Canonical Dev Organization

The dev org is the anchor for all seeded data, policies, and runs.

- Table: `public.organizations`
- Dev org id: `033ff93d-ff97-4af9-b3a1-a114d3c04da6`
- Dev org name: `HPS DealEngine Dev Org`

This org is created/maintained by the idempotent seed script:

- File: `supabase/bootstrap/dev_org_seed.sql`
- Behavior:
  - Inserts/updates the org row with the above id and name.
  - Ensures a membership row exists for the dev user (see below).
  - Safe to run multiple times.

---

## 5. Canonical Dev User & Membership

### 5.1 Auth user

- Email: `underwriter@test.local`
- Password: managed in Supabase Auth (never committed into the repo).
- Role in app: Internal underwriter / VP-level tester.

This user is created via the Supabase Auth dashboard or CLI, not via SQL.

### 5.2 Membership (public.memberships)

Dev membership row:

- org_id = `033ff93d-ff97-4af9-b3a1-a114d3c04da6`
- user_id = `auth.users.id` for `underwriter@test.local`
- role    = `vp` (enum: `membership_role`)

The seed script `supabase/bootstrap/dev_org_seed.sql` links this user to the org:

- Looks up `auth.users` by `email = 'underwriter@test.local'`.
- Inserts/updates `public.memberships` with `role = 'vp'::membership_role`.
- Uses `ON CONFLICT (org_id, user_id)` to be idempotent.

RLS throughout the app expects:

- `auth.uid()` -> `public.memberships.user_id` -> grants access to rows with matching org_id.

---

## 6. Edge Functions (Dev Contract)

Core Edge Functions wired in dev:

- `v1-analyze`
  - Deterministic underwriting engine entrypoint.
  - Input: JSON body matching AnalyzeInput (or tolerant superset).
  - Output envelope:

    {
      "ok": true,
      "result": {
        "outputs": { ... },
        "infoNeeded": [],
        "trace": [ ... ]
      }
    }

  - Currently returns at least:
    - `aivSafetyCap` (AIV capped vs ARV)
    - `carryMonths` (DOM-derived, clamped 0–6)
    - Additional slots will be filled as slices land.

- `v1-runs-save`
  - Persists an underwriting run (inputs + outputs + hashes) into `public.runs`.
  - Enforces uniqueness via `(org_id, posture, input_hash, policy_hash)`.

- `v1-policy-get` / `v1-policy-put`
  - Read/write policy + policy_versions with RLS and versioning.

- `v1-evidence-start` / `v1-evidence-url`
  - Governed file uploads for evidence into Supabase Storage.

All user-facing calls are scoped via caller JWT; `verify_jwt` is enabled.

---

## 7. Key Tables & RLS Expectations

High-level expectations (full detail lives in schema/RLS export):

- `public.organizations`
  - Org metadata (id, name).
  - RLS: only members (via memberships) can see their org rows.

- `public.memberships`
  - Bridges auth.users <-> orgs.
  - Fields: org_id, user_id, role (membership_role).
  - RLS: typically `auth.uid() = memberships.user_id`.

- `public.policies` & `public.policy_versions`
  - Policy tokens and historical versions per org/posture.
  - Partial unique index: `(org_id, posture) WHERE is_active = true`.

- `public.runs`
  - Underwriting runs.
  - Fields: org_id, posture, input_hash, output_hash, policy_hash, created_at.
  - Unique index: `(org_id, posture, input_hash, policy_hash)`.
  - RLS: only members of the org can read/write their runs.

---

## 8. Local Dev Workflow

Prereqs:

- Node + pnpm installed.
- `apps/hps-dealengine/.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase project `zjkihnihhqmnhpxkecpy` reachable.

Core commands from repo root:

- `pnpm -w typecheck`
- `pnpm -w test`
- `pnpm -w build`

Dev server:

- `pnpm --filter "./apps/hps-dealengine" dev`
- Open `http://localhost:3000`.

---

## 9. E2E Smoke Flow (Dev Org + User)

1) Login

- Start dev server.
- Go to `/login`.
- Sign in as `underwriter@test.local`.

2) Underwrite Debug (engine + runs)

- Go to `/underwrite/debug`.
- Set ARV 300000, AIV 240000, DOM 45 (example).
- Click "Call v1-analyze" and confirm:
  - `ok: true`
  - `result.outputs.aivSafetyCap` and `carryMonths` populated.
- Click "Save Run via v1-runs-save" and confirm:
  - `ok: true`
  - A `public.runs` row exists for org `033ff93d-ff97-4af9-b3a1-a114d3c04da6`.

3) Main Underwrite Page

- Go to `/underwrite`.
- Ensure no runtime errors.
- Enter ARV / AIV / DOM.
- Click "Analyze with Engine".
- Confirm Engine Analysis Snapshot shows:
  - AIV Safety Cap ≈ 240000
  - Carry Months ≈ 2

4) Overview

- Go to `/overview`.
- Confirm overview metrics are wired (or ready to be wired) to latest AnalyzeResult.

When all steps above are green, dev env is considered healthy.

---

## 10. Keeping DEV_ENV.md in Sync

Whenever the dev environment meaningfully changes (new canonical org, dev user,
critical Edge Function, or RLS behavior), update this file in the same commit as
the schema/code change to avoid drift.
