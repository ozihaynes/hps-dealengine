---
doc_id: "product.vision-and-positioning"
category: "product"
audience: ["ai-assistant", "exec", "product"]
trust_tier: 2
summary: "Defines HPS DealEngine's product vision, positioning, scope boundaries, and differentiation for investor/wholesaler operators."
---

# HPS DealEngine — Vision & Positioning

## Purpose & Audience
- Canonical definition of what DealEngine is (and is not) for founders, ICs/underwriters, acquisitions/dispo, compliance/ops, lenders/capital partners, strategic partners, and AI agents.
- Anchors v1 scope to deterministic underwriting for distressed SFR/townhomes in Central Florida while showing how v2/v3 extend to connectors, strategy packs, AVM, CRM, and billing.
- Sets guardrails so every slice remains policy-driven, auditable, RLS-first, and reproducible.

## Product Definition
- **Product statement:** Policy-driven, deterministic underwriting OS for distressed SFR/townhomes (initially Central Florida), delivered as a multi-tenant, RLS-first SaaS on Next.js + Supabase with the engine as the single source of truth for numbers and trace.
- **What it is not:** Not a CRM, dialer, marketing stack, or spreadsheet replacement; no browser-only math; no “push button, get offer” without human review.
- **Multi-tenant model:** Organizations + memberships enforce access; deals + runs are the durable audit spine with hashes and policy snapshots.
- **In-scope v1 assets:** SFRs and townhomes; condos/HOA units allowed with explicit insurability/HOA caveats documented in policies and traces.
- **Out-of-scope v1:** Large multifamily, land, commercial, heavy construction rehabs; full CRM/dialer/marketing automation; legal/tax advice; automated offers without review.

## Target Users & Buyer Segments

| Role | Top jobs to be done | Key fears | Metrics that matter |
| --- | --- | --- | --- |
| Solo wholesaler / small operator | Get to defensible MAO + negotiation plan in \<15 minutes; prove spreads to buyers/capital; avoid rework | Overpaying, missing risk gates, losing credibility | Spread vs target, assignment fee, DTM, win/loss |
| Acquisitions reps & team leads | Qualify leads fast; know when to walk; present risk & guardrails clearly | Bidding blind, missing title/insurance blockers, wasting calls | Time-to-decision, guardrail adherence %, conversion |
| Underwriters / analysts / VAs | Normalize inputs, run deterministic engine, document evidence gaps | Stale comps, hidden overrides, math drift across runs | % runs with complete evidence, hash stability, replay pass rate |
| Disposition / transactions managers | Package offers with trace; align buyer asks to floor/ceiling; surface blockers early | Surprises at closing, seasoning/HOA misses, failed binds | Carry days, fallout rate, clearance of hard gates |
| Team leads / owners | Enforce policy, audit runs, approve overrides, control posture | Governance gaps, policy sprawl, untraceable overrides | Policy compliance %, override approval latency, margin consistency |
| JV / capital partners (light access) | Validate deal quality and risk posture quickly | Thin evidence, opaque assumptions, off-policy pricing | Spread vs underwriting, risk grade, evidence completeness |
| Secondary: compliance/ops, lenders/partners, IC reviewers | Consume outputs and traces with minimal back-and-forth | Non-auditable decisions, missing artifacts | Audit completeness, exception volume, SLA on clarifications |

## Market Problem & Current State (“Before”)
- Status quo: spreadsheets and basic MAO rules (“MAO = ARV × 70% − repairs − fee”), ad-hoc calculators, and ungoverned CRMs/MLS exports with no RLS or trace.
- Fragmented stack: CRM + dialer + MLS portals + title email threads + calculators → inconsistent offers and weak feedback loops.
- No audit trail: numbers cannot be replayed; policies live in heads or sheets; evidence freshness is opaque.
- Consequences: inconsistent deal selection, missed risk gates/compliance blind spots, buyer/capital distrust, and slow post-mortems.

## Positioning vs Alternatives & Differentiation
- **Spreadsheets/one-offs:** DealEngine is engine-first; all math and policy live in shared engine + Edge Functions with hashes, not in tabs.
- **Generic investor CRMs/“all-in-one” stacks (PropStream, REsimpli, Flipster, etc.):** DealEngine is policy-driven and RLS-first; it refuses service-role shortcuts and documents every run, gate, and evidence decision.
- **Manual portal/MLS underwriting:** DealEngine is explainable and deterministic: same inputs + policy snapshot ⇒ same outputs/trace; trace frames replace opaque formulas.
- **Differentiators:** policy tokens over magic numbers; org-scoped RLS on every table; audit logs on critical changes; AI is strategist-only and grounded in engine outputs/policies/evidence.

## Core Product Promises & Non-Negotiable Principles

| Principle | What it means in DealEngine |
| --- | --- |
| Determinism | Same deal + policy snapshot ⇒ bit-identical outputs; enforced via runs table + input/policy/output hashes. |
| Explainability | Every decision backed by trace frames, policy tokens, and evidence freshness; no silent overrides. |
| Governance & guardrails | Policy-driven knobs, risk gates, and governed overrides; hashes prevent shadow math. |
| RLS + audit | Engine/DB are the source of truth; strict org-scoped RLS; audit_logs on critical tables; no service_role in user flows. |
| Vertical slices | UI → Edge Function → DB → trace/audit only; no UI-only business rules. |
| AI posture | AI is analyst/strategist; uses engine outputs + policies; never recomputes math or invents numbers. |
| Safety & speed | Risk gates, DTM/carry rules, and timeline buffers prevent “winning the wrong deals” while preserving fast first-pass underwriting. |

## Scope Boundaries & Future Phases
- **v1 (now):** Deterministic engine + policies/sandbox, runs + hashes/trace, dashboard KPIs, evidence freshness and risk gates, governed overrides, deal/session shell.
- **Future themes (roadmap-aligned, not commitments):**
  - v2: Connectors (MLS, county, FEMA, tax, insurance), strategy packs, multi-posture comparison, posture-aware dashboards.
  - v3: AVM integrations, CRM/billing, deeper disposition/buyer-matching, observability (golden replays, telemetry).
- **Decision rule:** If a feature request touches connectors, CRM, billing, or automated offers without review, keep it out of v1 and route to roadmap evaluation with policy impact documented.

## Product-Level Success Metrics
- Lead-to-decision-ready time (minutes from intake to saved run with trace).
- % of deals with complete evidence at decision time (per policy freshness windows).
- % of offers inside policy guardrails (spread, risk gates, DTM/urgency).
- Reduction in post-close surprises (title/insurance/payoff deltas vs projected).
- Rep-to-rep consistency on spreads/risk decisions within an org (hash/replay variance, override volume).

## Related Docs
- `docs/product/personas-and-use-cases.md`
- `docs/product/end-to-end-deal-lifecycle.md`
- `docs/domain/wholesale-underwriting-handbook.md`
- `docs/glossary/terms.md`
