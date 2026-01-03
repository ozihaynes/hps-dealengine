# SLICE 3: Verdict Engine — Review Document

**Date:** 2026-01-03
**Status:** Complete
**Author:** Claude Code

## Overview

This slice implements the `deriveDealVerdict()` function for the V2.5 Wholesaler Dashboard. It derives the deal verdict (pursue / needs_evidence / pass) based on workflow state, risk gates, spread, price geometry (ZOPA), and confidence grade.

The verdict is the PRIMARY decision signal shown in the Trading Strip.

## Files Created/Modified

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/engine/src/slices/verdict.ts` | 487 | Core verdict derivation function |
| `packages/engine/src/__tests__/verdict.spec.ts` | 785 | Unit tests (58 test cases) |

### Modified Files

| File | Change |
|------|--------|
| `packages/engine/src/index.ts` | Added exports for verdict slice |

## API Surface

### deriveDealVerdict(input, policy?)

Main derivation function that produces a `DealVerdict` output with trace entry.

```typescript
import { deriveDealVerdict, DEFAULT_DEAL_VERDICT_POLICY } from '@hps-internal/engine';

const result = deriveDealVerdict({
  workflowState: 'ReadyForOffer',
  riskSummary: { overall: 'GO', any_blocking: false },
  evidenceSummary: { any_blocking: false, missing_critical: [] },
  spreadCash: 25000,
  confidenceGrade: 'A',
  priceGeometry: { zopa_exists: true, zopa_pct_of_arv: 8 }
});

// result.verdict.recommendation = 'pursue'
// result.verdict.confidence_pct = 92
// result.traceEntry contains audit trail data
```

### Policy Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `minSpreadForPursue` | 15000 | Minimum spread ($) for pursue |
| `minSpreadForEvidence` | 5000 | Minimum spread ($) for needs_evidence |
| `minZopaPctForPursue` | 3.0 | Minimum ZOPA % of ARV for pursue |
| `lowConfidenceGrade` | "C" | Grade that triggers needs_evidence |
| `blockOnAnyRiskStop` | true | Block on any STOP gate |
| `dealKillerGates` | ["title", "bankruptcy", "compliance"] | Always-blocking gates |

### Input Interface

```typescript
interface DealVerdictInput {
  workflowState: 'NeedsInfo' | 'NeedsReview' | 'ReadyForOffer' | null;
  riskSummary: RiskSummaryInput | null;
  evidenceSummary: EvidenceSummaryInput | null;
  spreadCash: number | null;
  confidenceGrade: 'A' | 'B' | 'C' | null;
  priceGeometry: PriceGeometry | null;
}

interface RiskSummaryInput {
  overall: 'GO' | 'WATCH' | 'STOP' | 'UNKNOWN';
  any_blocking?: boolean;
  gates?: Record<string, { status: string; reason?: string }>;
}

interface EvidenceSummaryInput {
  any_blocking?: boolean;
  missing_critical?: string[];
}
```

### Output Interface

Returns a `DealVerdictResult` containing:
- `verdict`: Full `DealVerdict` object matching contract schema
- `traceEntry`: `TraceEntry` for audit trail

## Decision Hierarchy

The verdict is determined in priority order:

### 1. PASS Conditions (Deal-Killers)
- Any risk gate STOP (if `blockOnAnyRiskStop = true`)
- Deal-killer gates (title, bankruptcy, compliance) are STOP
- No ZOPA exists
- ZOPA percentage below threshold
- Spread below minimum evidence threshold

### 2. NEEDS_EVIDENCE Conditions
- Workflow state is NeedsInfo
- Confidence grade is C (or configured low grade)
- Missing critical evidence
- Evidence freshness is blocking
- Workflow state is NeedsReview
- Spread below pursue threshold but above pass threshold

### 3. PURSUE (All Conditions Met)
- No blocking factors
- ZOPA exists with sufficient percentage
- Spread meets threshold
- Confidence grade A or B

## Primary Reason Codes

| Code | Triggered By |
|------|--------------|
| `RISK_BLOCK` | Risk gate STOP |
| `NO_ZOPA` | No ZOPA exists |
| `LOW_SPREAD` | Spread below threshold |
| `DEAL_KILLER` | Deal-killer gate STOP |
| `WORKFLOW_INCOMPLETE` | Workflow state issues |
| `MISSING_EVIDENCE` | Missing critical evidence |
| `LOW_CONFIDENCE` | Low confidence grade |
| `EVIDENCE_NEEDED` | Other evidence issues |
| `ALL_CLEAR` | Pursue eligible |

## Test Coverage

| Category | Tests | Pass |
|----------|-------|------|
| PASS verdicts (deal-killers) | 9 | ✓ |
| NEEDS_EVIDENCE verdicts | 8 | ✓ |
| PURSUE verdicts | 6 | ✓ |
| Trace entry emission | 7 | ✓ |
| Custom policy handling | 5 | ✓ |
| Priority ordering | 3 | ✓ |
| Edge cases | 7 | ✓ |
| Primary reason codes | 6 | ✓ |
| Input validation | 7 | ✓ |
| **Total** | **58** | ✓ |

## Confidence Calculation

### PASS Verdicts
- Fixed at 95% (high confidence this is a pass)

### NEEDS_EVIDENCE Verdicts
- Base: 60%
- -5% per additional reason (max -20%)
- +10% for Grade B, -10% for Grade C
- Range: 30-75%

### PURSUE Verdicts
- Grade A: 92%
- Grade B: 80%
- +5% for wide ZOPA (> 10% of ARV)
- Max: 98%

## Integration Notes

### Wiring in Engine

To integrate with `computeUnderwriting()`:

```typescript
import { deriveDealVerdict } from './slices/verdict';

// After computing all outputs:
const verdictResult = deriveDealVerdict({
  workflowState: outputs.workflow_state,
  riskSummary: outputs.risk_summary,
  evidenceSummary: outputs.evidence_summary,
  spreadCash: outputs.spread_cash,
  confidenceGrade: outputs.confidence_grade,
  priceGeometry: outputs.price_geometry,
});

outputs.verdict = verdictResult.verdict;
trace.push(verdictResult.traceEntry);
```

### Trace Frame

The function emits a `DEAL_VERDICT` trace entry with:
- All input values
- Evaluation (pass_reasons, needs_evidence_reasons, pursue_eligible)
- Result (recommendation, confidence_pct, primary_reason_code)
- Status flags (spread_adequate, evidence_complete, risk_acceptable)
- Policy tokens used

## Relationship to Existing deriveVerdict

Note: There is an existing `deriveVerdict()` function in `snapshot_computations.ts` for the Command Center V2.1 snapshot system. That function:
- Returns verdicts: `GO`, `HOLD`, `PASS`, `PROCEED_WITH_CAUTION`
- Uses different inputs (closeabilityIndex, urgencyScore, riskAdjustedSpread)

The new `deriveDealVerdict()` function:
- Returns verdicts: `pursue`, `needs_evidence`, `pass` (lowercase)
- Uses V2.5 inputs (risk gates, price geometry, evidence summary)
- Is designed for the Trading Strip decision display

Both functions coexist and serve different purposes.

## Breaking Changes

None. This is an additive change only.

## Dependencies

- `@hps-internal/contracts` for `DealVerdict` and `PriceGeometry` types
- Uses existing `TraceEntry` type from engine/types

## Exports Added

```typescript
export {
  deriveDealVerdict,
  validateDealVerdictInput,
  DEFAULT_DEAL_VERDICT_POLICY,
  type DealVerdictPolicy,
  type DealVerdictInput,
  type DealVerdictResult,
  type RiskSummaryInput,
  type EvidenceSummaryInput,
} from './slices/verdict';
```

## Next Steps

1. Wire `deriveDealVerdict()` into `compute_underwriting.ts`
2. Create UI component `VerdictChip` to display recommendation
3. Integrate verdict into Trading Strip view
4. Add feature flag for gradual rollout
