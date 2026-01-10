# Changes Log - Slice 04: Layout Architecture

## Generated
2026-01-10

## Summary
Created 3-column responsive layout architecture for the underwrite page with full accessibility support.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| UnderwriteLayout.tsx | components/underwrite/layout/ | Main 3-column grid wrapper |
| LeftRail.tsx | components/underwrite/layout/ | Navigation sidebar (280px) |
| CenterContent.tsx | components/underwrite/layout/ | Main scrollable form area |
| RightRail.tsx | components/underwrite/layout/ | Outputs summary (240px) |
| index.ts | components/underwrite/layout/ | Barrel export |

## Files Modified

| File | Change |
|------|--------|
| components/underwrite/index.ts | Added `export * from './layout'` |

## Layout Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ [Skip Link - visible on focus]                              │
├──────────┬─────────────────────────────────────┬────────────┤
│          │                                     │            │
│  Left    │                                     │   Right    │
│  Rail    │        Center Content               │   Rail     │
│  280px   │        (flex, max-w-4xl)            │   240px    │
│          │                                     │            │
│ role=    │        role=main                    │ role=      │
│ navigation│                                    │ complementary │
│          │                                     │            │
│ sticky   │        scrollable                   │ sticky     │
│ h-screen │        h-screen                     │ h-screen   │
│          │                                     │            │
└──────────┴─────────────────────────────────────┴────────────┘
```

## Responsive Behavior

| Breakpoint | Columns | Rails Visible |
|------------|---------|---------------|
| < lg (1024px) | 1 | Hidden |
| ≥ lg (1024px) | 3 | Visible |

## Accessibility Features

### WCAG 2.1.1 - Bypass Blocks
- Skip link: "Skip to main content"
- Visible on focus, targets #main-content
- Focus ring styling for visibility

### ARIA Landmarks
- LeftRail: `role="navigation"` + `aria-label="Section navigation"`
- CenterContent: `role="main"` + `aria-label="Underwriting form content"`
- RightRail: `role="complementary"` + `aria-label="Deal outputs and summary"`

### Focus Management
- CenterContent has `tabIndex={-1}` for programmatic focus
- Skip link focus styling with ring offset

## Scroll Behavior

- Center content is primary scroll container
- Rails forward wheel events to center (unified scroll)
- Rails can independently scroll when content overflows
- Custom scrollbar styling for dark theme

## Design Tokens Used
All components import `cn` from `../utils` (established in Slice 03)
