# Deploying v1-ai-bridge (Production Checklist)

Audience: Operator running in `C:\Users\oziha\Documents\hps-dealengine` with Supabase + Edge Functions already set up. No secrets are committed to git.

## 1) Env Vars (names only; set outside the repo)
- Next.js client:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- AI bridge / server-side:
  - `OPENAI_API_KEY`
- Supabase (already in use):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

## 2) Local dev setup (.env.local in repo root; ignored by git)
Create or edit `.env.local` (do not commit) with placeholders like:
```
NEXT_PUBLIC_SUPABASE_URL=    # set locally, do not commit
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # set locally, do not commit
SUPABASE_URL=    # set locally, do not commit
SUPABASE_ANON_KEY=    # set locally, do not commit
OPENAI_API_KEY=    # set locally, do not commit
```

## 3) Supabase / Edge deployment (v1-ai-bridge)
From repo root:
```
Set-Location "C:\Users\oziha\Documents\hps-dealengine"
supabase functions deploy v1-ai-bridge
```
Notes:
- Set `OPENAI_API_KEY` as a Supabase secret/config; never in git.
- `v1-ai-bridge` uses `verify_jwt` via the anon client and respects RLS; caller JWT must be present.

## 4) Test / tripwire checklist
- Core gates:
  - `pnpm -w typecheck`
  - `pnpm -w build`
- Playwright (only if Strategist UI changed visually and snapshots need refresh):
  - Run: `npx playwright test`
  - To update snapshots intentionally: `npx playwright test --update-snapshots`

At the end of the slice, the above commands should be clean (and snapshots updated only if intentionally refreshed).
