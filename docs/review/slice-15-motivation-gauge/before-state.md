# BEFORE STATE - Slice 15: Motivation Score Gauge
Generated: 2026-01-10

## Check visualizations folder exists:
Directory does not exist yet (will be created in this slice)

## Check useMotion hook exists (Slice 03):
EXISTS in apps/hps-dealengine/components/underwrite/utils/tokens.ts

Hook signature:
```typescript
export function useMotion(): {
  isReduced: boolean;
  getDuration: (duration: number) => number;
  getDurationSeconds: (duration: number) => number;
  durations: typeof motion | { fast: 0; normal: 0; slow: 0; layout: 0 };
  springs: /* spring config or tween config */;
}
```

## Check MotivationScoreOutput type (Slice 02/07):
EXISTS in @hps-internal/contracts:

```typescript
export interface MotivationScoreOutput {
  motivation_score: number;           // 0-100
  motivation_level: MotivationLevel;  // 'low' | 'medium' | 'high' | 'critical'
  confidence: ConfidenceLevel;        // 'low' | 'medium' | 'high'
  red_flags: string[];
  breakdown: {
    base_score: number;
    timeline_multiplier: number;
    decision_maker_factor: number;
    distress_bonus: number;
    foreclosure_boost: number;
  };
}
```

## Check framer-motion installed:
EXISTS in apps/hps-dealengine/package.json:
```json
"framer-motion": "^12.23.26"
```

## Dependencies Status:
- [x] useMotion hook - READY
- [x] MotivationScoreOutput type - READY
- [x] framer-motion - INSTALLED
- [ ] visualizations directory - TO CREATE
