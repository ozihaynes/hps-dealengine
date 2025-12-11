---
doc_id: "ai.surfaces-audit"
category: "ai"
audience: ["ai-assistant", "engineer", "product", "underwriter", "exec"]
trust_tier: 1
summary: "Inventory of AI surfaces (legacy strategist/docs panels plus current dual-agent FAB + draggable windows), their context wiring, and backend calls."
---

# AI Surfaces Audit — HPS DealEngine

## 1) Sandbox Strategist Chat (/sandbox)
- **UI component:** `apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx` (nested `StrategistChat` + `FloatingStrategistChat`).
- **Route:** Rendered only on `apps/hps-dealengine/app/(app)/sandbox/page.tsx` (Business Logic tab).
- **Context passed:** `posture` (local state), full sandbox `settings` config; **no** dealId/runId/evidence.
- **Backend call:** `askSandboxStrategist` in `apps/hps-dealengine/lib/sandboxStrategist.ts`  Supabase invoke `v1-sandbox-strategist` with `{ prompt, posture, settings }`.
- **Prompt behavior (server):** `v1-sandbox-strategist/index.ts` (Supabase Edge) adds system guardrails (“only about sandbox settings; do not invent numbers; no market advice”), includes posture + full settings JSON; uses `gpt-4o-mini`; JWT required; no doc_id/trust_tier use.
- **Response shape:** `{ ok, markdown, provider, model }`; UI renders returned markdown-as-HTML chat bubbles.
- **Notes/gaps:** Not deal-aware and not connected to doc registry/trust tiers; focused only on sandbox knobs.

## 2) Strategist Panel — Dashboard (/overview -> /dashboard) & Trace (/trace)
- **UI component:** `apps/hps-dealengine/components/underwrite/StrategistPanel.tsx`.
- **Routes where visible:** 
  - `/overview` (dashboard alias) via `apps/hps-dealengine/app/(app)/overview/page.tsx`.
  - `/trace` via `apps/hps-dealengine/app/trace/page.tsx` (inside a card under the runs list).
- **Context built in UI:**
  - Props: `dealId`, `runId`, `posture`, optional `defaultPrompt`, `contextHint`, `evidenceSummary`.
  - `/overview`: `defaultPrompt` hardcoded (“Provide a negotiation-ready strategy…”); `contextHint` from `summarizeStrategistContext` (run outputs, sandbox knobs, evidence freshness, approved overrides); `dealId` from `DealSession`, `runId` = latest run, posture from session.
  - `/trace`: passes selected `dealId`/`runId`/`posture`; no `contextHint`; optional evidence attachments.
  - Props like `runOutput`, `runTrace`, `policySnapshot` are currently unused inside the component.
- **Backend call:** `fetchStrategistAnalysis` in `apps/hps-dealengine/lib/aiBridge.ts`  Supabase invoke `v1-ai-bridge` with `{ dealId, runId, posture, prompt }` (shape from `@hps-internal/contracts` AiBridgeInput).
- **Prompt/context behavior (server):** `supabase/functions/v1-ai-bridge` now supports modes `dealExplain`/`docsQna`. For strategist calls (no mode passed) it defaults to **dealExplain**, loads the run by dealId/runId under RLS, builds KPIs/trace highlights, selects doc chunks by category (domain/engine/app/dashboard/glossary) from `docs/ai/doc-registry.json`, and prompts with trust-tier guardrails (“prefer lower trust_tier, don’t invent numbers”). Model: `gpt-4o-mini`.
- **Response shape expected by UI:** `AiBridgeResult` with `analysis: { summary, strengths, risks, questions, nextActions }`. **Actual server response now:** JSON with `summary`, `key_numbers`, `guardrails`, `risk_and_evidence`, `recommendations`, `sources`. UI renders only `summary`, so fields diverge.
- **Docs/trust usage:** Only on the Edge function side (doc chunk loader + trust tiers); UI does not surface doc_ids or trust tiers.

## 3) Underwrite Strategist Panel (not currently rendered)
- **UI component:** `apps/hps-dealengine/components/underwrite/UnderwriteStrategistPanel.tsx`.
- **Route usage:** Not imported in `/underwrite` today (idle component). Same `fetchStrategistAnalysis` backend call/contract as StrategistPanel but renders sections for strengths/risks/questions/nextActions.
- **Context:** Expects `dealId`, `runId`, `posture`; shows “Strategist disabled” flag by default; no doc-aware behavior client-side.

## 4) Other AI hooks / tooling
- **AI Bridge Debug:** `apps/hps-dealengine/app/ai-bridge/debug/page.tsx` posts `{ prompt }` to `v1-ai-bridge` via Supabase browser client; no deal/run context; uses caller JWT; no docs/trust handling in UI.
- **Doc registry/loader libs:** `apps/hps-dealengine/lib/ai/docRegistry.ts` and `docLoader.ts` ingest `docs/ai/doc-registry.json` but are not yet wired into UI surfaces.

## 5) Gaps vs Target Behavior
- No dedicated “Docs Assistant” UI on `/sandbox` or elsewhere; no component consuming doc_id/trust_tier metadata client-side.
- StrategistPanel UI still expects legacy `AiBridgeResult` shape and only renders summary; server now returns doc-sourced fields and sources array, so sources are dropped and fields may mismatch.
- Frontend does not pass route/persona or select doc categories; doc/trust handling lives only in the Edge function.
- Sandbox Strategist chat is settings-only, not deal-aware, and ignores doc registry/trust tiers.
- AI Bridge debug page bypasses doc/trust tiers and run context entirely.

## 6) Recommendations for Block B
- Refactor StrategistPanel/aiBridge client to align with `v1-ai-bridge` modes (`dealExplain`, `docsQna`), surface `sources` and guardrails, and render structured sections.
- Add a true Docs Assistant surface (likely `/dashboard` or global) that uses doc registry + trust tiers and supports docsQna mode with route context.
- Decide whether to retire or update `/ai-bridge/debug` to use the same doc-aware prompting or clearly mark it as dev-only.
- Consider wiring `docRegistry`/`docLoader` helpers (app-side) for client-side doc selection hints and telemetry.

## After Block A (Dual-Agent refresh)
- Embedded AI cards removed from `/dashboard`, `/underwrite`, `/trace`, and top nav; access is via global FAB launcher.
- Personas are explicit: Deal Analyst (per-run) and Deal Strategist (docs/policy/system). Each uses `v1-ai-bridge` with persona routing.
- Docs Assistant tab in sandbox/nav deprecated; Strategist persona handles docs via trust-tiered registry.
- Doc registry loader remains server-only; AI bridge selects sources via doc_ids + trust_tiers.
- Global FAB launcher mounts `react-rnd` windows (Analyst/Strategist) via `AiWindowsProvider`, with per-session titles/pins/history/tone and localStorage persistence; windows are modeless (no backdrop).
