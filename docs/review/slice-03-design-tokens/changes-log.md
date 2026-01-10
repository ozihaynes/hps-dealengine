# Changes Log - Slice 03: Design Tokens

## Generated
2026-01-10

## Summary
Created design token system for the underwrite page, matching the repairs page aesthetic.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| tokens.ts | components/underwrite/utils/ | Design token definitions |
| index.ts | components/underwrite/utils/ | Barrel export |
| index.ts | components/underwrite/ | Main underwrite barrel |

## Token Categories

### Color Tokens
- `colors.bg` - Background colors (7 variants)
- `colors.border` - Border colors (6 variants)
- `colors.text` - Text colors (10 variants)
- `colors.status` - Status indicator colors (5 levels)
- `colors.interactive` - Button/action colors (4 variants)

### Typography Tokens
- Headings: h1-h5
- Body: body, bodySmall
- Labels: label, labelMuted
- Special: mono, caption, badge

### Spacing Tokens (8pt Grid)
- Gap utilities: xs(4px) → 2xl(48px)
- Padding presets: card, section, input, compact
- Margin presets: stack, stackTight, inline

### Card Tokens
- Base, interactive, elevated card styles
- Header, body, footer sections
- Input, select, textarea field styles

### Focus Tokens (WCAG 2.4.7)
- Ring style for buttons/cards
- Border style for inputs
- Focus-visible for keyboard navigation

### Touch Target Tokens (WCAG 2.5.5)
- 44px minimum touch targets
- Button sizes: standard, large, small
- Icon button preset

### Motion Tokens
- Duration constants: fast (150ms), normal (200ms), slow (300ms), layout (500ms)
- Spring presets for Framer Motion
- useMotion hook with reduced motion support

### Gradient Tokens
- Page background, card shine
- Status gradients: success, warning, error, info
- Skeleton loading gradient

### Shadow Tokens
- Elevation scale: sm → xl
- Glow effects: success, error, warning
- Inset shadow for pressed states

### Z-Index Scale
- Layering: base → dropdown → sticky → modal → popover → toast

## Utility Functions
- `cn()` - Class name combiner
- `getStatusColor()` - Status level to color
- `getMotivationStatus()` - Score to status level
- `getUrgencyStatus()` - Days to status level
- `getRiskStatus()` - Risk level to status

## Accessibility Compliance
- WCAG AA contrast ratios maintained
- 44px touch targets (WCAG 2.5.5)
- prefers-reduced-motion support (WCAG 2.3.3)
- Visible focus indicators (WCAG 2.4.7)

## Design Reference
Tokens align with repairs page design tokens (components/repairs/designTokens.ts):
- Same color palette (slate-900/80 cards, emerald accent)
- Same 8pt grid spacing system
- Same focus ring styling (emerald-500)
- Same 44px touch target minimum
- Same reduced motion hook pattern
