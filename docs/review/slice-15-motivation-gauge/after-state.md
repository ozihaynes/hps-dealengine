# AFTER STATE - Slice 15: Motivation Score Gauge
Generated: 2026-01-10

## Files in visualizations/:
```
MotivationScoreGauge.tsx
index.ts
```

## Exports from visualizations/index.ts:
- `MotivationScoreGauge` - Main gauge component
- `MotivationScoreGaugeProps` - Component props type

## Accessibility features:
- role='meter': 1 (on container div)
- aria-valuenow: 1 (dynamic score value)
- aria-valuemin: 1 (0)
- aria-valuemax: 1 (100)
- aria-label: 1 (descriptive text with score and level)
- aria-hidden on SVG: 1 (decorative element)
- useMotion hook: 5 occurrences (reduced motion detection and usage)

## Level Color Mapping:
| Level | Stroke Color | Badge Classes |
|-------|-------------|---------------|
| critical | #ef4444 (red-500) | bg-red-500/20, text-red-400 |
| high | #f59e0b (amber-500) | bg-amber-500/20, text-amber-400 |
| medium | #3b82f6 (blue-500) | bg-blue-500/20, text-blue-400 |
| low | #64748b (slate-500) | bg-slate-500/20, text-slate-400 |

## Animation Config:
```typescript
springConfig = { stiffness: 80, damping: 25, mass: 1 }
```

## Typecheck result:
PASS - No errors
