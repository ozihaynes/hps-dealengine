🎯 Complete Claude Skills Library

HPS DealEngine — 35 Skills for World-Class Application Development

"Beyond Excellence" — Every skill is designed to produce 101/100 quality outputs that are beautiful, functional, and flawless.



Table of Contents

🧠 Strategic & Creative Thinking

✅ Quality & Standards

🎨 UI/UX & Design

🔒 Security & Compliance

🔧 Feature Development

🐛 Debugging & Incidents

📚 Documentation & Maintenance

📋 Quick Reference Guide



🧠 Strategic & Creative Thinking (3 Skills)



1. creative-problem-solving-studio

---

name: creative-problem-solving-studio

description: "Divergent-to-convergent ideation for hard problems: reframe, generate options, and select a strong path using SCAMPER/TRIZ + Double Diamond structure. Use when stuck, debating approaches, facing constraints, or needing fresh angles on complex decisions."

---



When to Use

You want better ideas, better options, or a fresh angle on a hard constraint

You are stuck, debating approaches, or need to invent a new workflow/feature

Facing a problem with no obvious solution

Need to break out of conventional thinking

Principles Applied

Category

Principles

Design Thinking

Double Diamond (Discover → Define → Develop → Deliver)

Cognitive

Dual Process Theory (System 1 vs System 2), Recognition over Recall

Behavioral

Framing Effect, Anchoring Bias awareness

Problem Solving

SCAMPER, TRIZ, Analogical Reasoning

Core Stance

Start with problem framing, not solutioning

Go divergent (many options) before going convergent (one decision)

Challenge assumptions before generating solutions

Quantity of ideas before quality filtering

Workflow (Strict Order)

Frame the Real Problem

Write: "We need to achieve X for user Y under constraint Z."

List non-negotiables and what can flex

Identify the job-to-be-done (functional + emotional + social)

Discover Assumptions

List 5–10 assumptions underlying the current approach

Mark the 2 most fragile assumptions

Ask: "What if the opposite were true?"

Divergent Ideation (Produce 10+ Options) Use at least 2 tools:

SCAMPER prompts: Substitute / Combine / Adapt / Modify / Put to another use / Eliminate / Reverse

TRIZ prompts: Identify contradictions; propose inventive principles

Analogy prompts: How would Stripe/Airbnb/Notion/Apple solve this?

Constraint removal: What if budget/time/tech were unlimited?

Converge

Cluster options into 3–5 themes

Score each theme on:

User value (1-5)

Feasibility (1-5)

Risk (1-5, lower is better)

Time-to-proof (1-5, faster is better)

Reversibility (1-5, more reversible is better)

Recommend One Path

Provide a single recommended option + 1 backup option

Call out the "make-or-break" assumption

Define the fastest way to test/validate

Output Format

## Problem Statement

[One sentence: We need to achieve X for user Y under constraint Z]



## Non-Negotiables

- [List what cannot change]



## Assumptions (Ranked by Fragility)

1. ⚠️ [Most fragile assumption]

2. ⚠️ [Second most fragile]

3. [Other assumptions...]



## 10+ Options Generated

| # | Option | SCAMPER/TRIZ Source |

|---|--------|---------------------|

| 1 | ... | ... |



## Top 3 Themes + Scores

| Theme | User Value | Feasibility | Risk | Time | Reversibility | Total |

|-------|------------|-------------|------|------|---------------|-------|



## Recommendation

**Primary:** [Option]

**Backup:** [Option]

**Make-or-break assumption:** [What must be true]

**Fastest proof test:** [How to validate in <1 week]





2. innovation-experiment-engine

---

name: innovation-experiment-engine

description: "Turns ideas into real innovation: hypothesis, prototype, and ship plan with measurable success metrics (HEART-style) and fast risk-killing experiments. Use when validating new features, testing novel approaches, or building MVPs with minimal waste."

---



When to Use

You have a new feature idea and want to validate it quickly without wasting weeks

You need a novel approach that is still safe and shippable

Testing product-market fit for a capability

Deciding between build vs. not-build

Principles Applied

Category

Principles

UX Frameworks

HEART Framework, Jobs-to-be-Done, Kano Model

Behavioral

Loss Aversion (minimize sunk cost), Hyperbolic Discounting (fast feedback)

Scientific Method

Hypothesis-driven development, Falsifiable predictions

Lean

Build-Measure-Learn, Minimum Viable Product

Workflow

Define the Opportunity

Who is the user?

What job are they hiring this feature for?

What's the current workaround? (Competing against nothing is a red flag)

Write the Hypothesis"If we build [X], then [Y users] will [do Z], because [A]."



Make it falsifiable

Define success and failure criteria upfront

Identify Assumptions (Ranked)Risk TypeQuestionHow to TestValueDo they want it?Fake-door test, interviewsUsabilityCan they use it?Prototype testFeasibilityCan we build it safely?Spike, technical proofIntegrityDoes it break determinism/audit/RLS?Architecture review

Design the Smallest Test

Prototype type: paper/UI mock, fake-door, partial automation, or real MVP slice

What's the minimum we can build to learn?

Time-box: Max 1-2 days for v0

Success Metrics (HEART-style) Pick 1–2 per bucket that matter:BucketMetricTargetHappinessSatisfaction score≥ 4/5EngagementFeature usage rate≥ X%AdoptionNew users trying feature≥ YRetentionReturn usage≥ Z%Task SuccessCompletion rate≥ W%

Ship Plan

v0 (Proof): Minimal, proves the assumption (1-2 days)

v1 (Usable): Functional for real users (1-2 weeks)

v2 (Polished): Production-ready, all states handled (1-2 weeks)

Include rollback/kill-switch plan

Output Format

## Hypothesis

If we build [X], then [Y users] will [do Z], because [A].



## Assumptions Ranked

| Rank | Risk Type | Assumption | Test Method | Pass Criteria |

|------|-----------|------------|-------------|---------------|



## Minimum Viable Experiment

**What we build:** [Description]

**Time budget:** [X days]

**What we learn:** [Expected insight]



## Success Metrics

| Metric | Target | Measurement Method |

|--------|--------|-------------------|



## Ship Plan

| Phase | Scope | Timeline | Exit Criteria |

|-------|-------|----------|---------------|

| v0 | Proof | X days | [Criteria] |

| v1 | Usable | X days | [Criteria] |

| v2 | Polished | X days | [Criteria] |



## Kill Switch

[How to disable/rollback if metrics fail]





3. senior-architect

---

name: senior-architect

description: "High-stakes architecture and schema decisions with 2–3 options and explicit tradeoffs. Use for new domain expansion, major refactors, new workflows, schema changes, or any decision that's hard to reverse. Includes Clean Architecture, Hexagonal, CQRS patterns and scalability principles."

---



When to Use

New domain expansion (e.g., multi-family/commercial)

Big refactors affecting multiple systems

New workflows crossing boundaries

Schema changes affecting RLS or audit

Any decision that's expensive to reverse

Principles Applied

Category

Principles

Architecture

Clean Architecture, Hexagonal (Ports & Adapters), CQRS, Event Sourcing

SOLID

Single Responsibility, Open/Closed, Dependency Inversion

Code Quality

Separation of Concerns, Loose Coupling, High Cohesion

Data

Repository Pattern, Unit of Work, Data Mapper

Decision Making

Reversibility assessment, Blast radius analysis

Workflow

Summarize Current State

Tables, flows, constraints involved

Current pain points and limitations

What's working that must be preserved

Define the Decision

What specific architectural question are we answering?

What are the non-negotiables?

What's the blast radius of getting this wrong?

Propose 3 ApproachesApproachDescriptionConservativeMinimal change, extend existing patternsBalancedModerate refactor, improved structureAmbitiousSignificant restructure, optimal long-term

Evaluate Each Approach For each approach, assess:

Migration risk (data loss, downtime)

Performance implications

RLS complexity

Audit trail impact

Reversibility (one-way door vs. two-way door)

Team cognitive load

Time to implement

Recommend One Path

Clear rationale for recommendation

Phased implementation plan

Rollback strategy

Guardrails

Preserve existing data integrity

Avoid one-way-door mistakes without explicit approval

Maintain RLS compliance throughout migration

Document decision for future reference (ADR)

Output Format

## Decision Context

**Question:** [What architectural question are we answering?]

**Blast Radius:** [What breaks if we get this wrong?]

**Reversibility:** [One-way door / Two-way door]



## Current State

[Tables, flows, constraints, pain points]



## Options



### Option A: Conservative

**Approach:** [Description]

| Factor | Assessment |

|--------|------------|

| Migration Risk | Low/Medium/High |

| Performance | [Impact] |

| RLS Complexity | [Impact] |

| Audit Impact | [Impact] |

| Reversibility | [Easy/Hard] |

| Time | [Estimate] |



### Option B: Balanced

[Same structure]



### Option C: Ambitious

[Same structure]



## Recommendation

**Selected:** Option [X]

**Rationale:** [Why this option]



## Implementation Plan

| Phase | Scope | Risk Mitigation |

|-------|-------|-----------------|



## Rollback Strategy

[How to reverse if needed]



## Architecture Decision Record (ADR)

**Status:** Proposed

**Decision:** [Summary]

**Consequences:** [What changes]





✅ Quality & Standards (5 Skills)



4. excellence-quality-bar

---

name: excellence-quality-bar

description: "Forces a high bar on every deliverable: clarity, correctness, completeness, and decision-ready outputs. Includes final quality checklist and next actions. Use for any output that matters: specs, plans, prompts, docs, designs, code reviews, or presentations."

---



When to Use

Any time you want "10/10" output

Specs, plans, prompts, docs, designs, or code review notes

Anything being shared with stakeholders

Final review before shipping

Principles Applied

Category

Principles

Quality

Clean Code principles, Boy Scout Rule

Cognitive

Recognition over Recall, Cognitive Load reduction

Communication

Pyramid Principle (conclusion first), MECE (Mutually Exclusive, Collectively Exhaustive)

Usability

Error Prevention, Help Users Recognize & Recover

Default Rules

Be decisive: recommend one path

Be complete: no missing steps, no vague instructions

Be safe: surface risks and mitigations

No invented facts or numbers

No placeholders — real values or ask

Workflow

Restate the Ask

1–2 lines in plain English

Confirm you understand the goal

Confirm Constraints

List non-negotiables

If any are unknown, ask 1 focused question (max)

Produce the Deliverable

Use structured Markdown

Include concrete examples where helpful

Lead with the recommendation/conclusion

Pressure-Test

"What would break this?"

"What would a skeptical reviewer attack?"

"What's missing?"

Final Quality ChecklistDimensionCheckCorrectnessNo contradictions; no invented dataCompletenessAll steps included; no hidden dependenciesSafetySecurity + privacy consideredMaintainabilityNaming, structure, future-proof notesUser ImpactUX clarity; edge cases coveredDesign QualityBeautiful, intentional, polished

Next Actions

End with 1–3 next steps only

Each action is concrete and assignable

Output Format

## Restated Goal

[1-2 sentences]



## Constraints

- [Non-negotiable 1]

- [Non-negotiable 2]



## Deliverable

[The actual output]



## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |

|------|------------|--------|------------|



## Quality Checklist

- [ ] Correctness — No contradictions, no invented data

- [ ] Completeness — All steps included

- [ ] Safety — Security/privacy reviewed

- [ ] Maintainability — Clear structure

- [ ] User Impact — Edge cases covered

- [ ] Design — Beautiful and polished



## Next Actions

1. [ ] [Action 1]

2. [ ] [Action 2]

3. [ ] [Action 3]





5. code-quality-gatekeeper

---

name: code-quality-gatekeeper

description: "Produces and reviews production-grade code with strict quality gates: readability, tests, security checks, config hygiene, defensive programming, and minimal risky changes. Use when writing or reviewing any code, especially code touching money, auth, permissions, or data access."

---



When to Use

Writing new code or reviewing code changes

Anything touching money math, auth, permissions, data access, or core flows

Before merging any PR

Code that will be hard to change later

Principles Applied

Category

Principles

Code Quality

DRY, KISS, YAGNI, Single Responsibility, Separation of Concerns

SOLID

All 5 principles

Defensive

Input Validation, Null Safety, Boundary Handling, Type Safety, Fail Fast

Security

Least Privilege, Defense in Depth, Input Sanitization

Testing

Test Pyramid, Arrange-Act-Assert, Test Behavior Not Implementation

Rules (Non-Negotiable)

Prefer small, reviewable changes

Require tests for critical logic

Keep config out of code (use env vars / secrets management)

Security posture: least privilege + explicit authorization checks

No any types in TypeScript

No console.logs in production code

All functions must have explicit return types

Workflow

Understand Intent

What should change and what must not change?

What's the blast radius?

Readability + Structure

Names are clear and consistent

Functions have single responsibility

No "clever" code — optimize for readability

Code smells identified and addressed

Correctness

Edge cases handled (null, undefined, empty, negative, boundary)

Rounding handled correctly for money

Time zones explicit

Operations are idempotent where needed

Defensive Programming Checklist// Every number display

safeNumber(value) // Guards NaN, Infinity, null, undefined



// Every string enum

value.trim().toLowerCase() // Normalize before comparison



// Every array operation

Array.isArray(value) // Before .map(), .filter(), etc.



// Every callback

onClick?.() // Null-safe invocation



// Every currency display

formatCurrency(value) // Handles $999,500 → $1.0M boundary



Tests

Unit tests for logic

Integration tests for critical paths

Edge case coverage (empty, null, boundary, negative)

Security Checklist

 No hardcoded secrets

 Ownership/authorization enforced

 Input validation present

 Safe error handling (no stack traces to users)

 RLS policies reviewed

Config Hygiene

Runtime config via environment variables

Secrets in secrets manager, never committed

Verification Commandspnpm -w typecheck

pnpm -w test

pnpm -w build



Output Format

## Review Summary

[One paragraph: What was reviewed, overall assessment]



## Must-Fix Issues

- [ ] [Issue 1 — file:line — severity]

- [ ] [Issue 2 — file:line — severity]



## Nice-to-Have Improvements

- [ ] [Improvement 1]

- [ ] [Improvement 2]



## Defensive Programming Audit

| Guard | Present | Notes |

|-------|---------|-------|

| safeNumber() | ✅/❌ | |

| String normalization | ✅/❌ | |

| Array guards | ✅/❌ | |

| Null-safe callbacks | ✅/❌ | |



## Tests Added/Proposed

- [Test 1]

- [Test 2]



## Verification Commands

```powershell

[Commands to verify the changes]





---



## 6. release-gatekeeper



```yaml

---

name: release-gatekeeper

description: "Enforce 'done means shippable' with build/typecheck/tests/migration verification and smoke steps. Use before merging PRs, deploying to production, or declaring any feature complete."

---



When to Use

Before merging PRs

Before deploying to production

When declaring a feature complete

After migrations or schema changes

Principles Applied

Category

Principles

Quality

Definition of Done, Ship Only What Works

Testing

Test Pyramid (unit → integration → E2E), Smoke Testing

Security

Pre-deployment security scan

Process

Atomic Commits, Clean History

Workflow

Git Status Checkgit status -sb

git rev-parse --short HEAD



Confirm clean status

Confirm expected branch

Verification Suite# TypeScript

pnpm -w typecheck



# Tests

pnpm -w test



# Build

pnpm -w build



Migration Verification (if applicable)

Migrations applied successfully

Schema matches expected state

RLS policies in place

Smoke Test

Critical user flows work end-to-end

No console errors

Performance acceptable

Final GateCheckStatusNotesTypecheck✅/🟡/🔴Tests✅/🟡/🔴Build✅/🟡/🔴Migrations✅/🟡/🔴Smoke✅/🟡/🔴

Output Format

## Release Gate Status



### Environment

- **Branch:** [branch name]

- **Commit:** [short hash]

- **Clean:** ✅/❌



### Verification Results

| Check | Status | Output |

|-------|--------|--------|

| Typecheck | ✅/🟡/🔴 | [summary] |

| Tests | ✅/🟡/🔴 | [X passed, Y failed] |

| Build | ✅/🟡/🔴 | [summary] |

| Migrations | ✅/🟡/🔴 | [summary] |

| Smoke | ✅/🟡/🔴 | [summary] |



### Blockers

- [Blocker 1 — severity]

- [Blocker 2 — severity]



### Verdict

**SHIP** ✅ / **HOLD** 🟡 / **BLOCK** 🔴



### Next Steps

1. [Step 1]

2. [Step 2]





7. forensic-auditor

---

name: forensic-auditor

description: "Hostile QA that breaks math/logic with edge cases and produces concrete test plans. Covers full test pyramid strategy, integration/E2E guidance, and deterministic test principles. Use when any money math, underwriting gates, calculators, pricing, or policy rules are touched."

---



When to Use

Any money math or financial calculations

Underwriting gates or risk scoring

Calculators or pricing logic

Policy rules or business logic

Any code where correctness is critical

Principles Applied

Category

Principles

Testing

Test Pyramid, Arrange-Act-Assert, Boundary Testing, Equivalence Partitioning

Defensive

Edge Case Coverage, Null Safety, Precision Handling

Quality

Deterministic Tests, Isolated Tests, Fast Feedback

Scientific

Falsifiable tests, Reproducible results

Workflow

Identify the Exact Functions

Which functions produce numbers?

Where do inputs come from?

What's the expected precision?

Create Edge-Case MatrixCategoryTest CasesInvalidnull, undefined, NaN, InfinityEmpty"", [], {}, 0ExtremeMAX_SAFE_INTEGER, -MAX_SAFE_INTEGER, very small decimalsBoundaryJust below threshold, exactly at threshold, just aboveTime-basedTimezone edge cases, DST transitions, leap yearsPrecisionRounding at 0.5, currency precision (2 decimals), percentage precision

Write Deterministic Tests

Same input → Same output (always)

No random values without seeds

No time-dependent behavior without mocking

Isolated from external dependencies

Test Pyramid CoverageLevelFocusCountUnitPure functions, calculationsManyIntegrationFunction combinations, data flowSomeE2ECritical user pathsFew

Prove Correctness

No NaN in outputs

No crashes on edge inputs

Correct rounding (bankers' rounding for money)

Stable outputs (deterministic)

Guardrails

Never "fix" by weakening validation

Enforce correctness over convenience

If behavior is ambiguous, ask for the rule, then codify in tests

Output Format

## Forensic Audit Report



### Functions Under Test

| Function | File | Purpose | Risk Level |

|----------|------|---------|------------|



### Failure Modes Found

| # | Input | Expected | Actual | Severity |

|---|-------|----------|--------|----------|



### Edge Case Matrix

| Category | Input | Expected Output | Tested |

|----------|-------|-----------------|--------|

| Null | null | [behavior] | ✅/❌ |

| NaN | NaN | [behavior] | ✅/❌ |

| Boundary | 999999 | [behavior] | ✅/❌ |

| ... | ... | ... | ... |



### Test Cases Added/Proposed

```typescript

describe('functionName', () => {

 it('handles null input', () => {

 expect(functionName(null)).toBe(expectedValue);

 });

 // ... more tests

});



Risk If Shipped Without Fix

[Description of user/business impact]

Verification

pnpm -w test --grep "functionName"





---



## 8. test-strategy-architect



```yaml

---

name: test-strategy-architect

description: "Design comprehensive test coverage with the right tests at the right levels. Covers test pyramid implementation, unit/integration/E2E strategy, visual regression, accessibility automation, and performance benchmarks. Use when establishing testing patterns or reviewing test coverage."

---



When to Use

Setting up testing for a new feature or module

Reviewing test coverage adequacy

Deciding what level of test to write

Establishing testing patterns for the team

Principles Applied

Category

Principles

Test Pyramid

Many unit tests, fewer integration, fewest E2E

Testing Practices

Arrange-Act-Assert, Test Behavior Not Implementation, Deterministic, Isolated, Fast

Coverage Strategy

Happy path, Edge cases, Error cases, Loading states, Empty states

Automation

Accessibility testing, Visual regression, Performance benchmarks

Test Pyramid Strategy

 /\

 / \ E2E (5-10%)

 /────\ - Critical user journeys only

 / \ - Slow, expensive, flaky

 /────────\ Integration (20-30%)

 / \ - Component interactions

 /────────────\ - API contracts

 / \ Unit (60-70%)

/────────────────\ - Pure functions

 - Fast, isolated, many



Workflow

Identify Test BoundariesBoundaryUnitIntegrationE2EPure calculations✅Component rendering✅Component + hooks✅API calls✅Full user flow✅

Define Coverage RequirementsCode TypeRequired CoverageTest LevelMoney math100%Unit + IntegrationBusiness logic90%+UnitUI components80%+Unit + IntegrationAPI routes80%+IntegrationCritical flows100%E2E

Test Categories

Happy Path: Normal, expected usage

Edge Cases: Boundaries, limits, special values

Error Cases: Invalid input, network failures, timeouts

State Variations: Loading, empty, error, success states

Accessibility: Keyboard nav, screen reader, contrast

Performance: Response time, bundle size, memory

Visual Regression Strategy

Key screens captured

Component library snapshots

Responsive breakpoint validation

Performance BenchmarksMetricTargetTest MethodLCP< 2.5sLighthouse CIFID< 100msWeb VitalsBundle size< 200KBBundle analyzer

Output Format

## Test Strategy for [Feature/Module]



### Coverage Plan

| Area | Unit | Integration | E2E | Total |

|------|------|-------------|-----|-------|

| [Area 1] | X tests | Y tests | Z tests | W% |



### Test Matrix

| Scenario | Type | Priority | Status |

|----------|------|----------|--------|

| Happy path | Unit | P0 | ✅/❌ |

| Null input | Unit | P0 | ✅/❌ |

| Network error | Integration | P1 | ✅/❌ |

| Full flow | E2E | P0 | ✅/❌ |



### Key Test Files

- `__tests__/unit/[file].test.ts`

- `__tests__/integration/[file].test.ts`

- `e2e/[flow].spec.ts`



### Automation Setup

- [ ] Unit test framework configured

- [ ] Integration test environment

- [ ] E2E runner (Playwright/Cypress)

- [ ] Visual regression (Chromatic/Percy)

- [ ] a11y automation (axe-core)

- [ ] Performance CI (Lighthouse)



### Next Actions

1. [Action 1]

2. [Action 2]





🎨 UI/UX & Design (11 Skills)



9. uiux-art-director

---

name: uiux-art-director

description: "Creates breathtaking, modern UI/UX with strong hierarchy, consistency, motion, and accessibility. Applies Gestalt principles, color psychology, emotional design, and produces implementation-ready design specs. Use when designing new screens, flows, components, or visual refreshes."

---



When to Use

Designing new screens, flows, or components

Visual refresh or redesign

Premium polish needed: layout, typography, spacing, motion

Component design requiring all states

Principles Applied

Category

Principles

Visual Hierarchy

Size & Scale, Color & Contrast, Typography Weight, Spacing & Proximity, Position, Depth & Elevation

Gestalt

Proximity, Similarity, Continuity, Closure, Figure-Ground, Common Region

Color

Color Psychology, Color Harmony, WCAG Contrast

Typography

Type Hierarchy, Line Height, Line Length, Font Pairing

Emotional

Don Norman's 3 Levels (Visceral, Behavioral, Reflective), Peak-End Rule

Layout

Grid Systems (8-point), Rule of Thirds, Golden Ratio, Balance, White Space

The Two Pillars (Equal Weight)

Pillar

What "Beyond Excellence" Looks Like

🎨 Design & UX

Visually stunning. Thoughtfully crafted. Intuitive without explanation. Delightful micro-interactions. Consistent spacing, typography, color. No "developer UI." Every state polished.

⚙️ Functionality

Flawless TypeScript. Zero regressions. Deterministic. Auditable. Secure.

Workflow

User + Job-to-be-Done

Who is this for?

What must they accomplish?

What should they FEEL using this? (Visceral → Behavioral → Reflective)

Flow First

Map all steps in the journey

Define all states:StateEmotionVisual TreatmentDefaultNeutralStandard stylingLoadingAnticipationSkeleton/shimmerEmptyGuidanceHelpful illustration + CTASuccessConfidenceGreen feedback + next actionErrorRecoveryClear message + how to fixDisabledClarityMuted but visible

Screen Spec

Layout structure (grid)

Component inventory

Interaction states (hover, focus, active, pressed)

Visual hierarchy diagram (1 → 2 → 3 → CTA)

Delight + Polish

Micro-interactions (button feedback, transitions)

Empty state messaging

Helpful microcopy

Easter eggs (where appropriate)

Accessibility Pass

Keyboard navigation complete

Focus indicators visible (3px+, high contrast)

ARIA labels on interactive elements

Color contrast ≥ 4.5:1 (text), ≥ 3:1 (UI)

Touch targets ≥ 44px

Implementation-Ready Deliverables

Design tokens (spacing, type scale, radii, shadows, colors)

Component API (props/variants/states)

Acceptance checklist

Output Format

## Design Spec: [Screen/Component Name]



### User & JTBD

**User:** [Who]

**Job:** [What they're trying to accomplish]

**Desired Emotion:** [What they should feel]



### User Flow

[Diagram or steps showing the journey]



### State Matrix

| State | Visual Treatment | Copy | Animation |

|-------|------------------|------|-----------|

| Default | | | |

| Loading | | | |

| Empty | | | |

| Success | | | |

| Error | | | |



### Visual Hierarchy



① [Primary element] — largest, most prominent ↓ ② [Secondary] — supporting information ↓ ③ [Tertiary] — additional context ↓ ④ [CTA] — clear action



### Component Spec

| Component | Variants | States | Props |

|-----------|----------|--------|-------|



### Design Tokens

| Token | Value | Usage |

|-------|-------|-------|

| `spacing-sm` | 8px | Compact spacing |

| `spacing-md` | 16px | Standard spacing |

| ... | ... | ... |



### Accessibility Checklist

- [ ] Keyboard navigation complete

- [ ] Focus indicators visible

- [ ] ARIA labels present

- [ ] Contrast ratios pass

- [ ] Touch targets ≥ 44px

- [ ] Reduced motion respected



### Acceptance Criteria

- [ ] [Criterion 1]

- [ ] [Criterion 2]





10. behavioral-design-strategist

---

name: behavioral-design-strategist

description: "Apply cognitive psychology, behavioral economics, and emotional design to every UI decision. Covers Hick's Law, Fitts's Law, Miller's Law, loss aversion, Peak-End Rule, Flow State, and ethical persuasion. Use when designing interactions, optimizing conversions, or improving user engagement."

---



When to Use

Designing any user interaction or flow

Optimizing conversion or engagement

Reducing friction or confusion

Making interfaces feel intuitive

Ethical persuasion design

Principles Applied

Category

Principles

Cognitive

Hick's Law, Fitts's Law, Miller's Law (7±2), Cognitive Load Theory, Recognition over Recall, Doherty Threshold

Memory

Serial Position Effect, Von Restorff Effect, Zeigarnik Effect

Behavioral Economics

Loss Aversion, Anchoring, Framing, Default Effect, Decoy Effect, Endowment Effect, Status Quo Bias

Emotional

Don Norman's 3 Levels, Peak-End Rule, Delight Design

Motivation

Self-Determination Theory (Autonomy, Competence, Relatedness), Flow State

Persuasion

Cialdini's 7 (Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity, Unity)

Cognitive Principles Checklist

Principle

Question

Application

Hick's Law

How many choices?

Reduce to essential options

Fitts's Law

Is the target easy to hit?

Large CTAs, close to cursor

Miller's Law

Is info chunked to ≤7 items?

Group related items

Cognitive Load

Is mental effort minimized?

Progressive disclosure

Doherty Threshold

Response < 400ms?

Optimize performance

Emotional Design Framework

Level

What It Is

Design Levers

Visceral

First impression

Colors, shapes, imagery, polish

Behavioral

During use

Usability, efficiency, feedback

Reflective

After use

Identity, values, memory, story

Motivation Design

Self-Determination Theory:

Need

How to Support

Autonomy

Choices, preferences, customization

Competence

Progress indicators, achievements, clear feedback

Relatedness

Social features, community, shared goals

Flow State Conditions:

Condition

Design Support

Clear goals

Obvious next action

Immediate feedback

Real-time responses

Challenge-skill balance

Progressive difficulty

No distractions

Focused interface

Ethical Persuasion (Use Responsibly)

Principle

Ethical Application

Reciprocity

Give value first (free trials, useful content)

Social Proof

Show real testimonials, not fake

Scarcity

Only use if genuinely scarce

Authority

Show real credentials

Workflow

Identify the Behavioral Goal

What action do we want users to take?

What's preventing them?

Map Cognitive Friction

Where is cognitive load highest?

Where are users deciding (Hick's Law)?

Where are targets too small (Fitts's Law)?

Design for Emotion

First impression (visceral)

During use (behavioral)

After completion (reflective)

Apply Motivational Design

Support autonomy, competence, relatedness

Create conditions for flow

Ethical Check

Are we being transparent?

Would we be proud to explain this design publicly?

Output Format

## Behavioral Design Analysis: [Screen/Flow]



### Behavioral Goal

**Desired Action:** [What users should do]

**Current Barrier:** [What's stopping them]



### Cognitive Audit

| Principle | Current State | Recommendation |

|-----------|---------------|----------------|

| Hick's Law | [# of choices] | [Reduce to X] |

| Fitts's Law | [Target size] | [Increase to Xpx] |

| Miller's Law | [Items visible] | [Chunk into groups] |

| Cognitive Load | [Complexity] | [Simplify by...] |



### Emotional Design Map

| Stage | Current Emotion | Target Emotion | Design Change |

|-------|-----------------|----------------|---------------|

| First view | | | |

| During task | | | |

| Completion | | | |



### Motivation Support

- **Autonomy:** [How supported]

- **Competence:** [How supported]

- **Relatedness:** [How supported]



### Persuasion Techniques (Ethical)

| Technique | Application | Ethical Check |

|-----------|-------------|---------------|

| [Technique] | [How used] | ✅ Transparent |



### Recommendations

1. [Recommendation 1 — which principle it applies]

2. [Recommendation 2 — which principle it applies]





11. accessibility-champion

---

name: accessibility-champion

description: "Ensure WCAG AA compliance and inclusive design for all users. Covers POUR principles, ARIA implementation, keyboard navigation, screen reader compatibility, color contrast, reduced motion, and touch targets. Use for any UI work to ensure accessibility is not an afterthought."

---



When to Use

Any UI component or screen design

Before declaring a feature complete

Accessibility audit or review

Building for diverse user needs

Principles Applied (POUR)

Principle

Description

Examples

Perceivable

Information presentable to all senses

Alt text, captions, contrast

Operable

Interface usable by all

Keyboard nav, no seizures, timing

Understandable

Content and UI comprehensible

Clear language, predictable

Robust

Works with assistive tech

Valid HTML, ARIA

WCAG Conformance Targets

Level

Target

Priority

A

Must have

P0

AA

Should have (our standard)

P0

AAA

Nice to have

P2

Accessibility Requirements Matrix

Category

Requirement

Test Method

Vision

Color contrast ≥ 4.5:1 (text)

Contrast checker

Color contrast ≥ 3:1 (UI elements)

Contrast checker

Alt text on images

Manual review

Don't rely on color alone

Manual review

Zoom to 200% without loss

Browser zoom test

Hearing

Captions on video

Manual review

Transcripts for audio

Manual review

Motor

Keyboard accessible

Tab through everything

No keyboard traps

Tab test

Touch targets ≥ 44px

Measurement

Skip links present

Manual check

Cognitive

Clear language

Readability check

Consistent navigation

Pattern review

Error prevention

Form testing

Vestibular

Reduced motion option

prefers-reduced-motion

No auto-play

Manual check

Seizure

No flashing > 3/sec

Manual review

ARIA Essentials

// Buttons with icons only

<button aria-label="Close dialog">

 <CloseIcon aria-hidden="true" />

</button>



// Live regions for dynamic content

<div aria-live="polite" aria-atomic="true">

 {statusMessage}

</div>



// Expandable sections

<button aria-expanded={isOpen} aria-controls="panel-1">

 Toggle

</button>

<div id="panel-1" hidden={!isOpen}>

 Content

</div>



// Form errors

<input 

 aria-invalid={hasError}

 aria-describedby="error-message"

/>

<span id="error-message" role="alert">

 {errorText}

</span>



Keyboard Navigation Checklist

Element

Expected Behavior

Links/Buttons

Tab to focus, Enter to activate

Inputs

Tab to focus, type to enter

Dropdowns

Tab to focus, Arrow keys to navigate, Enter to select

Modals

Focus trapped inside, Escape to close

Menus

Arrow keys to navigate, Enter to select

Tab panels

Tab to panel, Arrow keys between tabs

Workflow

Design Phase

Choose accessible color palette

Plan keyboard navigation

Design focus indicators (3px+, visible)

Include skip links in layout

Development Phase

Semantic HTML first

ARIA only when HTML insufficient

Focus management for dynamic content

Reduced motion queries

Testing Phase

Automated: axe-core, Lighthouse

Manual: keyboard-only navigation

Screen reader: VoiceOver/NVDA

Zoom: 200% without loss

Output Format

## Accessibility Audit: [Component/Screen]



### Automated Scan Results

**Tool:** axe-core / Lighthouse

**Score:** [X/100]

**Critical issues:** [Count]



### Manual Testing Results

| Test | Pass/Fail | Notes |

|------|-----------|-------|

| Keyboard navigation | ✅/❌ | |

| Focus indicators | ✅/❌ | |

| Screen reader | ✅/❌ | |

| Color contrast | ✅/❌ | |

| Touch targets | ✅/❌ | |

| Reduced motion | ✅/❌ | |



### Issues Found

| Issue | WCAG Criterion | Severity | Fix |

|-------|----------------|----------|-----|



### ARIA Implementation

```tsx

// Code snippets showing correct ARIA usage



Checklist

 All interactive elements keyboard accessible

 Focus indicators visible (3px+)

 ARIA labels on icon buttons

 Color contrast ≥ 4.5:1 (text)

 Color contrast ≥ 3:1 (UI)

 Alt text on images

 Form errors announced

 Skip links present

 prefers-reduced-motion respected

 Touch targets ≥ 44px

Next Actions

[Fix 1]

[Fix 2]



---



## 12. motion-choreographer



```yaml

---

name: motion-choreographer

description: "Design purposeful, delightful animations and micro-interactions. Applies Disney's 12 principles to UI, covers easing functions, timing standards, loading animations, and performance-safe techniques. Use when adding motion to any UI element."

---



When to Use

Adding micro-interactions to buttons, inputs, cards

Designing loading states and transitions

Page transitions and navigation

Creating delight through motion

Performance-optimizing existing animations

Principles Applied (Disney's 12 → UI)

Principle

UI Application

Example

Squash & Stretch

Elastic feedback

Button press bounce

Anticipation

Prepare for action

Hover state before click

Staging

Direct attention

Modal entrance

Follow Through

Natural completion

Menu items staggering

Slow In/Out

Easing

Natural movement

Arc

Natural curved motion

Drag and drop paths

Secondary Action

Supporting motion

Icon animate with text

Timing

Speed conveys weight

Quick = light, slow = heavy

Exaggeration

Emphasis

Error shake

Appeal

Delight

Playful micro-interactions

Timing Standards

Animation Type

Duration

Easing

Micro-interaction

100-200ms

ease-out

Small transition

200-300ms

ease-in-out

Medium transition

300-400ms

ease-in-out

Large transition

400-500ms

ease-in-out

Page transition

300-500ms

ease-in-out

Loading spinner

Continuous

linear

Easing Functions

Easing

CSS

Use Case

ease-out

cubic-bezier(0, 0, 0.2, 1)

Elements entering

ease-in

cubic-bezier(0.4, 0, 1, 1)

Elements exiting

ease-in-out

cubic-bezier(0.4, 0, 0.2, 1)

Most transitions

spring

Custom

Playful, bouncy

Motion Purpose Framework

Purpose

When

Example

Feedback

Confirm user action

Button ripple, check mark

Orientation

Show spatial relationships

Slide transitions

Guidance

Direct attention

Pulsing indicator

Continuity

Maintain context

Morph between states

Personality

Express brand

Delightful bounces

Status

Communicate state

Loading spinner

Performance Rules

/* GOOD - GPU accelerated */

transform: translateX(100px);

opacity: 0.5;



/* AVOID - triggers layout */

left: 100px;

width: 200px;

height: 200px;



Safe properties: transform, opacity Avoid animating: width, height, top, left, margin, padding

Reduced Motion Support

@media (prefers-reduced-motion: reduce) {

 *,

 *::before,

 *::after {

 animation-duration: 0.01ms !important;

 animation-iteration-count: 1 !important;

 transition-duration: 0.01ms !important;

 }

}



Workflow

Define Purpose

What is this animation communicating?

Is motion necessary or decorative?

Choose Parameters

Duration (based on size/distance)

Easing (based on purpose)

Properties (transform/opacity only)

Consider Reduced Motion

Provide static alternative

Respect user preference

Test Performance

Check on low-end devices

Verify no jank/stutter

Output Format

## Motion Spec: [Component/Interaction]



### Purpose

**Type:** Feedback / Orientation / Guidance / Continuity / Personality / Status

**Goal:** [What this animation communicates]



### Animation Definition

| Property | From | To | Duration | Easing |

|----------|------|-----|----------|--------|

| transform | | | | |

| opacity | | | | |



### CSS Implementation

```css

.element {

 transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);

}



.element:hover {

 transform: scale(1.05);

}



@media (prefers-reduced-motion: reduce) {

 .element {

 transition: none;

 }

}



Framer Motion Implementation

<motion.div

 initial={{ opacity: 0, y: 20 }}

 animate={{ opacity: 1, y: 0 }}

 transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}

/>



Performance Check

 Uses only transform/opacity

 Tested on low-end device

 No layout thrashing

 Reduced motion supported



---



## 13. design-system-orchestrator



```yaml

---

name: design-system-orchestrator

description: "Builds cohesive design systems: tokens, component variants, and migration plans. Covers complete token taxonomy, Atomic Design structure, and component API patterns. Use when UI inconsistency appears or when establishing/extending a design system."

---



When to Use

UI inconsistency is appearing

Establishing a design system from scratch

Extending an existing design system

Migrating to a new design system

Principles Applied

Category

Principles

Atomic Design

Atoms → Molecules → Organisms → Templates → Pages

Design Tokens

Single source of truth for design decisions

Component API

Consistent props, variants, states

Consistency

Same problem = same solution

Token Taxonomy

Category

Tokens

Examples

Color

Primitives, Semantic, Component

gray-500, text-primary, button-bg

Typography

Font family, size, weight, line-height

font-body, text-lg, font-bold

Spacing

Scale (4px base)

space-1 (4px), space-2 (8px), ...

Border Radius

Scale

radius-sm, radius-md, radius-full

Shadows

Elevation scale

shadow-sm, shadow-md, shadow-lg

Z-Index

Layering scale

z-dropdown, z-modal, z-tooltip

Transitions

Duration, easing

duration-fast, ease-out

Breakpoints

Responsive

sm, md, lg, xl, 2xl

Atomic Design Levels

Level

Description

Examples

Atoms

Smallest units

Button, Input, Icon, Label

Molecules

Simple combinations

FormField (Label + Input + Error)

Organisms

Complex sections

Header, Card, DataTable

Templates

Page layouts

DashboardLayout, AuthLayout

Pages

Specific instances

HomePage, DealPage

Component API Standards

// Consistent prop patterns

interface ButtonProps {

 // Variants

 variant: 'primary' | 'secondary' | 'ghost' | 'destructive';

 size: 'sm' | 'md' | 'lg';

 

 // States

 disabled?: boolean;

 loading?: boolean;

 

 // Content

 children: React.ReactNode;

 leftIcon?: React.ReactNode;

 rightIcon?: React.ReactNode;

 

 // Behavior

 onClick?: () => void;

 type?: 'button' | 'submit' | 'reset';

 

 // Styling escape hatch

 className?: string;

}



Workflow

Inventory Audit

List all current colors, spacing, typography, radii, shadows

Identify duplicates and inconsistencies

Document one-off styles

Define Token System

Create primitive tokens (raw values)

Create semantic tokens (purpose-based)

Create component tokens (specific uses)

Component Standards

Define each component's variants

Define all states (default, hover, focus, active, disabled, loading, error)

Define API (props) for consistency

Migration Plan

Prioritize by impact (most-used first)

Convert one component category at a time

Visual regression testing at each step

Output Format

## Design System: [Name]



### Token Definitions



#### Colors

| Token | Value | Usage |

|-------|-------|-------|

| `color-primary-500` | #10B981 | Primary brand color |

| `color-text-primary` | `color-gray-900` | Main text |

| ... | ... | ... |



#### Spacing

| Token | Value | Usage |

|-------|-------|-------|

| `space-1` | 4px | Tight spacing |

| `space-2` | 8px | Compact spacing |

| `space-4` | 16px | Standard spacing |

| ... | ... | ... |



#### Typography

| Token | Value | Usage |

|-------|-------|-------|

| `text-xs` | 12px / 1.5 | Captions |

| `text-sm` | 14px / 1.5 | Small text |

| `text-base` | 16px / 1.5 | Body text |

| ... | ... | ... |



### Component Specifications



#### Button

**Variants:** primary, secondary, ghost, destructive

**Sizes:** sm (32px), md (40px), lg (48px)

**States:** default, hover, focus, active, disabled, loading



| Variant | Background | Text | Border |

|---------|------------|------|--------|

| primary | `color-primary-500` | white | none |

| secondary | transparent | `color-primary-500` | `color-primary-500` |

| ... | ... | ... | ... |



### Migration Plan

| Phase | Components | Timeline | Status |

|-------|------------|----------|--------|

| 1 | Button, Input | Week 1 | ⏳ |

| 2 | Card, Modal | Week 2 | ⏳ |

| ... | ... | ... | ... |



### Verification

- [ ] All tokens documented

- [ ] All components have variants defined

- [ ] All states covered

- [ ] Migration plan approved





14. frontend-polisher

---

name: frontend-polisher

description: "Enforce design-system consistency for enterprise-grade polish. Covers spacing, typography, tokens, motion/animation standards, micro-interactions, and responsive breakpoints. Use when UI feels inconsistent or needs professional polish."

---



When to Use

UI feels inconsistent or "dev-y"

Spacing, color, or typography drift

Component variants diverging

Need to elevate quality before shipping

Principles Applied

Category

Principles

Visual

Consistency, Hierarchy, Balance, White Space

Motion

Purposeful animation, Timing standards, Performance

Responsive

Mobile-first, Breakpoint consistency

Polish

Attention to detail, State completeness

Polish Checklist

Category

Check

Standard

Spacing

Consistent with tokens

4/8/12/16/24/32/48/64px scale

Typography

Hierarchy clear

text-xs → text-4xl scale

Colors

From design tokens

No hex codes inline

Border Radius

Consistent

radius-sm/md/lg/full

Shadows

Elevation appropriate

shadow-sm/md/lg

States

All present

hover, focus, active, disabled

Loading

Polished

Skeleton or spinner

Empty

Designed

Illustration + helpful text

Error

Helpful

Clear message + recovery

Motion

Smooth

200-300ms, ease-in-out

Workflow

Identify Source of Truth

Tailwind config

Design tokens file

Shared components

Audit for Drift

One-off spacing values

Hardcoded colors

Inconsistent component usage

Missing states

Normalize Patterns

Replace magic numbers with tokens

Consolidate duplicate styles

Ensure all variants match design system

Mobile Verification

Tap targets ≥ 44px

Scroll behavior smooth

Modals work on mobile

Text readable at all sizes

Motion Pass

Add micro-interactions where missing

Ensure consistent timing

Test reduced motion

Common Issues to Fix

Issue

Fix

margin: 17px

→ margin: space-4 (16px)

#3B82F6 inline

→ text-primary-500

Missing hover state

Add hover treatment

No loading state

Add skeleton/spinner

Jarring transitions

Add 200ms ease-in-out

Touch target 32px

Increase to 44px

Output Format

## Polish Audit: [Screen/Component]



### Issues Found

| File | Line | Issue | Fix | Priority |

|------|------|-------|-----|----------|

| | | Hardcoded spacing | Use token | P1 |

| | | Missing hover | Add state | P1 |

| | | No loading state | Add skeleton | P2 |



### Tokens Applied

| Before | After | Files Changed |

|--------|-------|---------------|

| `margin: 17px` | `margin: space-4` | [files] |

| `#3B82F6` | `text-primary-500` | [files] |



### States Added

- [ ] Hover states

- [ ] Focus states 

- [ ] Loading states

- [ ] Empty states

- [ ] Error states



### Motion Added

| Element | Animation | Duration | Easing |

|---------|-----------|----------|--------|



### Mobile Fixes

- [ ] Touch targets ≥ 44px

- [ ] Scroll behavior

- [ ] Modal positioning



### Changed Files

- `path/to/file1.tsx` — [changes]

- `path/to/file2.tsx` — [changes]



### Verification

```powershell

pnpm -w typecheck

pnpm -w build





---



## 15. ux-writer



```yaml

---

name: ux-writer

description: "Craft clear, helpful, human interface text. Covers voice/tone guidelines, button labels, error messages, empty states, onboarding copy, and inclusive language. Use for any UI text: buttons, labels, errors, empty states, tooltips, or onboarding."

---



When to Use

Writing button labels and CTAs

Crafting error messages

Designing empty states

Onboarding and help text

Any user-facing copy

Principles Applied

Category

Principles

Cognitive

Recognition over Recall, Cognitive Load reduction

Usability

Error Prevention, Help Users Recover, Clear Language

Emotional

Peak-End Rule (end on positive), Reduce Anxiety

Inclusive

Plain language, No jargon, Accessible vocabulary

Voice & Tone Guidelines

Attribute

Do

Don't

Clear

"Save changes"

"Persist modifications"

Concise

"Email required"

"Please enter your email address"

Human

"Something went wrong"

"Error 500: Internal Server Error"

Helpful

"Try again"

"Operation failed"

Confident

"Your changes are saved"

"Your changes should be saved"

Respectful

"Let's try that again"

"You made an error"

Button & Label Standards

Type

Pattern

Example

Primary Action

Verb + Object

"Generate Offer"

Secondary Action

Verb + Object

"Save Draft"

Destructive

Verb + Object

"Delete Deal"

Navigation

Destination

"Back to Dashboard"

Toggle

State

"Show Details" / "Hide Details"

Link

Destination

"View all deals"

Error Message Formula

What happened + Why + What to do next



Bad

Good

"Error"

"We couldn't save your changes. Check your connection and try again."

"Invalid input"

"Email format isn't valid. Try: name@example.com"

"403 Forbidden"

"You don't have access to this deal. Request access from the owner."

Empty State Formula

What this is + Why it's empty + What to do next



Screen

Copy

No deals

"No deals yet. Create your first deal to get started." + [Create Deal] button

No results

"No deals match your filters. Try adjusting your search or clear filters."

No activity

"No activity on this deal yet. Activity will appear here as you work."

Tooltip Guidelines

Do

Don't

Explain why, not just what

Repeat the label

Keep under 150 characters

Write paragraphs

Use on complex features

Use on obvious buttons

Provide additional context

State the obvious

Workflow

Identify Context

Where is user in their journey?

What's their emotional state?

What do they need to know?

Draft Copy

Start with the action verb

Remove unnecessary words

Use familiar vocabulary

Test Clarity

Read aloud — does it sound human?

Would a new user understand?

Is there a simpler way?

Inclusive Check

No jargon or technical terms

No gendered language

No cultural assumptions

Output Format

## Copy Spec: [Screen/Component]



### Context

**User state:** [Where in journey, emotional state]

**Goal:** [What they're trying to do]



### Copy Inventory

| Element | Current | Proposed | Rationale |

|---------|---------|----------|-----------|

| Page title | | | |

| Primary CTA | | | |

| Error message | | | |

| Empty state | | | |

| Tooltip | | | |



### Error Messages

| Error Code | User Message | Recovery Action |

|------------|--------------|-----------------|

| 400 | [Message] | [What to do] |

| 403 | [Message] | [What to do] |

| 500 | [Message] | [What to do] |



### Empty States

| Screen | Headline | Body | CTA |

|--------|----------|------|-----|

| [Screen] | | | |



### Tone Check

- [ ] Clear (no jargon)

- [ ] Concise (no extra words)

- [ ] Human (not robotic)

- [ ] Helpful (provides next step)

- [ ] Inclusive (no assumptions)





16. form-experience-designer

---

name: form-experience-designer

description: "Design forms that are fast, forgiving, and friction-free. Covers input selection, validation timing, error presentation, auto-save, multi-step flows, and mobile optimization. Use when building or improving any form or data entry experience."

---



When to Use

Building new forms

Improving form completion rates

Reducing form errors

Multi-step wizard design

Mobile form optimization

Principles Applied

Category

Principles

Cognitive

Cognitive Load (minimize fields), Miller's Law (chunk into steps)

Usability

Error Prevention, Recognition over Recall, Flexibility

Behavioral

Default Effect (smart defaults), Loss Aversion (save progress)

Feedback

Immediate validation, Clear error recovery

Input Selection Guide

Data Type

Input Type

Why

Short text

<input type="text">

Standard entry

Email

<input type="email">

Mobile keyboard

Phone

<input type="tel">

Numeric keyboard

Number

<input type="number">

Spin controls, validation

Date

Date picker component

Consistent format

Yes/No

Toggle or Radio

Clear binary choice

One of few

Radio buttons

See all options

One of many

Select dropdown

Compact, searchable

Multiple

Checkboxes

Independent selection

Long text

<textarea>

Multi-line entry

Validation Strategy

Timing

Use When

Example

On blur

Format validation

Email format

On change (debounced)

Character limits

"50/100 characters"

On submit

Complex validation

"Dates must not overlap"

Real-time

Password strength

Strength meter

Error Presentation

Level

Treatment

Example

Field

Red border + inline message

"Email format isn't valid"

Section

Summary at section top

"Fix 2 errors below"

Form

Toast or alert

"Please fix errors before submitting"

Multi-Step Form Patterns

Progress indicator

┌────────────────────────────────────────────┐

│ ① Info → ② Details → ③ Review → ✓ │

└────────────────────────────────────────────┘



- Show progress clearly

- Allow back navigation

- Save progress between steps

- Validate per step, not at end



Form Best Practices

Practice

Implementation

Reduce fields

Ask only what's necessary

Smart defaults

Pre-fill likely values

Auto-save

Save drafts every 30 seconds

Field grouping

Related fields together

Clear labels

Above field, not placeholder

Help text

Below field for complex inputs

Required markers

Asterisk (*) on required fields

Tab order

Logical flow

Submit feedback

Loading state on button

Mobile Optimization

Consideration

Solution

Touch targets

≥ 44px height

Keyboards

Appropriate input types

Scrolling

Single column layout

Labels

Never placeholder-only

Errors

Visible without scrolling

Output Format

## Form Spec: [Form Name]



### Fields

| Field | Type | Required | Validation | Help Text |

|-------|------|----------|------------|-----------|

| Email | email | Yes | Format | We'll never share your email |

| Phone | tel | No | US format | |



### Validation Rules

| Field | Rule | Timing | Error Message |

|-------|------|--------|---------------|

| Email | Valid format | On blur | "Enter a valid email address" |



### Error Messages

| Field | Validation | Message |

|-------|------------|---------|

| Email | Required | "Email is required" |

| Email | Format | "Enter a valid email (e.g., name@example.com)" |



### Multi-Step Flow (if applicable)

| Step | Fields | Validation |

|------|--------|------------|

| 1. Basic Info | Name, Email | Per-step |

| 2. Details | Address, Phone | Per-step |

| 3. Review | (summary) | On submit |



### States

- [ ] Default (empty)

- [ ] Filled (valid)

- [ ] Error (invalid)

- [ ] Disabled

- [ ] Loading (submitting)

- [ ] Success (submitted)



### Accessibility

- [ ] Labels linked to inputs

- [ ] Error messages in aria-describedby

- [ ] Focus moves to first error on submit

- [ ] Required fields marked



### Mobile Considerations

- [ ] Touch targets ≥ 44px

- [ ] Correct input types for keyboards

- [ ] Single column layout

- [ ] Errors visible without scroll





17. error-experience-designer

---

name: error-experience-designer

description: "Turn errors into helpful, recoverable moments. Covers error state design, message writing, recovery flows, retry patterns, offline handling, and graceful degradation. Use when designing how the system communicates failures to users."

---



When to Use

Designing error states for components/screens

Writing error messages

Building retry and recovery flows

Handling offline scenarios

Setting up error boundaries

Principles Applied

Category

Principles

Usability

Help Users Recognize & Recover, Error Prevention, Clear Language

Emotional

Reduce Anxiety, Maintain Trust, Don't Blame User

Technical

Graceful Degradation, Error Boundaries, Fail Safe

Error Taxonomy

Type

Cause

User Control

Example

Validation

Bad input

High

"Invalid email format"

Permission

No access

Medium

"You don't have access"

Not Found

Missing resource

Low

"Deal not found"

Server

Backend failure

None

"Something went wrong"

Network

Connectivity

Medium

"Check your connection"

Timeout

Slow response

Low

"This is taking longer than usual"

Error Message Formula

[What happened] + [Why (if helpful)] + [What to do next]



Error Message Examples

Bad

Good

"Error"

"Couldn't save changes. Try again."

"404"

"We couldn't find that deal. It may have been deleted."

"401"

"Your session expired. Please sign in again."

"500"

"Something went wrong on our end. We're looking into it."

"Network error"

"Can't connect. Check your internet and try again."

Error Visual Treatment

Severity

Color

Icon

Persistence

Critical

Red-500

⚠️ Alert

Until resolved

Warning

Amber-500

⚡ Warning

Until dismissed

Info

Blue-500

ℹ️ Info

Auto-dismiss

Recovery Patterns

Pattern

When

Implementation

Retry

Transient failures

"Try again" button

Refresh

Stale data

"Refresh" button

Go back

Navigation errors

"Go back" link

Contact support

Unrecoverable

Support link + error ID

Offline mode

No connection

Read-only cached data

Error Boundary Strategy (React)

// Wrap critical sections

<ErrorBoundary

 fallback={<ErrorFallback />}

 onError={(error) => logError(error)}

>

 <CriticalComponent />

</ErrorBoundary>



// ErrorFallback component

function ErrorFallback({ error, resetErrorBoundary }) {

 return (

 <div role="alert" className="error-container">

 <h2>Something went wrong</h2>

 <p>We're sorry, but something unexpected happened.</p>

 <button onClick={resetErrorBoundary}>Try again</button>

 </div>

 );

}



Offline Handling

State

UI Treatment

Data Strategy

Online

Normal

Real-time

Offline

Banner + limited UI

Cached data (read-only)

Reconnecting

Subtle indicator

Queue mutations

Back online

Success toast

Sync queued changes

Output Format

## Error Experience: [Feature/Screen]



### Error Scenarios

| Error | HTTP Code | User Message | Recovery Action |

|-------|-----------|--------------|-----------------|

| Save failed | 500 | "Couldn't save changes. Try again." | Retry button |

| No access | 403 | "You don't have access to this deal." | Request access CTA |

| Not found | 404 | "Deal not found." | Back to dashboard |

| Network | - | "No internet connection." | Retry when online |



### Visual Treatment

| Error Type | Color | Icon | Container |

|------------|-------|------|-----------|

| Form validation | red-500 | ❌ | Inline below field |

| API error | red-500 | ⚠️ | Toast or alert |

| Network | amber-500 | 📶 | Top banner |



### Error Messages

```tsx

const ERROR_MESSAGES = {

 SAVE_FAILED: {

 title: "Couldn't save changes",

 description: "Something went wrong. Your changes weren't saved.",

 action: "Try again",

 },

 // ...

};



Error Boundaries

 Dashboard wrapped in boundary

 Each major section has boundary

 Fallback UI designed

 Errors logged to monitoring

Offline Handling

 Offline detection implemented

 Offline banner designed

 Cached data displayed

 Mutations queued

 Sync on reconnect

Accessibility

 Errors announced to screen readers

 Focus moves to error

 Error messages linked with aria-describedby

 Error role="alert" on important errors



---



## 18. responsive-design-specialist



```yaml

---

name: responsive-design-specialist

description: "Ensure beautiful, functional experiences across all devices. Covers mobile-first methodology, breakpoints, touch targets, gestures, responsive typography, and mobile performance. Use when building or auditing any user interface."

---



When to Use

Building any new UI

Auditing existing UI for mobile issues

Designing adaptive layouts

Optimizing for touch devices

Principles Applied

Category

Principles

Layout

Mobile-First, Content Priority, Fluid Grids

Interaction

Fitts's Law (touch targets), Gesture Design

Performance

Mobile network optimization, Core Web Vitals

Accessibility

Touch target sizing, Readable text

Breakpoint Strategy

Breakpoint

Name

Target

Columns

< 640px

sm

Mobile

4

640-768px

md

Tablet portrait

8

768-1024px

lg

Tablet landscape

12

1024-1280px

xl

Laptop

12

1280px

2xl

Desktop

12

Mobile-First Approach

/* Base styles (mobile) */

.container {

 padding: 16px;

 flex-direction: column;

}



/* Tablet and up */

@media (min-width: 768px) {

 .container {

 padding: 24px;

 flex-direction: row;

 }

}



/* Desktop */

@media (min-width: 1024px) {

 .container {

 padding: 32px;

 max-width: 1200px;

 }

}



Touch Target Standards

Element

Minimum Size

Recommended

Buttons

44 × 44px

48 × 48px

Links (in text)

44px height

Add padding

Icons

44 × 44px touch area

Larger than visual

Form inputs

44px height

48px height

Spacing between targets

8px

12px

Responsive Typography

Level

Mobile

Desktop

Scaling

H1

28px

40px

fluid

H2

24px

32px

fluid

H3

20px

24px

fluid

Body

16px

16px

fixed

Small

14px

14px

fixed

/* Fluid typography example */

h1 {

 font-size: clamp(1.75rem, 4vw, 2.5rem);

}



Layout Patterns by Breakpoint

Pattern

Mobile

Tablet

Desktop

Navigation

Bottom bar or hamburger

Side rail

Full top nav

Cards

Single column

2 columns

3-4 columns

Tables

Card view or scroll

Scrollable

Full table

Forms

Single column

Single column

2 columns

Modals

Full screen

Centered

Centered

Mobile Performance Checklist

Metric

Target

Test

LCP

< 2.5s

Lighthouse

FID

< 100ms

Lighthouse

CLS

< 0.1

Lighthouse

Bundle size

< 200KB

Bundle analyzer

Images

WebP, lazy load

Audit

Output Format

## Responsive Audit: [Screen/Component]



### Breakpoint Behavior

| Breakpoint | Layout | Navigation | Key Changes |

|------------|--------|------------|-------------|

| Mobile (<640px) | | | |

| Tablet (640-1024px) | | | |

| Desktop (>1024px) | | | |



### Touch Target Audit

| Element | Current Size | Required | Status |

|---------|--------------|----------|--------|

| Primary CTA | Xpx | 44px | ✅/❌ |

| Nav items | Xpx | 44px | ✅/❌ |



### Typography Scale

| Element | Mobile | Desktop | Method |

|---------|--------|---------|--------|

| H1 | | | clamp() |

| Body | | | fixed |



### Issues Found

| Issue | Breakpoint | Fix |

|-------|------------|-----|

| Touch target too small | Mobile | Increase to 44px |

| Text too small | Mobile | Increase to 16px |



### Performance (Mobile)

| Metric | Score | Target | Status |

|--------|-------|--------|--------|

| LCP | | < 2.5s | ✅/❌ |

| FID | | < 100ms | ✅/❌ |

| CLS | | < 0.1 | ✅/❌ |



### Changed Files

- `path/to/file1.tsx`

- `path/to/file2.css`





19. notification-system-designer

---

name: notification-system-designer

description: "Design non-intrusive, helpful feedback and notification systems. Covers toast vs alert vs modal decisions, priority levels, timing, action buttons, and notification center patterns. Use when designing any feedback or notification mechanism."

---



When to Use

Designing feedback for user actions

Building notification systems

Deciding between toast/alert/modal

Creating notification center

Principles Applied

Category

Principles

Cognitive

Minimize Interruption, Attention Management

Usability

Visibility of System Status, User Control

Behavioral

Immediate Feedback, Peak-End Rule

Accessibility

Screen Reader Announcements, Focus Management

Notification Type Decision Tree

Is user action required?

├── Yes → Is it destructive/important?

│ ├── Yes → Modal (blocking)

│ └── No → Alert/Banner (persistent)

└── No → Is it time-sensitive?

 ├── Yes → Toast (auto-dismiss)

 └── No → Notification center (async)



Notification Types

Type

Blocking

Persistence

Use For

Toast

No

Auto-dismiss (5s)

Success, info

Alert/Banner

No

Until dismissed

Warnings, non-critical errors

Modal/Dialog

Yes

Until action

Confirmations, critical errors

Inline

No

Persistent

Form validation

Badge

No

Until cleared

Counts, status

Priority Levels

Priority

Color

Sound

Persistence

Example

Critical

Red

Yes (optional)

Until resolved

"Session expired"

Warning

Amber

No

Until dismissed

"Unsaved changes"

Success

Green

No

5 seconds

"Changes saved"

Info

Blue

No

5 seconds

"New feature available"

Toast Standards

// Structure

<Toast>

 <Icon /> // Status icon

 <Content>

 <Title>Changes saved</Title>

 <Description>Your deal was updated successfully.</Description>

 </Content>

 <Action>Undo</Action> // Optional

 <Close /> // Optional

</Toast>



// Timing

const TOAST_DURATION = {

 success: 5000,

 info: 5000,

 warning: 8000,

 error: 0, // Manual dismiss

};



Modal Confirmation Pattern

Action Type

Modal?

Message

Delete

Yes

"Delete [item]? This can't be undone."

Discard changes

Yes

"Discard unsaved changes?"

Leave page

Yes

"Leave without saving?"

Non-destructive

No

Use toast

Notification Center

Feature

Description

Badge count

Unread count on bell icon

Grouping

By type or time

Actions

Mark read, delete, settings

Empty state

"You're all caught up"

Persistence

Store in database

Output Format

## Notification System: [Feature]



### Notification Inventory

| Event | Type | Priority | Message | Action |

|-------|------|----------|---------|--------|

| Save success | Toast | Success | "Changes saved" | Undo |

| Save error | Toast | Error | "Couldn't save" | Retry |

| Delete | Modal | Critical | "Delete deal?" | Confirm/Cancel |



### Toast Configuration

```tsx

const toastConfig = {

 success: { duration: 5000, icon: CheckIcon },

 error: { duration: 0, icon: AlertIcon },

 // ...

};



Modal Dialogs

Trigger

Title

Message

Actions

Delete

"Delete deal?"

"This can't be undone."

Delete (destructive), Cancel

Notification Center

 Bell icon with badge

 Dropdown or slide-out panel

 Grouped by type/time

 Mark all read

 Empty state designed

Accessibility

 Toast announcements (aria-live)

 Modal focus trap

 Escape to dismiss

 Screen reader friendly



---



# 🔒 Security & Compliance (4 Skills)



---



## 20. determinism-audit-enforcer



```yaml

---

name: determinism-audit-enforcer

description: "Ensures deterministic underwriting runs: stable outputs, reproducible hashes, and trace/audit linkage. Use when changing math, gates, hashing, traces, or evidence references."

---



When to Use

Any change to underwriting math

Risk gates or scoring logic

Run hashing or trace generation

Evidence linking or references

Non-Negotiables

Same canonical inputs ⇒ same outputs/hashes

No nondeterministic ordering (random, unstable sorts)

No implicit "now()" or timezone dependencies without explicit as-of

Every output traceable to: deal snapshot + policy snapshot + evidence state + run_id + hashes

Determinism Risks Checklist

Risk

Detection

Fix

Unstable sorts

Array without explicit comparator

Add stable sort key

Floating point

0.1 + 0.2 !== 0.3

Use fixed precision

Implicit now()

Date.now() in calculations

Explicit as-of timestamp

Timezone

Local timezone in date logic

UTC everywhere

Object iteration

Object.keys() order

Sort keys first

Random values

Math.random()

Seeded random or remove

Race conditions

Parallel async without ordering

Deterministic ordering

Workflow

Identify Canonical Inputs

Deal snapshot (exact state)

Policy snapshot (version + hash)

Evidence set (items + as-of timestamps)

Check Determinism Risks

 No unstable sorts

 No floating point without precision control

 No implicit timestamps

 No local timezone dependencies

 No race conditions affecting order

Enforce Traceability

 run_id present in all outputs

 Evidence references recorded

 Policy version/hash recorded

 Input hash computed

Require Audit Events

Who triggered the run

What inputs were used

When it was executed

What outputs were produced

Verification

Rerun same inputs twice

Diff outputs (must match exactly)

Verify hashes match

Output Format

## Determinism Audit: [Feature/Function]



### Canonical Inputs

| Input | Source | Snapshot Method |

|-------|--------|-----------------|

| Deal | deal table | deal_snapshot_id |

| Policy | policy table | policy_version + hash |

| Evidence | evidence table | evidence_set_id + as-of |



### Determinism Check

| Risk | Found | Location | Fix |

|------|-------|----------|-----|

| Unstable sort | ❌/⚠️ | file:line | [fix] |

| Floating point | ❌/⚠️ | file:line | [fix] |

| Implicit now() | ❌/⚠️ | file:line | [fix] |



### Traceability

- [ ] run_id in outputs

- [ ] Evidence references linked

- [ ] Policy version recorded

- [ ] Input hash computed



### Verification

```powershell

# Run twice and diff

pnpm -w test:determinism



Proof

[Show that same inputs produce same outputs]



---



## 21. rls-gatekeeper



```yaml

---

name: rls-gatekeeper

description: "Ensure every table/query/mutation is safe under Supabase RLS and tenant isolation. Use when adding/changing tables, policies, or any data access path."

---



When to Use

Adding or changing database tables

Modifying RLS policies

Any query or mutation that accesses data

New API endpoints

Workflow

Identify Tables Touched

List all tables in the operation

Note expected access patterns (SELECT/INSERT/UPDATE/DELETE)

Verify Role ExpectationsRoleExpected AccessownerFull CRUD on own dealsmanagerRead all org deals, edit assignedvpRead all org dealsanonNone

Confirm Policy Coverage For each table:

 SELECT policy exists and is correct

 INSERT policy exists and is correct

 UPDATE policy exists and is correct

 DELETE policy exists (if allowed)

Tenant Isolation Check

 All queries scoped by org_id

 No cross-tenant data leakage possible

 Foreign keys enforce org boundaries

Test Queries-- Test as different roles

SET ROLE authenticated;

SET request.jwt.claims = '{"sub": "user-id", "org_id": "org-id"}';

SELECT * FROM deals; -- Should only return org deals



Hard Rules

No service_role in user-invoked flows

All user queries must go through RLS

Cross-org queries require explicit service context

Output Format

## RLS Audit: [Feature/Table]



### Tables Touched

| Table | Operations | RLS Enabled |

|-------|------------|-------------|

| deals | SELECT, UPDATE | ✅ |



### Policy Summary

| Table | Operation | Policy | Correct |

|-------|-----------|--------|---------|

| deals | SELECT | org_member | ✅/❌ |

| deals | UPDATE | deal_owner | ✅/❌ |



### Tenant Isolation

- [ ] All queries scoped by org_id

- [ ] No cross-tenant leakage

- [ ] Foreign keys enforce boundaries



### Test Results

```sql

-- As user in org-1

SELECT count(*) FROM deals; -- Expected: X, Actual: X ✅



-- As user in org-2

SELECT count(*) FROM deals; -- Expected: 0, Actual: 0 ✅



Issues Found

Issue

Severity

Fix



---



## 22. security-guard



```yaml

---

name: security-guard

description: "Scan for secrets, insecure deps, IDOR, auth/RLS bypass, unsafe file uploads, and weak boundaries. Use before release, after adding endpoints, after adding uploads, after dependency bumps."

---



When to Use

Before any release

After adding API endpoints

After adding file uploads

After dependency updates

Security audit requests

Security Checklist

Category

Check

Risk

Secrets

No hardcoded secrets in code

Critical

No secrets in logs

Critical

No secrets in error messages

Critical

Secrets in env vars only

Required

Auth

All endpoints require auth

Critical

Ownership checks on resources

Critical

No IDOR vulnerabilities

Critical

Session handling secure

Critical

RLS

All tables have policies

Critical

No service_role in user flows

Critical

Cross-tenant queries blocked

Critical

Input

All input validated

High

SQL injection prevented

Critical

XSS prevented

High

Dependencies

No known vulnerabilities

High

Dependencies up to date

Medium

Uploads

File type validated

High

Size limits enforced

Medium

Files quarantined/scanned

High

Signed URLs for access

Medium

Workflow

Secrets Scan# Search for potential secrets

grep -r "sk_live\|api_key\|secret" --include="*.ts" .



Auth Boundary Check

List all API endpoints

Verify auth middleware applied

Check ownership/authorization logic

RLS Verification

All tables have policies

No service_role escalation

Input Validation

All user input validated

Types enforced

Sizes bounded

Dependency Auditpnpm audit



Hard Rules

Never commit secrets

No service_role in user-invoked flows

All file uploads go through quarantine

All API errors must not leak stack traces

Output Format

## Security Audit: [Feature/Release]



### Secrets Scan

| Finding | Location | Severity | Status |

|---------|----------|----------|--------|

| [none found] | | | ✅ |



### Auth Boundaries

| Endpoint | Auth Required | Ownership Check | Status |

|----------|---------------|-----------------|--------|

| GET /deals | ✅ | ✅ | ✅ |

| POST /deals | ✅ | N/A | ✅ |



### RLS Status

| Table | Policies | No service_role | Status |

|-------|----------|-----------------|--------|

| deals | ✅ | ✅ | ✅ |



### Input Validation

| Endpoint | Validation | Status |

|----------|------------|--------|

| POST /deals | zod schema | ✅ |



### Dependency Audit

```bash

pnpm audit

# 0 vulnerabilities found ✅



Upload Security (if applicable)

 File type validation

 Size limits

 Quarantine process

 Signed URLs

Issues Found

Issue

Severity

Fix

Status

Verification Commands

pnpm audit

pnpm -w typecheck

pnpm -w test





---



## 23. ethical-design-guardian



```yaml

---

name: ethical-design-guardian

description: "Ensure designs respect users and avoid dark patterns. Covers dark pattern identification, privacy by design, transparent data usage, consent patterns, and trust signal design. Use for any user-facing feature to ensure ethical design."

---



When to Use

Designing any conversion flow

Building consent or privacy features

Reviewing existing UX for manipulation

Ensuring trust and transparency

Dark Patterns to Avoid

Pattern

Description

Ethical Alternative

Bait & Switch

Promise one thing, deliver another

Honest representation

Confirmshaming

Guilt users ("No, I don't want to save money")

Neutral option text

Disguised Ads

Ads that look like content

Clear labeling

Forced Continuity

Hard to cancel subscriptions

Easy cancellation

Hidden Costs

Surprise fees at checkout

Upfront pricing

Misdirection

Draw attention away from important

Clear hierarchy

Roach Motel

Easy to get in, hard to get out

Symmetric effort

Trick Questions

Confusing opt-in/out

Clear, plain language

Privacy Zuckering

Default to sharing data

Privacy by default

Fake Urgency

"Only 2 left!" when false

Real scarcity only

Fake Social Proof

Fabricated reviews

Real testimonials

Privacy by Design Principles

Principle

Implementation

Data minimization

Collect only what's needed

Purpose limitation

Use data only for stated purpose

Privacy by default

Most private settings as default

Transparency

Clear about what data is collected

User control

Easy to view, export, delete data

Security

Protect data appropriately

Consent Patterns

Do

Don't

Clear language

Legal jargon

Separate consents

Bundled consent

Easy to decline

Hidden decline option

Granular choices

All-or-nothing

Remember preferences

Ask repeatedly

Trust Signals

Signal

Implementation

Security badges

SSL, compliance certifications

Testimonials

Real customer quotes

Transparency

Clear pricing, policies

Contact info

Easy to reach support

Error handling

Honest, helpful messages

Data protection

Clear privacy policy

Workflow

Dark Pattern Scan

Review all CTAs and options

Check for manipulative copy

Verify clear opt-out paths

Privacy Review

What data is collected?

Is collection minimized?

Are defaults privacy-preserving?

Consent Check

Is consent freely given?

Is it specific and informed?

Can it be easily withdrawn?

Trust Assessment

Would we be proud to explain this publicly?

Does it respect user intelligence?

Is it honest about tradeoffs?

Output Format

## Ethical Design Review: [Feature]



### Dark Pattern Scan

| Element | Pattern Check | Status |

|---------|---------------|--------|

| Cancel flow | No roach motel | ✅/❌ |

| Pricing | No hidden costs | ✅/❌ |

| Options | No confirmshaming | ✅/❌ |

| CTAs | No misdirection | ✅/❌ |



### Privacy Review

| Data Point | Necessary | Minimized | Disclosed |

|------------|-----------|-----------|-----------|

| Email | ✅ | ✅ | ✅ |

| Analytics | ✅ | ✅ | ✅ |



### Consent Patterns

- [ ] Clear language used

- [ ] Separate consents offered

- [ ] Easy decline option

- [ ] Preferences remembered



### Trust Signals Present

- [ ] Security indicators

- [ ] Clear policies

- [ ] Contact information

- [ ] Honest messaging



### Issues Found

| Issue | Category | Fix |

|-------|----------|-----|



### Public Explanation Test

[Would we be proud to explain this design publicly? Why/why not?]





🔧 Feature Development (6 Skills)



24. feature-builder-vertical-slice

---

name: feature-builder-vertical-slice

description: "Build production features as vertical slices (UI → API/Edge → DB → audit/trace → tests) with minimal risk. Includes state management patterns, error boundaries, and complete state specs. Use when implementing any new feature."

---



When to Use

Implementing any new feature

Building end-to-end functionality

When you need all layers working together

Principles Applied

Category

Principles

Architecture

Vertical Slices, Clean Architecture

Development

Ship Small, Test Early

Quality

All States Covered, Error Boundaries

Vertical Slice Structure

Feature Slice

├── UI Layer

│ ├── Components (all states: loading/empty/error/success)

│ ├── State management

│ └── Error boundaries

├── API/Edge Layer

│ ├── Route handlers

│ ├── Validation (zod)

│ └── Error handling

├── Database Layer

│ ├── Schema/migrations

│ ├── RLS policies

│ └── Queries

├── Audit/Trace

│ ├── Events logged

│ └── Trace frames

└── Tests

 ├── Unit tests

 ├── Integration tests

 └── Smoke tests



Workflow

Write Slice Spec

Goal (one sentence)

User story

Acceptance criteria

Non-goals (explicit scope limits)

Design Data Model First

Table schema

RLS policies

Relationships

Implement Layer by Layer

DB → API → UI (bottom-up)

OR: UI → API → DB (top-down for rapid prototyping)

All States RequiredStateDesignedImplementedTestedLoading✅✅✅Empty✅✅✅Error✅✅✅Success✅✅✅

Add Audit/Trace

Log significant events

Trace frames for debugging

Tests

Unit: Pure functions, calculations

Integration: API + DB

Smoke: Critical user path

Hard Rules

Determinism preserved (no side effects in calculations)

No UI-only "business truth" (source of truth in DB)

All states handled

Error boundaries in place

Output Format

## Slice Spec: [Feature Name]



### Goal

[One sentence describing what this slice accomplishes]



### User Story

As a [user type], I want to [action] so that [benefit].



### Acceptance Criteria

- [ ] [Criterion 1]

- [ ] [Criterion 2]

- [ ] [Criterion 3]



### Non-Goals

- [What this slice explicitly does NOT do]



### Data Model

```sql

-- Table schema

CREATE TABLE feature_table (

 id uuid PRIMARY KEY,

 -- ...

);



-- RLS policy

CREATE POLICY "..." ON feature_table ...;



API Endpoints

Method

Path

Purpose

GET

/api/feature

List items

POST

/api/feature

Create item

UI Components

Component

States

File

FeatureList

loading/empty/error/success

components/Feature.tsx

State Matrix

State

UI Treatment

Data

Loading

Skeleton

null

Empty

Illustration + CTA

[]

Error

Error message + retry

error

Success

Data display

data

Tests

 Unit: [test description]

 Integration: [test description]

 Smoke: [test description]

Files Changed

src/components/Feature.tsx

src/api/feature/route.ts

supabase/migrations/xxx.sql

Verification

pnpm -w typecheck

pnpm -w test

pnpm -w build





---



## 25. migration-specialist



```yaml

---

name: migration-specialist

description: "Safe Postgres/Supabase schema changes with RLS-first posture and rollback awareness. Covers zero-downtime strategies, backfill patterns, and verification. Use when adding tables/columns/indexes or changing constraints."

---



When to Use

Adding new tables or columns

Changing constraints or indexes

Altering RLS policies

Data backfills

Migration Safety Principles

Principle

Implementation

Expand-Contract

Add new → migrate data → remove old

Zero Downtime

No locking migrations in production

Reversible

Always have rollback plan

RLS First

Policies before data

Backfill Safely

Batched, resumable backfills

Workflow

State Migration Intent

What is changing?

Why is it necessary?

What are the data safety risks?

Draft Migration Steps

Expand phase (additive changes)

Backfill phase (data migration)

Contract phase (remove old)

RLS Considerations

Are new policies needed?

Do existing policies need updates?

Will migration break RLS?

Provide

Migration SQL

Verification queries

Rollback SQL

Migration Patterns

Pattern

When

Example

Add column (nullable)

Safe

ALTER TABLE ADD COLUMN x TEXT;

Add column (not null)

Requires default

ADD COLUMN x TEXT NOT NULL DEFAULT '';

Rename column

Use expand-contract

Add new → copy data → drop old

Add index

Concurrent

CREATE INDEX CONCURRENTLY

Change type

Use expand-contract

Add new col → migrate → drop old

Hard Rules

User-facing flows must not require service_role

No long-running locks on production tables

Always test migration on staging first

Backfills must be idempotent

Output Format

## Migration: [Description]



### Intent

**Change:** [What is changing]

**Reason:** [Why necessary]

**Risk:** [Data safety concerns]



### Migration SQL

```sql

-- Up migration

BEGIN;



-- Step 1: Add column

ALTER TABLE deals ADD COLUMN new_field TEXT;



-- Step 2: Create index (concurrent if large table)

CREATE INDEX CONCURRENTLY idx_deals_new_field ON deals(new_field);



-- Step 3: Add RLS policy

CREATE POLICY "..." ON deals ...;



COMMIT;



Backfill (if needed)

-- Batched, resumable backfill

UPDATE deals

SET new_field = computed_value

WHERE new_field IS NULL

 AND id > $last_processed_id

LIMIT 1000;



Verification Queries

-- Verify column exists

SELECT column_name FROM information_schema.columns 

WHERE table_name = 'deals' AND column_name = 'new_field';



-- Verify data migrated

SELECT COUNT(*) FROM deals WHERE new_field IS NOT NULL;



-- Verify RLS works

SET ROLE authenticated;

SELECT * FROM deals; -- Should respect RLS



Rollback SQL

-- Down migration

BEGIN;

DROP INDEX IF EXISTS idx_deals_new_field;

ALTER TABLE deals DROP COLUMN IF EXISTS new_field;

COMMIT;



Checklist

 Migration tested on staging

 Rollback tested

 RLS policies updated

 Backfill completed

 Indexes created

 Application code deployed

Commands

# Apply migration

supabase db push



# Verify

supabase db diff





---



## 26. provider-integration-specialist



```yaml

---

name: provider-integration-specialist

description: "Add/upgrade external data providers with strong provenance, rate-limit safety, and deterministic outputs. Use when integrating comps/AVM/public records/flood/HOA/MLS systems."

---



When to Use

Integrating new data provider (RentCast, ATTOM, MLS, etc.)

Upgrading existing provider integration

Adding rate limiting or retry logic

Ensuring data provenance

Integration Requirements

Requirement

Implementation

Provenance

Track source, timestamp, version

Rate Limiting

Respect provider limits

Retry Logic

Exponential backoff

Timeout

Fail fast, don't hang

Error Handling

Structured errors, no crashes

Caching

Cache where appropriate

Determinism

Same input → same cache key

Workflow

Define Provider Outputs

What data do we need?

What's the schema?

What's the mapping to our schema?

Implement Ingestionasync function fetchFromProvider(params: Params) {

 // Rate limit check

 await rateLimiter.acquire();

 

 try {

 // Request with timeout

 const response = await fetch(url, {

 signal: AbortSignal.timeout(10000),

 });

 

 // Store raw evidence

 await storeRawEvidence(response);

 

 // Normalize to our schema

 return normalizeResponse(response);

 

 } catch (error) {

 if (isRetryable(error)) {

 // Exponential backoff retry

 return retry(fetchFromProvider, params);

 }

 throw new ProviderError(error);

 }

}



Store Evidence

Raw response stored separately

Normalized facts derived

Provenance metadata (timestamp, version, params)

Ensure Determinism

Cache keys include all inputs

As-of timestamps for reproducibility

No implicit time dependencies

Output Format

## Provider Integration: [Provider Name]



### Provider Details

| Field | Value |

|-------|-------|

| Name | [Provider] |

| API Docs | [URL] |

| Rate Limit | [X requests/minute] |

| Auth | [API key / OAuth] |



### Data Mapping

| Provider Field | Our Field | Transform |

|----------------|-----------|-----------|

| `sale_price` | `last_sale_price` | Number, cents |

| `sale_date` | `last_sale_date` | ISO 8601 |



### Implementation

```typescript

// Provider client

const client = new ProviderClient({

 apiKey: process.env.PROVIDER_API_KEY,

 timeout: 10000,

 retries: 3,

});



Rate Limiting

Limit

Value

Implementation

Requests/min

100

Token bucket

Requests/day

10000

Daily counter

Error Handling

Error Type

Retry

User Message

Rate limit

Yes (backoff)

"Please try again in X seconds"

Timeout

Yes (1x)

"Data source is slow, retrying"

Auth

No

"Configuration error"

Not found

No

"Property not found"

Evidence Storage

CREATE TABLE provider_evidence (

 id uuid PRIMARY KEY,

 provider text NOT NULL,

 request_params jsonb,

 raw_response jsonb,

 fetched_at timestamptz,

 as_of_timestamp timestamptz

);



Testing Strategy

 Mock provider for unit tests

 Integration test with sandbox

 Rate limit handling test

 Error scenario tests

Monitoring

 Request count metrics

 Error rate alerts

 Latency tracking



---



## 27. evidence-pack-manager



```yaml

---

name: evidence-pack-manager

description: "Standardizes evidence handling: provenance, raw payload storage, as-of timestamps, freshness rules, and trace references. Use when adding providers, uploads, or changing evidence schemas."

---



When to Use

Adding a data provider

Adding file uploads (photos, docs)

Modifying evidence schemas

Linking evidence to traces

Evidence Requirements

Requirement

Description

Raw Storage

Store original response/file

Provenance

Who, what, when, where

As-Of Timestamp

When data was valid

Fetched-At

When we retrieved it

Freshness Rules

How long is data valid?

Trace Linkage

Connect to underwriting runs

Evidence Lifecycle

1. Ingest

 └── Receive raw data

 

2. Validate

 └── Schema, size, required fields

 

3. Quarantine (if upload)

 └── Virus scan, format check

 

4. Store

 └── Raw + normalized + metadata

 

5. Link

 └── Connect to runs + trace frames

 

6. Expire

 └── Mark stale based on freshness rules



Freshness Rules by Type

Evidence Type

Freshness

Reason

Comps

90 days

Market changes

AVM

30 days

Value estimates fluctuate

Public records

1 year

Slow to change

Flood maps

5 years

FEMA updates

Photos

Never expires

Historical record

Docs

Never expires

Historical record

Evidence Schema

CREATE TABLE evidence (

 id uuid PRIMARY KEY,

 deal_id uuid REFERENCES deals(id),

 

 -- Type and source

 evidence_type text NOT NULL, -- 'comp', 'avm', 'photo', etc.

 provider text, -- 'rentcast', 'attom', 'upload'

 

 -- Provenance

 raw_payload jsonb, -- Original response

 normalized_data jsonb, -- Our schema

 

 -- Timestamps

 as_of_timestamp timestamptz, -- When data was valid

 fetched_at timestamptz, -- When we got it

 expires_at timestamptz, -- When it's stale

 

 -- Trace linkage

 linked_run_ids uuid[], -- Runs that used this

 

 -- Metadata

 created_by uuid,

 created_at timestamptz DEFAULT now()

);



Output Format

## Evidence Spec: [Evidence Type]



### Evidence Definition

| Field | Value |

|-------|-------|

| Type | [comp/avm/photo/doc] |

| Provider | [source] |

| Freshness | [X days] |



### Schema

```typescript

interface Evidence {

 id: string;

 deal_id: string;

 evidence_type: EvidenceType;

 provider: string;

 

 raw_payload: unknown;

 normalized_data: NormalizedData;

 

 as_of_timestamp: string;

 fetched_at: string;

 expires_at: string;

 

 linked_run_ids: string[];

}



Validation Rules

Field

Rule

Error

raw_payload

Required

"Raw data is required"

as_of_timestamp

Valid ISO

"Invalid timestamp"

Freshness

Condition

Action

Created < [X] days ago

Fresh ✅

Created > [X] days ago

Stale ⚠️

Manually invalidated

Invalid ❌

Trace Linkage

Evidence referenced in trace frames

Run records which evidence was used

Changes trigger re-run consideration

Storage

 Raw payload stored

 Normalized data derived

 Timestamps captured

 Expiry calculated

Verification

-- Verify evidence linked to runs

SELECT e.id, array_length(e.linked_run_ids, 1) 

FROM evidence e

WHERE e.deal_id = $deal_id;





---



## 28. state-management-architect



```yaml

---

name: state-management-architect

description: "Design predictable, maintainable UI state patterns. Covers local vs global state, server state (React Query), form state, optimistic updates, cache invalidation, and loading/error patterns. Use when building complex UIs or establishing state patterns."

---



When to Use

Building complex interactive UIs

Deciding on state management approach

Implementing optimistic updates

Managing server state/caching

State Categories

Category

Tool

Scope

Local UI

useState, useReducer

Component

Shared UI

Context, Zustand

Feature/App

Server

React Query, SWR

Cache

Form

React Hook Form

Form

URL

Next.js router

Shareable

Decision Framework

Is it server data?

├── Yes → React Query / SWR

└── No → Is it form data?

 ├── Yes → React Hook Form

 └── No → Is it shared across components?

 ├── Yes → Context / Zustand

 └── No → useState / useReducer



Server State Patterns (React Query)

// Fetching

const { data, isLoading, error } = useQuery({

 queryKey: ['deals', dealId],

 queryFn: () => fetchDeal(dealId),

 staleTime: 5 * 60 * 1000, // 5 minutes

});



// Mutations with optimistic updates

const mutation = useMutation({

 mutationFn: updateDeal,

 onMutate: async (newData) => {

 // Cancel outgoing refetches

 await queryClient.cancelQueries(['deals', dealId]);

 

 // Snapshot previous value

 const previous = queryClient.getQueryData(['deals', dealId]);

 

 // Optimistically update

 queryClient.setQueryData(['deals', dealId], newData);

 

 return { previous };

 },

 onError: (err, newData, context) => {

 // Rollback on error

 queryClient.setQueryData(['deals', dealId], context.previous);

 },

 onSettled: () => {

 // Refetch to ensure consistency

 queryClient.invalidateQueries(['deals', dealId]);

 },

});



Form State Patterns

// React Hook Form

const { register, handleSubmit, formState } = useForm({

 defaultValues: { name: '', email: '' },

});



// Auto-save pattern

const debouncedSave = useDebouncedCallback(

 (data) => saveDraft(data),

 1000

);



useEffect(() => {

 const subscription = watch((data) => debouncedSave(data));

 return () => subscription.unsubscribe();

}, [watch, debouncedSave]);



Loading/Error State Patterns

// Component structure

function DealView({ dealId }) {

 const { data, isLoading, error } = useDeal(dealId);

 

 if (isLoading) return <DealSkeleton />;

 if (error) return <DealError error={error} retry={refetch} />;

 if (!data) return <DealEmpty />;

 

 return <DealContent data={data} />;

}



Output Format

## State Architecture: [Feature]



### State Inventory

| State | Category | Tool | Scope |

|-------|----------|------|-------|

| Deal data | Server | React Query | Cache |

| Form values | Form | React Hook Form | Form |

| Modal open | Local | useState | Component |



### Server State

```typescript

// Query keys

const queryKeys = {

 deals: ['deals'],

 deal: (id: string) => ['deals', id],

};



// Query configuration

const dealQuery = {

 queryKey: queryKeys.deal(id),

 queryFn: () => fetchDeal(id),

 staleTime: 5 * 60 * 1000,

};



Optimistic Updates

Mutation

Optimistic

Rollback

Update deal

Yes

Restore previous

Delete deal

Yes

Re-add to list

Cache Invalidation

Action

Invalidate

Create deal

['deals'] (list)

Update deal

['deals', id]

Delete deal

['deals'] (list)

Loading States

State

UI Treatment

Initial load

Skeleton

Refetch

Subtle indicator

Mutation

Button loading

Error States

Error

UI Treatment

Recovery

Fetch error

Error + retry

Retry button

Mutation error

Toast + retry

Retry button



---



## 29. component-architect



```yaml

---

name: component-architect

description: "Design reusable, composable, maintainable components. Covers Atomic Design, component API design, compound patterns, documentation, and testing strategies. Use when building component libraries or establishing component patterns."

---



When to Use

Building new shared components

Establishing component patterns

Designing component APIs

Creating component documentation

Atomic Design Levels

Level

Description

Examples

Atoms

Basic building blocks

Button, Input, Icon, Label

Molecules

Simple combinations

FormField, SearchInput, MenuItem

Organisms

Complex sections

Header, DealCard, DataTable

Templates

Page layouts

DashboardLayout, AuthLayout

Pages

Specific instances

HomePage, DealDetailPage

Component API Design

// Good component API

interface ButtonProps {

 // Content

 children: React.ReactNode;

 leftIcon?: React.ReactNode;

 rightIcon?: React.ReactNode;

 

 // Variants (constrained options)

 variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';

 size?: 'sm' | 'md' | 'lg';

 

 // States (boolean flags)

 disabled?: boolean;

 loading?: boolean;

 

 // Behavior

 type?: 'button' | 'submit' | 'reset';

 onClick?: () => void;

 

 // Escape hatch

 className?: string;

}



Component Patterns

Pattern

When

Example

Compound

Related components share state

<Tabs><Tab /><TabPanel /></Tabs>

Render Props

Flexible rendering

<DataFetcher render={(data) => ...} />

Slots

Content injection

<Card header={...} footer={...} />

Polymorphic

Element flexibility

<Button as="a" href="..." />

Compound Component Pattern

// Parent provides context

const TabsContext = createContext<TabsContextValue | null>(null);



function Tabs({ children, defaultValue }) {

 const [activeTab, setActiveTab] = useState(defaultValue);

 

 return (

 <TabsContext.Provider value={{ activeTab, setActiveTab }}>

 {children}

 </TabsContext.Provider>

 );

}



// Children consume context

function Tab({ value, children }) {

 const { activeTab, setActiveTab } = useContext(TabsContext);

 return (

 <button 

 role="tab"

 aria-selected={activeTab === value}

 onClick={() => setActiveTab(value)}

 >

 {children}

 </button>

 );

}



// Usage

<Tabs defaultValue="tab1">

 <Tab value="tab1">Tab 1</Tab>

 <Tab value="tab2">Tab 2</Tab>

 <TabPanel value="tab1">Content 1</TabPanel>

 <TabPanel value="tab2">Content 2</TabPanel>

</Tabs>



Testing Strategy

Level

What

How

Unit

Render variants

@testing-library/react

Visual

Appearance

Storybook + Chromatic

Interaction

Click, type

@testing-library/user-event

Accessibility

a11y violations

axe-core

Output Format

## Component Spec: [Component Name]



### Purpose

[What this component does and when to use it]



### Atomic Level

[Atom / Molecule / Organism]



### API

```typescript

interface ComponentProps {

 // Props definition

}



Variants

Variant

Description

Use Case

primary

Main action

CTAs

secondary

Alternative

Secondary actions

States

State

Props

Visual

Default



[description]

Hover



[description]

Disabled

disabled={true}

[description]

Loading

loading={true}

[description]

Usage Examples

// Basic

<Component>Content</Component>



// With variants

<Component variant="primary" size="lg">

 Content

</Component>



Accessibility

 Keyboard accessible

 ARIA attributes

 Focus management

 Screen reader tested

Testing

describe('Component', () => {

 it('renders correctly', () => {

 render(<Component>Test</Component>);

 expect(screen.getByText('Test')).toBeInTheDocument();

 });

 

 it('handles click', async () => {

 const onClick = jest.fn();

 render(<Component onClick={onClick}>Click</Component>);

 await userEvent.click(screen.getByText('Click'));

 expect(onClick).toHaveBeenCalled();

 });

});



Storybook

export default {

 title: 'Components/Component',

 component: Component,

};



export const Default = { args: {} };

export const Primary = { args: { variant: 'primary' } };





---



# 🐛 Debugging & Incidents (3 Skills)



---



## 30. bug-hunter-debugger



```yaml

---

name: bug-hunter-debugger

description: "Fast, surgical debugging across UI/API/DB/RLS with a one-step-at-a-time protocol. Use when something doesn't work, errors are confusing, or state becomes null unexpectedly."

---



When to Use

Something "doesn't work"

Confusing errors

State unexpectedly null/undefined

Data not appearing where expected

Debug Protocol (Strict Order)

Restate the Bug

What's expected?

What's happening?

When did it start?

Identify the LayerLayerSymptomsUIVisual wrong, component not renderingStateData present but not displayedAPINetwork errors, wrong responseAuth401/403, user context wrongRLSData exists but not returnedDBData not in databaseBuildWorks locally, fails deployed

Request ONE Artifact

Error message / stack trace

Screenshot

Network tab response

Console output

Reproduction steps

Run ONE Diagnostic

Add console.log at specific point

Check network response

Query DB directly

Test as different user

Propose Smallest Fix

Only after diagnosis confirmed

Minimal change

Include verification steps

Common Debug Patterns

Symptom

First Check

Component not rendering

Check conditional logic, null checks

Data is null

Check API response, then query

API returns 401

Check auth headers, session

API returns 403

Check RLS policies

Works locally, not prod

Check env vars, build

Intermittent

Check race conditions, caching

Output Format

## Bug Report: [Description]



### Restatement

**Expected:** [behavior]

**Actual:** [behavior]

**Frequency:** [always/sometimes/once]



### Layer Identified

**Layer:** UI / State / API / Auth / RLS / DB / Build

**Confidence:** High / Medium / Low



### Diagnostic Requested

[One specific thing to check]



### Hypothesis

[What I think is wrong based on evidence]



### Proposed Fix

```typescript

// Before

[problematic code]



// After

[fixed code]



Verification

[How to verify fix works]

[How to verify no regression]



---



## 31. incident-commander



```yaml

---

name: incident-commander

description: "Handles production incidents: triage, containment, root cause, minimal safe fix or rollback, verification, and postmortem. Use for prod bugs, outages, auth/RLS issues, or data risk."

---



When to Use

Production bug affecting users

Service outage

Auth or RLS failure

Potential data exposure

Severe performance regression

Incident Protocol (Strict Order)

Assess Severity + Blast RadiusSeverityDefinitionResponse TimeP0Service down, data breachImmediateP1Major feature broken< 1 hourP2Minor feature broken< 4 hoursP3InconvenienceNext day

Who is affected?

Is there tenant isolation risk?

Is there data integrity risk?

Contain First

Disable feature flag

Block problematic route

Rollback deployment

Goal: Stop the bleeding

Establish Repro Signature

One reliable reproduction path

OR log/error signature

Identify Root Cause

What's the smallest failing boundary?

UI / API / DB / RLS / Auth

Fix Strategy

Prefer smallest safe forward-fix

Rollback if safety requires

No "quick hacks" that add risk

Verify

Typecheck passes

Tests pass

Smoke test affected flows

Monitor for recurrence

Postmortem (within 24 hours)

Timeline of events

Root cause

Fix applied

Prevention steps

Output Format

## Incident Report: [Title]



### Severity: P0 / P1 / P2 / P3



### Timeline

| Time | Event |

|------|-------|

| HH:MM | Issue detected |

| HH:MM | Containment applied |

| HH:MM | Root cause identified |

| HH:MM | Fix deployed |

| HH:MM | Verified resolved |



### Blast Radius

- **Users affected:** [count/description]

- **Tenant isolation:** ✅ Intact / ⚠️ At risk

- **Data integrity:** ✅ Intact / ⚠️ At risk



### Containment Action

[What was done to stop the bleeding]



### Root Cause

[Technical description of what failed]



### Fix Applied

```diff

- [old code]

+ [new code]



Verification

 Typecheck passes

 Tests pass

 Smoke test passes

 Monitoring shows resolution

Prevention

Action

Owner

Due

[Action 1]

[Person]

[Date]

[Action 2]

[Person]

[Date]



---



## 32. performance-profiler



```yaml

---

name: performance-profiler

description: "Find and fix slow pages/queries without breaking correctness. Covers Core Web Vitals, React performance patterns, database indexes, N+1 queries, and bundle optimization. Use when pages feel slow or metrics spike."

---



When to Use

Pages feel slow

Core Web Vitals failing

Database queries spiking

Bundle size growing

Users complaining about performance

Performance Targets

Metric

Target

Measure

LCP

< 2.5s

Lighthouse

FID

< 100ms

Lighthouse

CLS

< 0.1

Lighthouse

TTFB

< 800ms

Network tab

Bundle

< 200KB (main)

Bundle analyzer

DB Query

< 100ms

Query logs

Workflow

Identify Slow Path

Which route/page is slow?

Which query is slow?

Which component re-renders?

Profile

Frontend: React DevTools Profiler, Lighthouse

Network: Chrome Network tab, waterfall

Database: Query EXPLAIN, pg_stat_statements

Bundle: Bundle analyzer

Diagnose CategoryCategorySymptomsToolsRenderUI janky, slow interactionsReact ProfilerNetworkLong TTFB, large payloadsNetwork tabDatabaseSlow queries, high latencyEXPLAIN ANALYZEBundleSlow initial loadBundle analyzer

Apply Targeted Fix

Don't optimize everything

Fix the bottleneck only

Measure before and after

Verify No Regression

Behavior unchanged

Tests pass

Performance improved

Common Optimizations

Problem

Solution

N+1 queries

Use joins, batch queries

Missing index

Add index on filter columns

Large bundle

Code split, lazy load

Unnecessary re-renders

memo(), useMemo, useCallback

Large images

WebP, lazy load, srcset

Blocking scripts

defer, async

Layout shifts

Set dimensions, skeleton

Output Format

## Performance Audit: [Page/Feature]



### Current Metrics

| Metric | Value | Target | Status |

|--------|-------|--------|--------|

| LCP | X.Xs | < 2.5s | ✅/❌ |

| FID | Xms | < 100ms | ✅/❌ |

| CLS | X.XX | < 0.1 | ✅/❌ |

| Bundle | XKB | < 200KB | ✅/❌ |



### Bottleneck Identified

**Category:** Render / Network / Database / Bundle

**Specific Issue:** [description]

**Evidence:** [profiler screenshot, slow query, etc.]



### Proposed Fix

```typescript

// Before

[slow code]



// After

[optimized code]



Expected Improvement

Metric

Before

After (Expected)

[Metric]

X

Y

Verification

 Behavior unchanged

 Tests pass

 Metrics improved

 No new regressions

Commands

# Run Lighthouse

npx lighthouse http://localhost:3000 --view



# Analyze bundle

pnpm -w build && pnpm -w analyze





---



# 📚 Documentation & Maintenance (3 Skills)



---



## 33. janitor-mode



```yaml

---

name: janitor-mode

description: "Safe maintenance pass: docs drift cleanup, consistency refactors, test gaps, and ranked fragility report. Does NOT change underwriting math unless explicitly approved. Use for end-of-day cleanup or tech debt reduction."

---



When to Use

End-of-day or end-of-sprint cleanup

Docs drift accumulating

Inconsistent patterns appearing

Test gaps identified

Low-risk refactor window

Safety Rules (Non-Negotiable)

Do NOT change underwriting math or policy semantics

Do NOT change business logic without explicit approval

Prefer: docs, tests, typing, lint fixes, dead code removal

Small batches only

Cleanup Categories

Category

Priority

Risk

Dead code removal

High

Low

Missing tests

High

Low

Docs drift

Medium

Low

Naming consistency

Medium

Low

Type improvements

Medium

Low

Duplicate code

Medium

Medium

Security hygiene

High

Low

Workflow

Inventory + Drift Check

Map key folders

Identify stale docs

Find missing references

Note duplication

Low-Risk Cleanup

Remove dead code

Normalize naming

Consolidate duplicates

Fix lint errors

Add missing types

Test Gap Analysis

Identify untested critical paths

Add/propose tests for math hotspots

Security Hygiene

Scan for committed secrets

Check for risky endpoints

Verify ownership checks

Consolidated Report

Wins achieved

Risks identified (ranked)

Recommended follow-up PRs

Output Format

## Janitor Report: [Date/Sprint]



### Cleanup Completed

| Category | Files Changed | Description |

|----------|---------------|-------------|

| Dead code | 5 | Removed unused components |

| Naming | 3 | Normalized to camelCase |

| Types | 8 | Added missing types |

| Docs | 2 | Updated READMEs |



### Test Gaps Identified

| Area | Current | Recommended | Priority |

|------|---------|-------------|----------|

| Money math | 60% | 100% | P0 |

| API routes | 40% | 80% | P1 |



### Fragility Report (Ranked)

| Risk | Location | Severity | Recommendation |

|------|----------|----------|----------------|

| [Risk 1] | [file] | High | [fix] |

| [Risk 2] | [file] | Medium | [fix] |



### NOT Changed (Requires Approval)

- [ ] Underwriting math

- [ ] Policy rules

- [ ] Business logic



### Verification

```powershell

pnpm -w typecheck

pnpm -w test

pnpm -w build



Recommended Follow-Up PRs

[PR 1 - description]

[PR 2 - description]



---



## 34. janitor-librarian



```yaml

---

name: janitor-librarian

description: "Reduce tech debt and improve investability by keeping docs, maps, and internal references accurate. Use for docs drift, folder sprawl, unclear data flow, or onboarding needs."

---



When to Use

Docs out of sync with code

Folder structure unclear

Data flow undocumented

Onboarding new team members

Investor/audit readiness

Workflow

Generate/Refresh Developer Map

Key folders and their purpose

Where authoritative data lives

Where business truth is computed

Document Data FlowUI → API/Edge → DB → Engine → Trace



Input sources

Transformations

Output destinations

Identify Debt

Dead code

Duplicate utilities

Inconsistent naming

Missing READMEs

Propose Changes

Small safe batches

Docs and non-functional first

Code changes only with approval

Guardrails

Don't change underwriting math

Don't change policy semantics

Prefer documentation over code changes

Output Format

## Documentation Update: [Area]



### Developer Map

| Folder | Purpose | Authority |

|--------|---------|-----------|

| `/src/components` | UI components | Design system |

| `/src/lib/engine` | Underwriting logic | Business truth |

| `/supabase` | Database schemas | Data authority |



### Data Flow



User Input ↓ UI Components (src/components) ↓ API Routes (src/app/api) ↓ Database (Supabase) ↓ Engine (src/lib/engine) ↓ Trace Output



### Docs Updated

| Doc | Change |

|-----|--------|

| README.md | Updated project structure |

| ARCHITECTURE.md | Added data flow diagram |



### Tech Debt Backlog

| Item | Severity | Effort | Status |

|------|----------|--------|--------|

| [Item 1] | High | Medium | Documented |

| [Item 2] | Medium | Low | PR ready |



### Changed Files

- `docs/ARCHITECTURE.md`

- `README.md`

- `src/lib/README.md`



### Verification

[Docs accurately reflect code - manually verified]





35. docs-closeout-roadmap-devlog

---

name: docs-closeout-roadmap-devlog

description: "Keep roadmap + devlog accurate, evidence-backed, and aligned to repo artifacts. Use when features ship, scope changes, or after merges."

---



When to Use

Feature shipped

Scope changed

PR merged

Sprint completed

Status update needed

Workflow

Find Evidence

Exact PR/commit(s)

Migration files

Deployment proof

Update Roadmap

Change status (planned → in progress → shipped)

Add evidence pointers

Note scope changes

Add Devlog Entry

Date

What changed

What remains

Blockers (if any)

Documentation Rules

Never claim "shipped" without evidence

Always link to commits/PRs

Note what's NOT done

Date all entries

Output Format

## Roadmap Update: [Feature]



### Status Change

**From:** In Progress

**To:** Shipped ✅



### Evidence

- PR: #123 - [title](link)

- Commit: abc123 - [message]

- Migration: 20240101_feature.sql



### Devlog Entry

```markdown

## 2024-01-15: [Feature] Shipped



### What Changed

- [Change 1]

- [Change 2]



### What Remains

- [ ] [Remaining task 1]

- [ ] [Remaining task 2]



### Evidence

- PR #123

- Deployed to production: 2024-01-15 10:30 UTC



### Next

- [Next step]



Files Updated

docs/roadmap.md

docs/devlog.md



---



# 📋 Quick Reference Guide



## Skill Selection by Situation



| Situation | Primary Skill | Supporting Skills |

|-----------|---------------|-------------------|

| **Brainstorming** | `creative-problem-solving-studio` | `innovation-experiment-engine` |

| **Major architecture** | `senior-architect` | `code-quality-gatekeeper` |

| **Any deliverable** | `excellence-quality-bar` | - |

| **Writing/reviewing code** | `code-quality-gatekeeper` | `forensic-auditor` |

| **Pre-merge/deploy** | `release-gatekeeper` | `security-guard` |

| **Testing edge cases** | `forensic-auditor` | `test-strategy-architect` |

| **Designing UI** | `uiux-art-director` | `behavioral-design-strategist` |

| **Improving UX** | `behavioral-design-strategist` | `accessibility-champion` |

| **Adding animations** | `motion-choreographer` | `frontend-polisher` |

| **Design system work** | `design-system-orchestrator` | `component-architect` |

| **Polishing UI** | `frontend-polisher` | `uiux-art-director` |

| **Writing UI copy** | `ux-writer` | `error-experience-designer` |

| **Building forms** | `form-experience-designer` | `accessibility-champion` |

| **Error handling** | `error-experience-designer` | `ux-writer` |

| **Mobile/responsive** | `responsive-design-specialist` | `frontend-polisher` |

| **Notifications** | `notification-system-designer` | `ux-writer` |

| **Underwriting changes** | `determinism-audit-enforcer` | `forensic-auditor` |

| **Database/RLS** | `rls-gatekeeper` | `migration-specialist` |

| **Security audit** | `security-guard` | `rls-gatekeeper` |

| **Ethical review** | `ethical-design-guardian` | `ux-writer` |

| **Building features** | `feature-builder-vertical-slice` | `uiux-art-director` |

| **Schema changes** | `migration-specialist` | `rls-gatekeeper` |

| **Adding providers** | `provider-integration-specialist` | `evidence-pack-manager` |

| **Evidence handling** | `evidence-pack-manager` | `determinism-audit-enforcer` |

| **State management** | `state-management-architect` | `component-architect` |

| **Component design** | `component-architect` | `design-system-orchestrator` |

| **Debugging** | `bug-hunter-debugger` | - |

| **Production incident** | `incident-commander` | `bug-hunter-debugger` |

| **Performance issues** | `performance-profiler` | `code-quality-gatekeeper` |

| **Cleanup/maintenance** | `janitor-mode` | `janitor-librarian` |

| **Documentation** | `janitor-librarian` | `docs-closeout-roadmap-devlog` |

| **Updating roadmap** | `docs-closeout-roadmap-devlog` | - |

| **Starting new task** | `dealengine-orientation` | (varies by task) |

| **Understanding code** | `tutor-code-explainer` | - |



---



## The 101/100 Standard



> **"Functional but ugly" is a failure.**

> **"Beautiful but broken" is a failure.**

> **Only "beautiful AND flawless" ships.**



### Design Excellence

- Visually stunning — jaw-dropping, not just "clean"

- Psychologically optimized — reduces friction, amplifies clarity

- Emotionally resonant — users enjoy working in the tool

- Every state polished — loading, empty, error, success



### Code Excellence

- Flawless TypeScript — strict, no `any`

- Zero regressions — ever

- Deterministic — same input, same output

- Secure — RLS-first, least privilege

- Tested — critical paths covered



### Delivery Excellence

- Complete — no "we'll fix it later"

- Documented — future you will thank you

- Verified — typecheck, tests, build pass

- Shippable — production-ready on first deploy



---



*This skills library is a living document. Update as patterns evolve and new needs emerge.*





