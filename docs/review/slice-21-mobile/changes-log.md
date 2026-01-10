# Changes Log - Slice 21: Mobile Optimization

## Generated
2026-01-10

## Summary
Created mobile-specific components for underwriting page optimization.
All components hidden on desktop (lg:hidden), visible on mobile only.

## Files Created

| File | Purpose |
|------|---------|
| useMobileLayout.ts | Hook for viewport detection + drawer state |
| MobileBottomNav.tsx | Fixed bottom navigation bar |
| MobileOutputDrawer.tsx | Slide-up drawer with drag-to-dismiss |
| index.ts | Barrel export |
| globals.css (modified) | Safe area CSS utilities |

## Components

### useMobileLayout Hook
- Viewport detection at lg breakpoint (1024px)
- Debounced resize listener (100ms)
- Drawer open/close/toggle state
- Current section tracking
- Auto-close drawer on desktop transition
- SSR-safe (defaults to false)

### MobileBottomNav
- 5 navigation buttons (4 sections + Outputs)
- 44px touch targets via touchTargets.min
- Fixed at bottom with z-50
- iOS safe area padding
- aria-current for active section
- aria-expanded for drawer toggle
- Hidden on desktop (lg:hidden)

### MobileOutputDrawer
- Slide-up bottom sheet pattern
- Drag-to-dismiss gesture
- Spring animation via springs.snappy
- Escape key closes drawer
- Body scroll lock when open
- Focus management (close button on open)
- Reduced motion support (useMotion)
- role="dialog" + aria-modal
- Max height 85vh
- Hidden on desktop (lg:hidden)

## CSS Additions (globals.css)
- .pb-safe — padding-bottom: env(safe-area-inset-bottom)
- .pt-safe — padding-top: env(safe-area-inset-top)
- .pl-safe — padding-left: env(safe-area-inset-left)
- .pr-safe — padding-right: env(safe-area-inset-right)

## Accessibility

| Feature | Component | Implementation |
|---------|-----------|----------------|
| Touch targets | MobileBottomNav | touchTargets.min (44px) |
| Touch targets | MobileOutputDrawer | touchTargets.iconButton |
| Focus rings | Both | focus.ring token |
| Active state | MobileBottomNav | aria-current="page" |
| Drawer toggle | MobileBottomNav | aria-expanded |
| Dialog | MobileOutputDrawer | role="dialog" + aria-modal |
| Escape key | MobileOutputDrawer | Closes drawer |
| Reduced motion | MobileOutputDrawer | useMotion + isReduced |
| Safe area | Both | env(safe-area-inset-*) |
