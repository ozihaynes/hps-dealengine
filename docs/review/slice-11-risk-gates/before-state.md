# BEFORE STATE - Slice 11: Risk Gates Integration
Generated: 2026-01-10

## Existing engine files:

```
apps/hps-dealengine/lib/engine/
├── computeForeclosureTimeline.test.ts
├── computeForeclosureTimeline.ts
├── computeLienRisk.test.ts
├── computeLienRisk.ts
├── computeMotivationScore.test.ts
├── computeMotivationScore.ts
├── computeSystemsStatus.test.ts
├── computeSystemsStatus.ts
├── index.ts
└── portfolio-utils.ts
```

## Current engine exports:

```typescript
// Slice 07: Motivation Score
export { computeMotivationScore, ... } from './computeMotivationScore';

// Slice 08: Foreclosure Timeline
export { computeForeclosureTimeline, ... } from './computeForeclosureTimeline';

// Slice 09: Lien Risk
export { computeLienRisk, LIEN_THRESHOLDS, LIEN_BLOCKING_THRESHOLD } from './computeLienRisk';

// Slice 10: Systems Status
export { computeSystemsStatus, ... } from './computeSystemsStatus';
```

## Key types from existing engine functions:

### MotivationScoreOutput (from computeMotivationScore):
- `motivation_score: number` (0-100)

### ForeclosureTimelineOutput (from computeForeclosureTimeline):
- `days_until_estimated_sale: number | null`

### LienRiskOutput (from computeLienRisk):
- `total_surviving_liens: number`
- `joint_liability_warning: boolean`

## Constants:
- `LIEN_BLOCKING_THRESHOLD = 10000` (from computeLienRisk)

## Risk gate types:
- Not yet defined in contracts or engine
