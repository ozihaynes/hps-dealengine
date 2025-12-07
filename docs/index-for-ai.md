---
doc_id: "ai.index-for-ai"
category: "ai"
audience: ["ai-assistant", "engineer", "product", "underwriter", "exec"]
trust_tier: 1
summary: "Entry point and sitemap for DealEngine docs with priority rules and boot sequence for AI assistants and humans."
---

# Documentation Index for AI & Humans — HPS DealEngine

This is the entry point for AI assistants and humans navigating DealEngine docs. Use it to find the right source fast and prefer lower `trust_tier` numbers when information conflicts.

## Product
- `product.vision-and-positioning` — Vision, positioning, scope boundaries, and differentiation.
- `product.personas-and-use-cases` — Personas, jobs-to-be-done, metrics, and workflows.
- `product.end-to-end-deal-lifecycle` — Lead → deal → runs → IC → close/post-mortem mapped to routes, tables, and edges.

## Domain (Underwriting Policy)
- `domain.wholesale-underwriting-handbook` — Primary wholesale underwriting manual (Tier 0: spreads, floors/ceilings, MAO, exits).
- `domain.risk-gates-and-compliance` — Risk/compliance gates and evidence expectations (Tier 0 placeholder).
- `domain.timeline-and-carry-policy` — DTM/urgency bands, carry costs, and timeline constraints (Tier 0).
- `domain.repairs-and-contingency-model` — Repairs policy: PSF/Big5/line items and contingency rules (Tier 0).
- `domain.market-temp-methodology` — Market Temp inputs/bands and impact on carry, margins, exits (Tier 0).

## Engine & Contracts
- `engine.architecture-overview` — System map: Next.js app, Edge Functions, engine package, RLS/determinism.
- `engine.analyze-contracts` — AnalyzeInput/AnalyzeOutput/trace envelope and hashing.
- `engine.trace-anatomy` — Trace frame codes and semantics for explainability.
- `engine.knobs-and-sandbox-mapping` — Placeholder mapping of sandbox/posture knobs to engine/UI behavior.

## App & KPIs
- `app.routes-overview` — Placeholder matrix of routes, personas, guards, and data dependencies.
- `app.overview-layout-map` — `/dashboard` layout regions and KPIs/cards.
- `app.underwrite-flow` — How to run Analyze and reach ReadyForOffer in `/underwrite`.
- `app.repairs-flow` — Repairs tab flow (QuickEstimate → Big5 → line items) and evidence expectations.
- `dashboard.kpi-inventory` — KPI formulas/sources/placement for Dashboard.
- `dashboard.kpi-stories` — Narrative meaning and actions for each KPI group.

## Glossary
- `glossary.terms` — Canonical definitions for core DealEngine terms.
- `glossary.concepts-by-page` — Maps UI labels/components to glossary keys and source docs.

## Examples & Playbooks
- `examples.deal-scenarios` — Six end-to-end scenarios (clean, tight, risk kills, auction, evidence-light, condo SIRS).
- `playbooks.negotiation-playbook-templates` — Offer/counter/risk/walk-away scripts tied to guardrails.
- `playbooks.user-faq` — Operational Q&A mapped to routes, KPIs, and gates.

## AI Governance
- `ai.assistant-behavior-guide` — System prompt: identity, allowed/forbidden behavior, source hierarchy, audit posture.
- `ai.prompting-patterns` — Canonical patterns (deal explain, run diff, seller questions, risk gaps, IC prep, evidence gaps).
- `ai.data-sources-and-trust-tiers` — Source hierarchy and usage rules for AI (Tiers 0–3, including external data guidance).
- `ai.ceo-assumptions-by-doc` — CEO assumptions baked into docs and when to override.
- `ai.doc-metadata-schema` — Frontmatter schema used across docs for routing and trust tiers.

## Ops
- `ops.error-conditions` — Error taxonomy and support runbooks (auth, edge functions, RLS, evidence uploads, outages).
- `ops.data-integrity-and-validation` — Validation layers, sharp edges, and SOPs for repairing bad data safely.

## Start Here (AI Boot Notes)
- Read `AGENTS.md`, `docs/primer-hps-dealengine.md`, and `docs/roadmap-v1-v2-v3.md` first.
- For math or behavior questions: start with Domain + Engine docs (Tier 0/1) and the latest run/trace.
- For UX/KPIs: use App & KPIs + Glossary.
- For negotiation/strategy copy: use Examples & Playbooks plus KPI stories.
- For AI behavior: follow AI Governance and trust tiers; cite sources and avoid new math.
