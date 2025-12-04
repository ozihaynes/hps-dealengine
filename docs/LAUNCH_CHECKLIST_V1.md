# HPS DealEngine — Launch Checklist (v1)

Use this checklist before any production deploy. Keep to RLS-first, deterministic, and audit-friendly behaviors.

## 1. Environment & Config
- Confirm production env vars are set (Supabase URL/anon key, auth keys, OpenAI if enabled, Next runtime config).
- Verify no `service_role` keys ship to the browser or client bundles (anon key only).
- Ensure `NODE_ENV=production` in the deployed environment.

## 2. Database & RLS
- Run `supabase db push` (or your deploy process) and confirm all migrations are applied.
- Confirm RLS is enabled on all tenant tables (organizations, memberships, deals, runs, repair_rate_sets, policy_versions, evidence, sandbox_settings, sandbox_presets, policy_overrides, etc.).
- Manually verify with two orgs/users:
  - Org A never sees Org B deals/runs/evidence/sandbox/overrides.
  - Role-based behavior (analyst vs manager/owner/VP) matches expectations in Underwrite and Settings.
- Confirm runs constraints exist: `runs_deal_id_not_null` and `runs_deal_id_fkey` enforce `deal_id` on new rows.

## 3. CI & Tests
- From repo root run: `scripts/local-ci.ps1` (runs pnpm -w typecheck, pnpm -w test, pnpm -w build).
- With Playwright enabled and test user env set, run:
  - `PLAYWRIGHT_ENABLE=1`
  - `DEALENGINE_TEST_USER_EMAIL=<qa email>`
  - `DEALENGINE_TEST_USER_PASSWORD=<qa password>`
  - `scripts/local-ci.ps1`
- Confirm the Playwright golden-path test passes (login → startup → run new deal → overview).

## 4. Manual App Sanity
- Login as a real user in the target env.
- `/startup` → Run New Deal:
  - New deal appears in `/deals`.
  - Client/contact info shows on `/overview`.
- `/underwrite`:
  - Run analyze, save run; Trace shows the run; evidence upload hooks work; overrides behave with roles.
- `/repairs`:
  - Active repairs profile for org/market/posture loads (no fallback banner).
  - Big 5 and estimator use live rates.
- `/sandbox`:
  - Sandbox knobs save; presets apply; Strategist remains advisory-only.
- `/trace`:
  - Trace history, overrides, and evidence render for the latest run.

## 5. Error Handling & UX
- Visit a bad route and confirm the not-found page appears (no stack traces).
- Trigger a safe error and confirm the error boundary shows a friendly recovery CTA.
- Confirm unsaved-change prompts fire on Underwrite/Repairs/Sandbox when leaving with edits.

## 6. Deployment
- Document hosting target (e.g., Vercel) and how env vars are wired there.
- Note exact commands/pipeline used to build and deploy the app.
