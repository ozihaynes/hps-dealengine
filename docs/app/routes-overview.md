---
doc_id: "app.routes-overview"
category: "app"
audience: ["ai-assistant", "engineer", "product", "underwriter"]
trust_tier: 1
summary: "Intended map of primary routes, personas, and guards across Dashboard, Underwrite, Repairs, Trace, Sandbox, Deals, Runs, and Settings."
---

# App Routes Overview — HPS DealEngine

This document reflects the current Next.js App Router wiring. Guards are client-side and defined in `apps/hps-dealengine/app/(app)/layout.tsx`, with shared session state provided at the root layout.

Route guards and session context:
- `DealSessionProvider` (`apps/hps-dealengine/app/layout.tsx`) provides deal session state (deal, sandbox, posture, lastAnalyzeResult, repairRates).
- `AuthGate` (`apps/hps-dealengine/components/AuthGate.tsx`) wraps `apps/hps-dealengine/app/(app)` and redirects to `/login?redirectTo=...` when no Supabase session exists.
- `DealGuard` (`apps/hps-dealengine/app/(app)/layout.tsx`) requires an active deal for `/overview`, `/underwrite`, `/repairs`, `/trace`, `/runs`, and `/sources` (redirects to `/startup` when missing).
- `middleware.ts` is pass-through; auth is enforced client-side.

Route matrix (current pages):

| Route | Page File | Require Auth | Require Deal | Primary Data Sources |
| --- | --- | --- | --- | --- |
| / | apps/hps-dealengine/app/page.tsx | No | No | Next.js redirect to `/login` |
| /login | apps/hps-dealengine/app/login/page.tsx | No | No | LoginForm (Supabase auth sign-in/sign-up) |
| /logout | apps/hps-dealengine/app/logout/page.tsx | No | No | `supabase.auth.signOut` + auth cookie clear |
| /startup | apps/hps-dealengine/app/startup/page.tsx | No | No | StartupPage component |
| /overview | apps/hps-dealengine/app/(app)/overview/page.tsx | Yes (AuthGate) | Yes (DealGuard) | DealSessionContext + lastAnalyzeResult outputs/trace + deal contracts + offer packages |
| /underwrite | apps/hps-dealengine/app/(app)/underwrite/page.tsx | Yes (AuthGate) | Yes (DealGuard) | DealSessionContext + v1-analyze/saveRun + evidence + valuation + policy overrides |
| /repairs | apps/hps-dealengine/app/(app)/repairs/page.tsx | Yes (AuthGate) | Yes (DealGuard) | DealSessionContext + repairRates + repairs estimator |
| /trace | apps/hps-dealengine/app/(app)/trace/page.tsx | Yes (AuthGate) | Yes (DealGuard) | Supabase runs + evidence + policy overrides + DealSessionContext |
| /sandbox | apps/hps-dealengine/app/(app)/sandbox/page.tsx | Yes (AuthGate) | No | Supabase sandbox settings + presets |
| /deals | apps/hps-dealengine/app/(app)/deals/page.tsx | Yes (AuthGate) | No | Supabase deals + createDeal + DealSessionContext setters |
| /runs | apps/hps-dealengine/app/(app)/runs/page.tsx | Yes (AuthGate) | Yes (DealGuard) | Supabase runs + working_state + DealSessionContext setters |
| /runs/[id] | apps/hps-dealengine/app/(app)/runs/[id]/page.tsx | Yes (AuthGate) | Yes (DealGuard) | Supabase runs (single run + policy_snapshot) |
| /sources | apps/hps-dealengine/app/(app)/sources/page.tsx | Yes (AuthGate) | Yes (DealGuard) | Static placeholder (no data fetch) |
| /settings | apps/hps-dealengine/app/(app)/settings/page.tsx | Yes (AuthGate) | No | Static settings hub (links) |
| /settings/sandbox | apps/hps-dealengine/app/(app)/settings/sandbox/page.tsx | Yes (AuthGate) | No | Client redirect to `/sandbox` |
| /settings/overrides | apps/hps-dealengine/app/(app)/settings/overrides/page.tsx | Yes (AuthGate) | No | Supabase policy overrides + approvals |
| /settings/policy-overrides | apps/hps-dealengine/app/(app)/settings/policy-overrides/page.tsx | Yes (AuthGate) | No | Supabase policy_overrides (pending) + approvals |
| /settings/user | apps/hps-dealengine/app/(app)/settings/user/page.tsx | Yes (AuthGate) | No | Supabase user_settings + local-only profile/team |
| /settings/policy | apps/hps-dealengine/app/settings/policy/page.tsx | Yes (page-level check) | No | Supabase auth session check; placeholder UI |
| /settings/policy-versions | apps/hps-dealengine/app/settings/policy-versions/page.tsx | Yes (page-level session or dev auto-login) | No | Supabase policy_versions_api |
| /offer-packages/[id] | apps/hps-dealengine/app/(app)/offer-packages/[id]/page.tsx | Yes (AuthGate) | No | Supabase offer_packages (fetchOfferPackageById) |
| /admin/valuation-qa | apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx | Yes (AuthGate) | No | Supabase valuation_* tables + v1-valuation-* functions + evidence uploads |
| /ai-bridge/debug | apps/hps-dealengine/app/ai-bridge/debug/page.tsx | No | No | Supabase functions v1-ai-bridge (anon client) |
| /debug/ping | apps/hps-dealengine/app/debug/ping/page.tsx | No (UI loads without AuthGate) | No | Supabase session + v1-ping function |
| /debug/ping/policy | apps/hps-dealengine/app/debug/ping/policy/page.tsx | No (UI loads without AuthGate) | No | Supabase function v1-policy (JWT required) |
