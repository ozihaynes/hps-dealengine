# AFTER STATE - Slice 16: Foreclosure Timeline Visualization
Generated: 2026-01-10

## Files in visualizations/:
- ForeclosureTimelineViz.tsx (NEW - Slice 16)
- MotivationScoreGauge.tsx (from Slice 15)
- index.ts (barrel export - updated)

## Exports from visualizations/index.ts:
```typescript
export { MotivationScoreGauge } from './MotivationScoreGauge';
export type { MotivationScoreGaugeProps } from './MotivationScoreGauge';

export { ForeclosureTimelineViz } from './ForeclosureTimelineViz';
export type { ForeclosureTimelineVizProps } from './ForeclosureTimelineViz';
```

## Accessibility features:
- role='progressbar': 1 (on container)
- aria-valuenow: 1 (stage index + 1)
- aria-valuemin: 1
- aria-valuemax: 7 (totalStages)
- aria-label: 1 (descriptive text)
- aria-hidden: 7 (decorative icons and elements)
- isReduced: 3 uses (respects prefers-reduced-motion)

## FL Statute references:
- FL 702.10 (main lis pendens reference)
- FL 702.10(1) - Pre-Foreclosure
- FL 702.10(2) - Lis Pendens Filed
- FL 45.031 - Judgment Entered
- FL 45.031(1) - Sale Scheduled
- FL 45.0315 - Redemption Period

## Timeline Stages (7 total):
| Stage ID | Label | Statute |
|----------|-------|---------|
| not_in_foreclosure | Not in Foreclosure | - |
| pre_foreclosure | Pre-Foreclosure | FL 702.10(1) |
| lis_pendens | Lis Pendens Filed | FL 702.10(2) |
| judgment | Judgment Entered | FL 45.031 |
| sale_scheduled | Sale Scheduled | FL 45.031(1) |
| redemption_period | Redemption Period | FL 45.0315 |
| reo_bank_owned | REO Bank Owned | - |

## Typecheck result:
PASS - No errors
