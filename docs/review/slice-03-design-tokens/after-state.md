# AFTER STATE - Slice 03: Design Tokens
Generated: 2026-01-10

## Files created:

### apps/hps-dealengine/components/underwrite/utils/
- tokens.ts (19,953 bytes) - Comprehensive design token system
- index.ts (416 bytes) - Barrel export for utils

### apps/hps-dealengine/components/underwrite/
- index.ts (133 bytes) - Main underwrite barrel export

## Token categories:
11 exported constants + 1 hook + 4 utility functions

### Constants:
1. colors (bg, border, text, status, interactive)
2. typography (h1-h5, body, labels, special)
3. spacing (gap utilities, padding/margin presets)
4. card (base, interactive, elevated, sections, inputs)
5. focus (ring, border, visible, input)
6. touchTargets (min, button sizes, icon button, control)
7. motion (duration constants)
8. springs (Framer Motion presets)
9. gradients (page, card, status gradients)
10. shadows (elevation scale, glow effects)
11. zIndex (layering scale)

### Hook:
- useMotion() - Reduced motion support with durations and springs

### Utility Functions:
1. cn() - Class name combiner
2. getStatusColor() - Status level to color
3. getMotivationStatus() - Score to status level
4. getUrgencyStatus() - Days to status level
5. getRiskStatus() - Risk level to status

## Accessibility Compliance:

### WCAG 2.5.5 - Touch Targets:
- min-h-[44px] min-w-[44px] defined
- Button sizes: 44px (standard), 48px (large), 36px (small)
- Icon button: 44x44px
- Checkbox/radio wrapper: 44px minimum height

### WCAG 2.4.7 - Focus Visible:
- Ring focus (2px emerald ring with offset)
- Border focus (emerald border)
- Focus-visible for keyboard-only
- Input focus with subtle glow

### WCAG 2.3.3 - Reduced Motion:
- useMotion hook checks prefers-reduced-motion
- Returns 0 duration when reduced motion enabled
- Springs convert to instant tween
- MediaQueryListEvent listener for dynamic changes

## Typecheck result:
PASS - No errors
