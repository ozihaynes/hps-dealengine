# Changes Log - Slice 07: Compute Motivation Score

## Generated
2026-01-10

## Summary
Created the first engine function for calculating seller motivation score with full determinism, auditability, and edge case handling. Leverages existing type definitions from @hps-internal/contracts.

## Files Created

| File | Location | Purpose | Lines |
|------|----------|---------|-------|
| computeMotivationScore.ts | lib/engine/ | Main engine function | 280 |
| computeMotivationScore.test.ts | lib/engine/ | Unit tests (39 tests) | 572 |
| index.ts | lib/engine/ | Barrel export | 46 |

## Algorithm

```
score = (base_score * timeline_multiplier * decision_maker_factor)
        + distress_bonus + foreclosure_boost
```

Then clamped to 0-100 and rounded to integer.

## Type Definitions Used (from @hps-internal/contracts)

- `ReasonForSelling` - 14 options (foreclosure, pre_foreclosure, divorce, etc.)
- `SellerTimeline` - 5 options (immediate, urgent, flexible, no_rush, testing_market)
- `DecisionMakerStatus` - 6 options (sole_owner, joint_decision, power_of_attorney, etc.)
- `MotivationLevel` - 4 values (low, medium, high, critical)
- `ConfidenceLevel` - 3 values (low, medium, high)
- `MotivationScoreInput` - Input interface
- `MotivationScoreOutput` - Output interface with breakdown

## Scoring Constants (derived from contracts)

**REASON_SCORES** (base points from REASON_FOR_SELLING_OPTIONS.motivationWeight):
- foreclosure: 100, pre_foreclosure: 90, financial_distress: 85
- tax_lien: 85, divorce: 80, job_loss: 80
- code_violations: 75, probate: 70, health_issues: 70
- tired_landlord: 60, inherited: 55, relocation: 50
- downsizing: 40, other: 30

**TIMELINE_MULTIPLIERS** (from SELLER_TIMELINE_OPTIONS.multiplier):
- immediate: 1.5, urgent: 1.3, flexible: 1.0
- no_rush: 0.7, testing_market: 0.3

**DECISION_MAKER_FACTORS** (from DECISION_MAKER_OPTIONS.factor):
- sole_owner: 1.0, joint_decision: 0.9
- power_of_attorney: 0.85, estate_executor: 0.8
- unknown: 0.7, multiple_parties: 0.6

**Other Constants**:
- DEFAULT_BASE_SCORE: 50 (when reason is null)
- DISTRESS_BONUS: 10 (when mortgage_delinquent is true)
- MAX_FORECLOSURE_BOOST: 25 (clamped)

## Motivation Level Thresholds (from contracts/underwrite/constants.ts)

- critical: score >= 85
- high: score >= 65
- medium: score >= 40
- low: score < 40

## Red Flags Detected

- `testing_market` timeline: "Seller may just be testing the market"
- `no_rush` timeline: "No closing urgency - low motivation"
- `multiple_parties`: "Multiple decision makers - harder to close"
- `unknown` decision maker: "Decision maker status unknown - verify authority"

## Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| Determinism | 3 | Same input -> same output (10 iterations) |
| Boundaries | 3 | Score clamped 0-100, boost clamped 0-25 |
| Edge Cases | 4 | null, NaN, partial inputs |
| Algorithm | 6 | Each component tested individually |
| Motivation Level | 4 | Each level threshold tested |
| Confidence | 3 | high/medium/low based on fields provided |
| Red Flags | 6 | Each red flag and combinations |
| Breakdown | 2 | Output structure completeness |
| Constants | 3 | All enum values covered |
| Output Structure | 5 | Type validation |
| **Total** | **39** | |

## Principles Applied

- **DETERMINISM**: Same input -> Same output, always
- **PURITY**: No side effects, no API calls, no state mutations
- **AUDITABILITY**: Returns full breakdown for transparency
- **DEFENSIVE**: Handles null, undefined, NaN gracefully
