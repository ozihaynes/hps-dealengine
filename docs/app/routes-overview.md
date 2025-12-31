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
- `DealSessionProvider` (apps/hps-dealengine/app/layout.tsx) provides deal, sandbox, posture, and lastAnalyzeResult state to the app.
- `AuthGate` (apps/hps-dealengine/components/AuthGate.tsx) protects all routes under `apps/hps-dealengine/app/(app)` by redirecting to `/login?redirectTo=...` when no Supabase session exists.
- `DealGuard` (apps/hps-dealengine/app/(app)/layout.tsx) enforces an active deal for `/overview`, `/underwrite`, `/repairs`, `/trace`, `/runs`, and `/sources` by redirecting to `/startup` when no deal is selected.
- `middleware.ts` is pass-through; auth is enforced client-side.

Route matrix (current pages):

| Route | Page File | Require Auth | Require Deal | Primary Data Sources |
| --- | --- | --- | --- | --- |
| / | apps/hps-dealengine/app/page.tsx | No | No | Redirects to /login |
| /login | apps/hps-dealengine/app/login/page.tsx | No | No | Supabase auth via LoginClient + redirectTo |
| /logout | apps/hps-dealengine/app/logout/page.tsx | No | No | Supabase auth signOut |
| /startup | apps/hps-dealengine/app/startup/page.tsx | No | No | StartupPage (auth/deal entry) |
| /overview | apps/hps-dealengine/app/(app)/overview/page.tsx | Yes | Yes | DealSessionContext (deal + sandbox + posture + lastAnalyzeResult), run outputs/trace, Supabase deal contracts |
| /underwrite | apps/hps-dealengine/app/(app)/underwrite/page.tsx | Yes | Yes | DealSessionContext (deal + sandbox + posture + lastAnalyzeResult), repairRates, v1-analyze output + trace |
| /repairs | apps/hps-dealengine/app/(app)/repairs/page.tsx | Yes | Yes | DealSessionContext (repairRates + deal inputs) |
| /trace | apps/hps-dealengine/app/(app)/trace/page.tsx | Yes | Yes | DealSessionContext (lastAnalyzeResult + lastRunId), Supabase runs table |
| /sandbox | apps/hps-dealengine/app/(app)/sandbox/page.tsx | Yes | No | Supabase sandbox settings/presets + DealSessionContext membershipRole |
| /deals | apps/hps-dealengine/app/(app)/deals/page.tsx | Yes | No | Supabase deals table + DealSessionContext setters |
| /runs | apps/hps-dealengine/app/(app)/runs/page.tsx | Yes | Yes | Supabase runs table + DealSessionContext (dbDeal, posture) |
| /runs/[id] | apps/hps-dealengine/app/(app)/runs/[id]/page.tsx | Yes | Yes | Supabase runs table (single run by id) |
| /sources | apps/hps-dealengine/app/(app)/sources/page.tsx | Yes | Yes | Static placeholder copy (no data fetch) |
| /settings | apps/hps-dealengine/app/(app)/settings/page.tsx | Yes | No | Static settings hub (links) |
| /settings/sandbox | apps/hps-dealengine/app/(app)/settings/sandbox/page.tsx | Yes | No | Redirects to /sandbox |
| /settings/overrides | apps/hps-dealengine/app/(app)/settings/overrides/page.tsx | Yes | No | Supabase policy_overrides + DealSessionContext membershipRole |
| /settings/policy-overrides | apps/hps-dealengine/app/(app)/settings/policy-overrides/page.tsx | Yes | No | Supabase policy_overrides (pending) + membershipRole |
| /settings/user | apps/hps-dealengine/app/(app)/settings/user/page.tsx | Yes | No | Supabase user_settings via fetchUserSettings + theme tokens |
| /settings/policy | apps/hps-dealengine/app/settings/policy/page.tsx | Yes (page-level check) | No | Supabase auth session (getUser); placeholder UI |
| /settings/policy-versions | apps/hps-dealengine/app/settings/policy-versions/page.tsx | Yes (page-level check) | No | Supabase policy_versions_api |
| /offer-packages/[id] | apps/hps-dealengine/app/(app)/offer-packages/[id]/page.tsx | Yes | No | Supabase offer_packages via fetchOfferPackageById |
| /admin/valuation-qa | apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx | Yes | No | Supabase valuation_* tables + v1-valuation-* functions |
| /ai-bridge/debug | apps/hps-dealengine/app/ai-bridge/debug/page.tsx | No | No | Supabase functions v1-ai-bridge (dev console) |
| /debug/ping | apps/hps-dealengine/app/debug/ping/page.tsx | No (UI loads without AuthGate) | No | Supabase auth session + v1-ping function |
| /debug/ping/policy | apps/hps-dealengine/app/debug/ping/policy/page.tsx | No (UI loads without AuthGate) | No | Supabase function v1-policy |
