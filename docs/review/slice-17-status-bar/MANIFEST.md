# Slice 17: Risk & Evidence Status Bar

## Overview

Horizontal status strip showing risk gates and evidence health at a glance.
Click-through integration with Detail Drawer (Slice 16).

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `GateIcon.tsx` | ~213 | Individual gate status icon with tooltip |
| `RiskStatusCard.tsx` | ~357 | Risk gates summary card (8 gates) |
| `EvidenceStatusCard.tsx` | ~303 | Evidence progress bar with checklist |
| `StatusBar.tsx` | ~131 | Responsive container component |
| `index.ts` | ~23 | Barrel exports |

**Total:** ~1027 lines

**Location:** `apps/hps-dealengine/components/dashboard/status/`

## Skills Applied

- **component-architect**: Atomic components, composition pattern
- **accessibility-champion**: ARIA labels, focus indicators, reduced motion
- **motion-choreographer**: Framer Motion animations, staggered entrance
- **behavioral-design-strategist**: Color-coded status, progressive disclosure
- **uiux-art-director**: Visual hierarchy, preattentive processing

## Component Architecture

```
StatusBar (Container)
├── RiskStatusCard
│   └── GateIcon[] (8 gates)
└── EvidenceStatusCard
    └── Progress bar + stats
```

## Status Types

### Risk Gates (GateIcon)

| Status | Icon | Color | Animation |
|--------|------|-------|-----------|
| pass | ✓ | emerald-400 | none |
| warning | ⚠ | amber-400 | none |
| watch | ⚠ | amber-400 | none |
| fail | ✗ | red-400 | none |
| blocking | ⊘ | red-400 | pulse |
| unknown | ? | zinc-400 | none |

### Evidence Progress (EvidenceStatusCard)

| Range | Color | Label |
|-------|-------|-------|
| 0-25% | red-500 | Critical |
| 25-50% | amber-500 | Low |
| 50-75% | yellow-500 | Medium |
| 75-100% | emerald-500 | Good/Complete |

## Responsive Layout

- **Mobile (<640px)**: Stack vertically (grid-cols-1)
- **Tablet+ (≥640px)**: Side by side (grid-cols-2)

## Accessibility Checklist

- [x] Keyboard navigation (focusable cards)
- [x] ARIA labels on interactive elements
- [x] Focus indicators (3px ring, blue-500)
- [x] `prefers-reduced-motion` respected
- [x] Touch targets ≥ 44px
- [x] Color contrast WCAG AA compliant
- [x] Tooltips on gate icons
- [x] `role="region"` + `aria-label` on container

## Drawer Integration

Both cards use `useDrawer()` hook from Slice 16:

```tsx
const { openDrawer } = useDrawer();

openDrawer({
  title: "Risk Assessment",
  subtitle: "6/8 gates passed",
  content: <RiskGatesDetailContent gates={gates} />,
});
```

## Props Interface

### StatusBar

```typescript
interface StatusBarProps {
  riskSummary?: EnhancedRiskSummary | null;
  riskGates?: RiskGatesResult | null;  // Legacy fallback
  evidenceHealth?: EvidenceHealth | null;
  isDemoMode?: boolean;
  className?: string;
}
```

### RiskStatusCard

```typescript
interface RiskStatusCardProps {
  riskSummary: EnhancedRiskSummary | null | undefined;
  riskGates?: RiskGatesResult | null;
  isDemoMode?: boolean;
  className?: string;
}
```

### EvidenceStatusCard

```typescript
interface EvidenceStatusCardProps {
  evidenceHealth: EvidenceHealth | null | undefined;
  isDemoMode?: boolean;
  className?: string;
}
```

## Verification

- [x] `pnpm -w typecheck` — PASS
- [x] `pnpm -w build` — PASS (42 pages)
- [x] `pnpm -w test` — 214 tests passed

## Polish Applied (v1.0.1)

1. **Critical Count Display**: Shows actual critical missing count instead of generic message
   - Uses `missing_critical.length` for accurate count
   - Display: `{count} critical missing` instead of `Critical evidence missing`

2. **Defensive Field Access**: Uses nullish coalescing for all field access
   - `fresh_count ?? 0`
   - `items?.length ?? 0`
   - `missing_critical?.length ?? (any_critical_missing ? 1 : 0)`

3. **No Mojibake**: Verified clean UTF-8 encoding throughout

## Integration

Add to V25EnhancementsZone as ROW 2 (after ConfidenceBar):

```tsx
import { StatusBar } from "@/components/dashboard/status";

<motion.div variants={itemVariants}>
  <StatusBar
    riskSummary={enhancedRiskSummary}
    riskGates={riskGates}
    evidenceHealth={evidenceHealth}
    isDemoMode={isDemo}
  />
</motion.div>
```

## Design Principles Applied

- **Miller's Law**: 8 gates is within cognitive limit (7±2)
- **Preattentive Processing**: Color-coded status for instant recognition
- **Progressive Disclosure**: Summary → Details via drawer click
- **Gestalt Proximity**: Related status grouped together
- **Information Scent**: Quick status visibility without overwhelming
