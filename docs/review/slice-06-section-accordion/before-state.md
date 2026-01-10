# BEFORE STATE - Slice 06: Section Accordion
Generated: 2026-01-10

## Existing underwrite components:
- CompsPanel.tsx
- DoubleCloseCalculator.tsx
- OverridesPanel.tsx
- RequestOverrideModal.tsx
- ScenarioModeler.tsx
- UnderwriteTab.tsx
- utils/ (tokens.ts, index.ts)
- layout/ (UnderwriteLayout, LeftRail, CenterContent, RightRail)
- hero/ (UnderwriteHero, HeroPlaceholder)

## Existing accordion directory:
Does not exist yet

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

// Hero components
export * from './hero';
```
