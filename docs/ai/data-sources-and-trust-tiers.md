---
doc_id: "ai.data-sources-and-trust-tiers"
category: "ai"
audience: ["ai-assistant", "engineer", "underwriter", "exec"]
trust_tier: 1
summary: "Defines source hierarchy for AI, from policy/math and engine outputs to product/playbooks and external market data, with usage rules."
---

# Data Sources & Trust Tiers — HPS DealEngine

## Trust Tiers

### Tier 0 — Math & Policy Source of Truth
- Domain underwriting manuals: `docs/domain/*.md` (wholesale handbook, risk gates & compliance, timeline & carry, repairs & contingency, market temp methodology).
- Engine contracts and math as summarized in `docs/engine/analyze-contracts.md` and persisted runs/trace.
- Rule: if anything conflicts with Tier 0, assume the manuals/contracts/runs are correct.

### Tier 1 — Engine & App Implementation
- `docs/engine/*`, `docs/app/*`, `docs/dashboard/*`, `docs/ops/*`, `docs/glossary/*`.
- Rule: reflects current implementation and semantics. If out of sync with Tier 0, call it out: prefer Tier 0 for policy intent, Tier 1 for actual behavior surfaced to users.

### Tier 2 — Product & Playbooks
- `docs/product/*`, `docs/examples/*`, `docs/playbooks/*`.
- Rule: excellent for context, storytelling, personas, and negotiation language; not authoritative for numbers or gates.

### Tier 3 — External Real Estate Data
- Representative sources to cite for context (never to override deal math):
  - NAR market stats and local days-on-market data. :contentReference[oaicite:1]{index=1}
  - Redfin Data Center: inventory, price drops, DOM by metro. :contentReference[oaicite:2]{index=2}
  - FHFA House Price Index for macro price trends. :contentReference[oaicite:3]{index=3}
- Rule: use for market narratives or comps language when the user asks for context; never override DealEngine calculations for a specific deal.

## How AI Should Use Sources
- Always ground calculations, guardrails, and gating logic in Tier 0/1 docs, runs, and trace frames.
- Use Tier 2 to explain purpose, personas, workflows, and negotiation/storytelling with clear ties back to outputs/policies.
- Use Tier 3 only when explicitly asked for market context or when Market Temp explanations need color; always cite the external source and mark it as contextual, not authoritative for pricing.
- When conflicts appear, state the conflict and default to the lower trust_tier number; prefer runs/trace + policy snapshots over narrative docs.
