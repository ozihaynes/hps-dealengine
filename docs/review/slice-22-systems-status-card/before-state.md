# BEFORE STATE - Slice 22: Systems Status Card
Generated: 2026-01-10

## Key Finding
SystemRULBar.tsx ALREADY EXISTS in visualizations folder.
Only SystemsStatusCard.tsx needs to be created.

## Current visualizations folder:
- ForeclosureTimelineViz.tsx
- LienRiskSummary.tsx
- MotivationScoreGauge.tsx
- SystemRULBar.tsx (EXISTS - not yet exported)
- index.ts

## Current barrel exports (SystemRULBar NOT exported):
 * This module exports visualization components for the underwriting page.
export { MotivationScoreGauge } from './MotivationScoreGauge';
export type { MotivationScoreGaugeProps } from './MotivationScoreGauge';
export { ForeclosureTimelineViz } from './ForeclosureTimelineViz';
export type { ForeclosureTimelineVizProps } from './ForeclosureTimelineViz';
export { LienRiskSummary } from './LienRiskSummary';
export type { LienRiskSummaryProps } from './LienRiskSummary';

## Types to use (from @hps-internal/contracts):
- SystemsStatusOutput
- SystemScore
- SystemCondition: 'good' | 'fair' | 'poor' | 'critical'
