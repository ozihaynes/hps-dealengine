# AFTER STATE - Slice 09: Compute Lien Risk
Generated: 2026-01-10

## Files in lib/engine/:
- computeForeclosureTimeline.ts
- computeForeclosureTimeline.test.ts
- computeMotivationScore.ts
- computeMotivationScore.test.ts
- computeLienRisk.ts (NEW)
- computeLienRisk.test.ts (NEW)
- portfolio-utils.ts
- index.ts

## New exports from engine/index.ts:
```typescript
export {
  computeLienRisk,
  LIEN_THRESHOLDS,
  LIEN_BLOCKING_THRESHOLD,
} from './computeLienRisk';

export type {
  LienAccountStatus,
  LienRiskLevel,
  LienRiskInput,
  LienBreakdown,
  LienRiskOutput,
} from './computeLienRisk';
```

## Test count: 44 tests

## Typecheck result: PASS

## Test result: 44 passed, 0 failed
