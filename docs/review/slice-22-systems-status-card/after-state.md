# AFTER STATE - Slice 22: Systems Status Card
Generated: 2026-01-10

## Files in visualizations/:
total 84
drwxr-xr-x 1 oziha 197609     0 Jan 10 13:25 .
drwxr-xr-x 1 oziha 197609     0 Jan 10 11:42 ..
-rw-r--r-- 1 oziha 197609 15914 Jan 10 12:11 ForeclosureTimelineViz.tsx
-rw-r--r-- 1 oziha 197609  2955 Jan 10 13:25 index.ts
-rw-r--r-- 1 oziha 197609 16765 Jan 10 12:38 LienRiskSummary.tsx
-rw-r--r-- 1 oziha 197609 12174 Jan 10 11:59 MotivationScoreGauge.tsx
-rw-r--r-- 1 oziha 197609 10744 Jan 10 13:18 SystemRULBar.tsx
-rw-r--r-- 1 oziha 197609 10915 Jan 10 13:25 SystemsStatusCard.tsx

## Exports from visualizations/index.ts:
export { MotivationScoreGauge } from './MotivationScoreGauge';
export { ForeclosureTimelineViz } from './ForeclosureTimelineViz';
export { LienRiskSummary } from './LienRiskSummary';
export { SystemRULBar } from './SystemRULBar';
export { SystemsStatusCard } from './SystemsStatusCard';

## SystemsStatusCard accessibility:
- role='region': 2 (empty + main states)
- role='alert': 1 (urgent replacements)
- aria-hidden: 5 (decorative icons)
- aria-label: 2 (region labels)

## Systems displayed:
- Roof (via SystemRULBar)
- HVAC (via SystemRULBar)
- Water Heater (via SystemRULBar)

## Typecheck result:
PASS
