# AFTER STATE - Slice 07: Compute Motivation Score
Generated: 2026-01-10

## Files created in lib/engine/:
- `computeMotivationScore.ts` - Main engine function (280 lines)
- `computeMotivationScore.test.ts` - Unit tests (572 lines)
- `index.ts` - Barrel export (46 lines)

## Exports from engine/index.ts:

### From computeMotivationScore:
- `computeMotivationScore` - Main function
- `REASON_SCORES` - Map of reason -> base score
- `TIMELINE_MULTIPLIERS` - Map of timeline -> multiplier
- `DECISION_MAKER_FACTORS` - Map of status -> factor
- `DEFAULT_BASE_SCORE` - 50
- `DISTRESS_BONUS` - 10
- `MAX_FORECLOSURE_BOOST` - 25

### From portfolio-utils:
- `deriveVerdict`, `computeMetrics`, `groupByVerdict`
- `formatCurrency`, `formatPercent`, `formatTimeAgo`
- `clampScore`, `extractNumber`, `DEFAULT_METRICS`
- Type exports: `VerdictType`, `DealStatus`, `DealSummary`, `VerdictGroup`, `PortfolioMetrics`

## Test count: 39 tests

## Test categories:
- Determinism: 3 tests
- Boundaries: 3 tests
- Edge Cases: 4 tests
- Algorithm: 6 tests
- Motivation Level: 4 tests
- Confidence: 3 tests
- Red Flags: 6 tests
- Breakdown: 2 tests
- Constants: 3 tests
- Output Structure: 5 tests

## Typecheck result: PASS

## Test result: 39 passed, 0 failed
