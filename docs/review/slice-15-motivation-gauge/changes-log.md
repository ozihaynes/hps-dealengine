# Changes Log - Slice 15: Motivation Score Gauge

## Generated
2026-01-10

## Summary
Created the first visualization component for Phase 4 - a semi-circular SVG
gauge that displays the motivation score with animated fill, color-coded
levels, and full accessibility support.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| MotivationScoreGauge.tsx | visualizations/ | Main gauge component |
| index.ts | visualizations/ | Barrel export |

## Files Modified
None - all dependencies already existed.

## Features

### SVG-Based Gauge
- Semi-circular arc (180 degrees)
- Background track (slate-800)
- Foreground fill with level color
- Configurable size (default 200px)
- Stroke width: 14px
- Rounded stroke caps

### Animation
- Framer Motion spring animation
- pathLength animation for smooth arc fill
- Spring config: stiffness=80, damping=25, mass=1
- Respects prefers-reduced-motion via useMotion hook
- Falls back to static rendering when motion is reduced

### Level Colors
| Level | Stroke | Badge BG | Badge Text |
|-------|--------|----------|------------|
| critical | #ef4444 (red-500) | bg-red-500/20 | text-red-400 |
| high | #f59e0b (amber-500) | bg-amber-500/20 | text-amber-400 |
| medium | #3b82f6 (blue-500) | bg-blue-500/20 | text-blue-400 |
| low | #64748b (slate-500) | bg-slate-500/20 | text-slate-400 |

### Accessibility (WCAG AA)
- role="meter" on container div
- aria-valuenow with current score (clamped 0-100)
- aria-valuemin={0}
- aria-valuemax={100}
- aria-label with descriptive text: "Motivation score: X out of 100, Y level"
- aria-hidden="true" on decorative SVG
- useMotion hook for prefers-reduced-motion

### Display Elements
- Large score number (centered in gauge)
- "out of 100" label (below score)
- Min/max labels (0/100 at arc endpoints)
- Level badge with uppercase label (pill style)
- Optional confidence indicator badge

### Component Props
```typescript
interface MotivationScoreGaugeProps {
  output: MotivationScoreOutput | null;  // From engine
  size?: number;                          // Default 200px
  showConfidence?: boolean;               // Default true
  className?: string;                     // Optional styling
}
```

## Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| framer-motion | npm (^12.23.26) | Spring animation |
| useMotion | @/components/underwrite/utils | Reduced motion detection |
| MotivationScoreOutput | @hps-internal/contracts | Type definition |

## SVG Helper Functions
- `polarToCartesian(cx, cy, radius, angle)` - Convert polar to Cartesian coordinates
- `createArcPath(cx, cy, radius, startAngle, endAngle)` - Create SVG arc path data
- `cn(...classes)` - Combine class names

## Usage Example
```tsx
import { MotivationScoreGauge } from '@/components/underwrite/visualizations';

<MotivationScoreGauge
  output={{
    motivation_score: 75,
    motivation_level: 'high',
    confidence: 'medium',
    red_flags: [],
    breakdown: { ... }
  }}
  size={200}
  showConfidence={true}
/>
```
