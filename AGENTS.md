## ⚠️ MANDATORY: Skills Library (READ FIRST)

Before starting ANY task, you MUST:
1. Read and digest `.claude/rules/SKILLS-LIBRARY.md`
2. Identify which skills are relevant to the current task
3. Apply the relevant skill workflows and best practices

This is non-negotiable. The Skills Library defines HOW you work on this codebase.

Reference: @.claude/rules/SKILLS-LIBRARY.md

---

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

**Assumption:** Any agent working in this repo has these in working memory and is aligning all suggestions and edits to them.

### 1.1 Documentation Router & Trust Tier Rule

After loading the mandatory docs above, use these as the “doc router” for deeper context:

- `docs/index-for-ai.md` — sitemap for where to look next.
- `docs/ai/doc-registry.json` — structured list of docs (path, summary, trust tier).
- `docs/ai/doc-metadata-schema.md` — definition of doc frontmatter fields (including `trust_tier`).
- `docs/ai/data-sources-and-trust-tiers.md` — how to reason about data reliability.

#### Trust tier rule (when sources conflict)

- Many docs declare `trust_tier` (0 = strongest).
- When sources conflict:
  1. Prefer the lower-numbered `trust_tier` doc (0 beats 1, etc).
  2. Call out the conflict explicitly in your response.
  3. If the conflict affects implementation choices, stop and ask the owner to decide before shipping.

### 1.2 Owner Interaction Contract (Hard Requirements)

The repo owner is a non-technical operator and executes work via **Codex** and/or **PowerShell + Supabase SQL editor**.

When giving instructions or delivering changes:

- **Windows-first**: Provide copy/paste-ready **PowerShell** commands (not bash).
- **Explicit file paths**: Always name the exact file path(s) you are creating or replacing.
- **PowerShell & SQL blocks**:
  - Shell steps go in a single PowerShell code block.
  - Database steps go in a single SQL code block.
  - Always specify _where_ each block runs (repo root vs Supabase SQL editor).
- **Zero-Placeholder Rule**:
  - Never output fake IDs, fake secrets, `<INSERT_...>`, “TBD”, or “you can fill this in”.
  - If something is missing, request it and provide the exact command/query to obtain it.
- **Full-File Delivery Only (Strict)**:
  - If the owner must paste code, output the **entire file**.
  - **FORBIDDEN:** Do not use `// ... existing code ...` or `// ... rest of file ...`.
  - **REQUIRED:** You must print every line of code so the owner can use "Select All -> Paste".
- **Single-step execution**:
  - Provide **one** command, **one** SQL query, or **one** Codex task at a time.
  - Wait for the resulting output/logs/diffs before proposing the next step.
- **Avoid UI scavenger hunts**:
  - Do not say “click around the UI”.
  - Only use UI navigation instructions if CLI/SQL/Codex is impossible.
- **Green Check gate**:
  - Do not recommend commit/push/deploy until the owner confirms typecheck/test/build are green.

### 1.3 Division of Labor (Planner ↔ Executor ↔ Owner)

- **ChatGPT (Planner/Architect/PM)**:
  - Designs the vertical slice, defines acceptance criteria, and produces Codex-ready tasks.
- **Codex (Executor)**:
  - Implements changes, runs commands/tests, and reports concrete evidence (diffs/logs).
- **Owner (Operator/Approver)**:
  - Runs local commands when needed, reviews diffs, and approves deploys.

Default flow:
Plan → Codex Execution Block → Evidence → Next single step.

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

#### 4.2.1 Codex Execution Block (Preferred Delivery Format)

For any change that touches multiple files, requires commands, or is non-trivial, provide a paste-ready block formatted like this:

```text
[Codex Execution Block]
TASK: <one-line>
GOAL: <what "done" means>

CONTEXT:
- <relevant doc/slice references>
- <constraints: RLS-first, determinism, audit trail>

SCOPE:
- In-scope:
- Out-of-scope:

FILES TO TOUCH:
- <path>
- <path>

STEPS:
1) <edit/create...>
2) <run...>
3) <verify...>

COMMANDS (PowerShell):
- <one block, copy/paste-ready>

ACCEPTANCE CRITERIA:
- [ ] <objective condition>
- [ ] <tests green>

REPORT BACK WITH:
- Command output (typecheck/test/build)
- Any failing logs + stack traces
- List of files changed
[/Codex Execution Block]
```
