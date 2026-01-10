# BEFORE STATE - Slice 05: Decision Hero Integration
Generated: 2026-01-10

## Existing underwrite components:
- CompsPanel.test.tsx
- UnderwriteTab.test.tsx
- CompsPanel.tsx
- OverridesPanel.tsx
- RequestOverrideModal.tsx
- ScenarioModeler.tsx
- DoubleCloseCalculator.tsx
- UnderwriteTab.tsx
- utils/tokens.ts
- utils/index.ts
- layout/UnderwriteLayout.tsx
- layout/LeftRail.tsx
- layout/CenterContent.tsx
- layout/RightRail.tsx
- layout/index.ts
- index.ts

## Existing hero directory:
Does not exist yet

## Existing DecisionHero location:
apps/hps-dealengine/components/dashboard/hero/DecisionHero.tsx

## Existing analyzeBus location:
apps/hps-dealengine/lib/analyzeBus.ts

## Current underwrite barrel:
```typescript
/**
 * Underwrite Components Barrel Export
 * @module components/underwrite
 */

// Utils (tokens, helpers)
export * from './utils';

// Layout components
export * from './layout';
```
