# QA Environment for V1 E2E (Deterministic, Local-Only)

This runbook seeds the QA fixtures into the **local Supabase** started by `supabase start`, writes a local `.env.qa`, and loads the variables so every QA Playwright spec runs without skipping.

## One-Command Setup (clean + seed)

1) Start Supabase (if not already running)
   ```powershell
   supabase start
   ```
2) Reset the local DB to the repo migrations
   ```powershell
   supabase db reset
   ```
3) Seed deterministic QA fixtures (org, user, deals, runs, env)
   ```powershell
   pnpm -w exec tsx scripts/seed-qa.ts
   ```
   - Uses `supabase status -o env` to read the local URL/keys
   - Seeds org `ed6ae332-2d15-44be-a8fb-36005522ad60`
   - QA user: `qa@hps.test.local` (password in `.env.qa`)
   - Seeds 4 deals + runs: READY, TIMELINE, STALE_EVIDENCE, HARD_GATE
   - Writes `.env.qa` (gitignored) with all required QA env vars
4) Load the QA env into your shell
   ```powershell
   . .\scripts\qa-env.ps1
   ```

## Run QA Playwright Suites (no skips)
With `.env.qa` loaded:
```powershell
pnpm -w test:qa      # QA-focused Playwright (PLAYWRIGHT_ENABLE=true)
pnpm -w test:e2e     # Full e2e suite; will also use loaded env
```

## Required Environment Variables (written by `seed-qa.ts`)
- Core auth / API
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `DEALENGINE_QA_API_URL`
  - `DEALENGINE_QA_ORG_ID`
  - `DEALENGINE_QA_POSTURE`
  - `PLAYWRIGHT_ENABLE=true`
- QA user
  - `DEALENGINE_QA_USER_EMAIL`
  - `DEALENGINE_QA_USER_PASSWORD`
- Deals
  - `DEALENGINE_QA_READY_DEAL_ID`
  - `DEALENGINE_QA_READY_CLIENT_NAME`
  - `DEALENGINE_QA_TIMELINE_DEAL_ID`
  - `DEALENGINE_QA_TIMELINE_DTM_DAYS`
  - `DEALENGINE_QA_TIMELINE_CARRY_MONTHS`
  - `DEALENGINE_QA_TIMELINE_SPEED_BAND`
  - `DEALENGINE_QA_STALE_EVIDENCE_DEAL_ID`
  - `DEALENGINE_QA_HARD_GATE_DEAL_ID`
- v1-analyze (borderline expectations)
  - `DEALENGINE_QA_BORDERLINE_MIN_SPREAD`
  - `DEALENGINE_QA_BORDERLINE_SPREAD_CASH`
  - `DEALENGINE_QA_BORDERLINE_AIV`
  - `DEALENGINE_QA_BORDERLINE_ARV`
  - `DEALENGINE_QA_BORDERLINE_DOM`
  - `DEALENGINE_QA_BORDERLINE_PAYOFF`
  - `DEALENGINE_QA_BORDERLINE_FLAG`

### Notes
- `.env.qa` is **gitignored**; never commit it.
- The seed script uses the **service role** only for seeding; no service_role is used in user flows.
- No secrets are printed to stdout; only variable names and seeded IDs are echoed.
- If you change seeded values, re-run steps 2-4 to refresh both DB and `.env.qa`.
