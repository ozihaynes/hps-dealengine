# AGENTS.md — HPS DealEngine Agent Operating Manual

This document defines how **any AI agent or assistant** (ChatGPT, local Codex, scripts, etc.) must behave when working on the `hps-dealengine` repository.

It is **not optional guidance**. Agents are expected to follow this as a protocol.

---

## 0. Core Mission

You are helping build and operate **HPS DealEngine**, a production-grade, multi-tenant SaaS for deterministic, evidence-backed real-estate underwriting, initially focused on **distressed SFR/townhome deals in Central Florida** and designed to grow into a **national, multi-strategy underwriting platform**.

Your job as an agent is to:

- Make the system **more deterministic**, not less.
- Make it **more auditable**, not less.
- Make it **safer and harder to misuse**, not more fragile.
- Move work forward in **vertical slices** that can be tested and trusted end-to-end.

---

## 1. Mandatory Documents to Read First

Before editing any code or schema, an agent **must** conceptually “load” and respect the following repo documents:

1. `docs/primer-hps-dealengine.md`

   - High-level architecture, non-negotiables, and design principles.

2. `docs/roadmap-v1-v2-v3.md`

   - Roadmap of v1 (deterministic engine + runs + evidence + SPA shell), v2 (connectors + strategy packs), v3 (AVM + CRM + billing + SRE).

3. `AGENTS.md` (this document)

   - Behavioral protocol and execution rules for agents.

4. `docs/devlog-hps-dealengine.md` (when present)
   - Current progress and “what we’re doing right now.”

**Assumption:**  
Any agent working in this repo has these in working memory and is aligning all suggestions and edits to them.

---

## 2. Non-Negotiable Principles

These principles **override** convenience and shortcuts. If there is a conflict, these win.

### 2.1 Policy-Driven Underwriting

- All important business rules belong in **Postgres policies**, not React components, magic constants, or random scripts.
- Policies are stored and versioned in:
  - `policies`
  - `policy_versions`
  - Exposed via views like `policy_versions_api` and Edge Functions such as `v1-policy-get` / `v1-policy-put`.

**Implication for agents:**

- Never silently “bake in” thresholds, spreads, or risk rules into client-side code.
- If you must introduce logic, think:
  1. “Should this be a policy token?”
  2. “Should this be surfaced via `v1-policy-*` or a new policy function?”

### 2.2 Full Determinism

Given the same:

- Deal input,
- Active policy for that org + posture,
- Engine version,

…the system must produce **bit-identical outputs, hashes, and trace**.

Enforced via:

- `runs` table:
  - Stores `input`, `output`, `trace`, `policy_snapshot`, and hashes (`input_hash`, `policy_hash`, `output_hash`).
  - Uniqueness constraint on `(org_id, posture, input_hash, policy_hash)`.

**Implication for agents:**

- Do not introduce **hidden randomness** or non-reproducible behavior in core underwriting paths.
- If you change engine logic, be explicit about:
  - Versioning.
  - Expected diffs in hashes.
  - Migration/replay strategy if needed.

### 2.3 Complete Audit Trail

Every underwrite and policy change must be:

- Explainable
- Replayable
- Diffable

Key tables:

- `runs` — execution log.
- `policy_versions` — full JSON policy history.
- `audit_logs` — row-level change history for critical tables.

**Implication for agents:**

- Any new critical behavior (e.g., new override type, new evidence type, new connector) should:
  - Write to audit logs and/or dedicated tables with `org_id`, `created_by`, timestamps.
  - Be traceable from UI → Edge Function → DB record.

### 2.4 Traceable AI (AI as Strategist, Not Calculator)

AI is **allowed to explain, summarize, and strategize**, but **not** to:

- Invent new numeric values out of nowhere.
- Override deterministic engine outputs without trace.

AI inputs and outputs must:

- Flow through `packages/contracts` Zod schemas.
- Be explainable and anchored to:
  - Policy tokens,
  - Engine outputs,
  - Evidence/connector data stored in Postgres.

**Implication for agents:**

- Never add AI features that:
  - Directly output “final offer numbers” without clearly referencing engine output.
  - Modify numeric fields silently in the database.

### 2.5 RLS-First, Zero-Trust Posture

Security fundamentals:

- All user-facing reads/writes must use the **caller’s JWT**, never `service_role`.
- RLS is enforced on **every** org/user-scoped table.

Service role:

- **Never** appears in:
  - Browser code.
  - Edge Functions invoked by user flows.
- Reserved strictly for:
  - Bootstrap/seed scripts,
  - Admin migrations and maintenance jobs.

**Implication for agents:**

- Do not add `service_role` usage to any UI or Edge Function intended for normal users.
- Always wire Supabase clients with:
  - `verify_jwt = true` for Edge Functions.
  - `auth.uid()` in RLS policies.

### 2.6 Vertical-Slice Delivery

Work must be shipped as **vertical slices**:

> UI → Edge Function → DB → Trace/Audit

Each slice:

- Has a small, testable Definition of Done.
- Includes:
  - Routing,
  - Data flow,
  - Persistence,
  - Tests (where feasible).

**Implication for agents:**

- Avoid doing “just UI” or “just DB” changes when the task is to change user behavior.
- When you propose or generate code, prefer a **thin end-to-end slice** even if it’s minimal.

---

## 3. Allowed vs Forbidden Behaviors (for Agents)

### 3.1 Allowed / Encouraged

Agents **should**:

- **Refactor** to improve clarity without breaking determinism or RLS.
- Create new **Edge Functions** to:
  - Encapsulate underwriting logic,
  - Connect to external data (MLS, county, FEMA, etc.),
  - Manage evidence flows and policy overrides.
- Add **Zod schemas** in `packages/contracts` whenever new external input/output shapes are introduced.
- Add or adjust **tests** in `packages/engine`, Playwright, and other testing layers.
- Propose **schema migrations** (as SQL migration files) when new tables/columns are needed.

### 3.2 Forbidden (Hard “No”)

Agents **must not**:

- Introduce `service_role` into any browser-accessible or user-invoked path.
- Add hard-coded secrets or credentials in the repo.
- Skip RLS on new tables that hold org/user data.
- Introduce non-deterministic behavior into `v1-analyze` or other core engine paths (e.g., unseeded randomness, time-of-day branching without explicit versioning).
- Make silent schema changes in Supabase directly without migration files in the repo.

---

## 4. Execution Protocol for Code Changes

Whenever an agent is asked to implement or modify something (new feature, bug fix, refactor), follow this protocol.

### 4.1 Read and Align

Before touching code:

1. Re-read:
   - `docs/primer-hps-dealengine.md`
   - `docs/roadmap-v1-v2-v3.md`
   - `AGENTS.md` (this file)
2. Optionally read:
   - `docs/devlog-hps-dealengine.md` (for current focus).

Ask yourself:

- “Which sprint/slice in the roadmap does this belong to?”
- “What vertical slice does this change? UI, Edge Function, DB, trace?”

### 4.2 Propose a Plan (Even if Brief)

When responding, structure your changes as:

- **Context:** What part of the system you’re touching (e.g., Sprint 3.1 `useRepairRates`, Repairs tab).
- **Plan:** 3–5 bullet points describing:
  - Files to create/modify,
  - Edge Functions involved,
  - DB migrations if needed.

This makes it easy for the human operator to follow your reasoning and verify alignment.

### 4.3 Work in Vertical Slices

For each slice, ensure your proposal contains:

- **UI**:

  - React components with clear props and types.
  - Alignment with `packages/ui-v2` where relevant.

- **Edge Function**:

  - Deno code with explicit input/output schemas from `packages/contracts`.
  - JWT verification and org resolution via `memberships`.

- **DB**:

  - SQL migration files (timestamped) for schema changes.
  - RLS policies and indexes as needed.

- **Tests / Tripwires**:
  - Unit tests for engine or helpers where appropriate.
  - Playwright snapshots updated intentionally when UI changes.

### 4.4 Validate with CI Commands

Agents should finish changes by recommending (or in automated contexts, running):

- `pnpm -w typecheck`
- `pnpm -w test`
- `pnpm -w build`
- `npx playwright test` (once v1 UI is visually locked, as per roadmap)

If changes intentionally affect the UI, specify:

- Which Playwright snapshots should be updated.
- What the new expected visual behavior is.

---

## 5. Supabase & RLS Expectations

Agents must treat Supabase and RLS as the **security envelope** around DealEngine.

### 5.1 Supabase Clients

Patterns:

- **Client-side**:

  - Use a helper like `lib/supabaseClient.ts` that wires Supabase Browser client (no service role).

- **Server-side / Edge Functions**:
  - Use `createClient` / `createServerClient` configured with:
    - `verify_jwt = true`
    - Accessing `auth.uid()` via the incoming JWT.

### 5.2 RLS Patterns

For org-scoped tables, enforce a pattern equivalent to:

    USING (
      org_id IN (
        SELECT org_id
        FROM memberships
        WHERE user_id = auth.uid()
      )
    )

For **insert** policies:

- Make sure `org_id` is either:
  - Injected from the JWT + membership lookup, or
  - Validated against allowed orgs for that user.

**Implication:**

- Don’t trust any `org_id` coming directly from the client without cross-checking against `memberships`.

---

## 6. AI / LLM Integration Rules

Whenever you add or change AI features (e.g., `v1-ai-bridge` modes, strategist views), follow these rules.

### 6.1 Contracts and Modes

- All AI payloads must be defined via Zod schemas in `packages/contracts`.
- Each mode (e.g., `"strategist"`, `"explainer"`) must have:
  - Clear input shape.
  - Clear output shape.
  - Explicit guardrails for:
    - Numeric references.
    - Evidence links.

### 6.2 Data Provenance

AI should only reference:

- Numbers from engine outputs (`AnalyzeResult`).
- Policy tokens in `policy_versions`.
- Evidence/connector data in Postgres.

**Never**:

- Fabricate new numeric assumptions (“ARV is probably X”) without stating that it is a speculative suggestion and tying it to known ranges or evidence.

### 6.3 Trace and Explainability

AI outputs should:

- Be explainable in natural language.
- Reference run IDs, policy versions, or evidence IDs where helpful.
- Complement, not compete with, deterministic logic.

---

## 7. Logging, Traces, and Observability

Even before full v3 SRE work, agents should:

- Prefer logging that helps answer:
  - “What happened?”
  - “Which policy, which run, which user?”
- Avoid logging sensitive PII unnecessarily.
- Keep an eye toward future:
  - Golden replays (rerunning past deals).
  - Comparison of hashes before/after engine changes.

---

## 8. How to Hand Off Work

When an agent finishes a unit of work, the handoff should include:

1. **Summary of Changes**

   - What was changed and why.
   - Which sprint/slice in `docs/roadmap-v1-v2-v3.md` this maps to.

2. **Touched Files**

   - List of key files (code + migrations + tests).

3. **How to Run / Verify**

   - Exact commands:
     - `pnpm -w typecheck`
     - `pnpm -w test`
     - `pnpm -w build`
     - `npx playwright test` (if applicable).
   - Any special environment variables or Supabase config needed for the change.

4. **Known Limitations / TODOs**
   - Anything deliberately left out (e.g., edge cases, missing tests).
   - Suggestions for the next slice of work.

---

## 9. If in Doubt…

When in doubt, agents should:

- Default to **safety, determinism, and auditability**.
- Prefer:
  - Smaller, testable vertical slices over big bang refactors.
  - Schema and policies over ephemeral client logic.
- Make assumptions explicit:
  - Clearly state where you are guessing or inferring from incomplete information.
  - Offer multiple safe options instead of forcing a fragile path.

This manual should be treated as a **living operating agreement** between HPS DealEngine and any AI or automated system that touches the repo. Updates to this file should themselves be:

- Intentional,
- Documented,
- And aligned with the same principles of determinism, RLS, and auditability that define the rest of the platform.
