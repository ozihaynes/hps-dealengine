# Changes Log - Slice 19: Motion & Animation

## Generated
2026-01-10

## Summary
Created motion/animation system that complements existing tokens.ts constants.
Added EASE curves, animation variants, and motion components.

## Files Created

| File | Purpose |
|------|---------|
| animations.ts | EASE constants, DURATION_SEC, animation variants |
| AnimatedValue.tsx | Spring-animated number display |
| PageTransition.tsx | Page enter/exit wrapper |
| StaggerContainer.tsx | Staggered children animation |
| index.ts | Barrel export |

## Animation Variants

| Variant | Purpose | Properties |
|---------|---------|------------|
| pageVariants | Page enter/exit | y, opacity |
| sectionVariants | Accordion expand/collapse | height, opacity |
| cardVariants | Card hover/tap | y, scale, opacity |
| valueChangeVariants | Number change | y, opacity |
| fadeVariants | Simple fade | opacity |
| scaleVariants | Modal/popover | scale, opacity |
| pulseVariants | Loading pulse | opacity (infinite) |
| spinVariants | Spinner | rotate (infinite) |

## EASE Constants (New)

| Name | Curve | Use Case |
|------|-------|----------|
| linear | [0,0,1,1] | Constant speed |
| easeIn | [0.4,0,1,1] | Slow start |
| easeOut | [0,0,0.2,1] | Slow end (most natural) |
| easeInOut | [0.4,0,0.2,1] | Slow start/end |
| anticipate | [0.36,0,0.66,-0.56] | Pullback before |
| overshoot | [0.34,1.56,0.64,1] | Overshoot then settle |
| bounce | [0.68,-0.55,0.265,1.55] | Bouncy feel |

## DURATION_SEC Constants (Complements tokens.ts)

| Name | Value | tokens.ts equivalent |
|------|-------|---------------------|
| instant | 0 | - |
| micro | 0.1s | - |
| fast | 0.15s | motion.fast (150ms) |
| normal | 0.2s | motion.normal (200ms) |
| slow | 0.3s | motion.slow (300ms) |
| layout | 0.5s | motion.layout (500ms) |

## Components

### AnimatedValue
- Spring physics via useSpring
- NaN/Infinity guard
- aria-live for screen readers
- Configurable stiffness/damping
- Respects reduced motion

### PageTransition
- AnimatePresence wrapper
- Supports 'page' and 'fade' variants
- Respects reduced motion

### StaggerContainer + StaggerItem
- Staggered children animation
- Configurable delay
- Supports div/ul/ol/section
- Respects reduced motion

## Accessibility

All components respect prefers-reduced-motion:
- Check via useMotion() hook
- isReduced: true → instant, no animation
- isReduced: false → animated as designed
