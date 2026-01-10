# BEFORE STATE - Slice 19: Motion & Animation
Generated: 2026-01-10

## Motion folder:
Does NOT exist yet — will be created

## Existing motion constants (tokens.ts):
- motion.fast: 150ms
- motion.normal: 200ms
- motion.slow: 300ms
- motion.layout: 500ms

## Existing spring presets (tokens.ts):
- springs.snappy: { type: 'spring', stiffness: 400, damping: 30 }
- springs.gentle: { type: 'spring', stiffness: 200, damping: 25 }
- springs.bouncy: { type: 'spring', stiffness: 300, damping: 20 }

## Existing useMotion hook:
- isReduced: boolean
- getDuration(ms): number
- getDurationSeconds(ms): number
- durations: motion constants or zeros
- springs: spring presets or instant tweens

## framer-motion version:
    "framer-motion": "^12.23.26",
