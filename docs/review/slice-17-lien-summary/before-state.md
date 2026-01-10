# BEFORE STATE - Slice 17: Lien Risk Summary
Generated: 2026-01-10

## Current visualizations folder:
- ForeclosureTimelineViz.tsx (Slice 16)
- MotivationScoreGauge.tsx (Slice 15)
- index.ts

## Current visualizations exports:
```typescript
export { MotivationScoreGauge } from './MotivationScoreGauge';
export type { MotivationScoreGaugeProps } from './MotivationScoreGauge';

export { ForeclosureTimelineViz } from './ForeclosureTimelineViz';
export type { ForeclosureTimelineVizProps } from './ForeclosureTimelineViz';
```

## Engine Types to Use:
```typescript
// From @/lib/engine

export interface LienBreakdown {
  hoa: number;
  cdd: number;
  property_tax: number;
  municipal: number;
}

export interface LienRiskOutput {
  total_surviving_liens: number;
  risk_level: LienRiskLevel;
  joint_liability_warning: boolean;
  joint_liability_statute: string | null;
  blocking_gate_triggered: boolean;
  net_clearance_adjustment: number;
  evidence_needed: string[];
  breakdown: LienBreakdown;
}

export type LienRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const LIEN_BLOCKING_THRESHOLD = 10000; // $10,000
```
