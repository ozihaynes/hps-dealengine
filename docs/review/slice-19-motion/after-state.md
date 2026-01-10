# AFTER STATE - Slice 19: Motion & Animation
Generated: 2026-01-10

## Files in motion/:
total 44
drwxr-xr-x 1 oziha 197609     0 Jan 10 14:25 .
drwxr-xr-x 1 oziha 197609     0 Jan 10 14:22 ..
-rw-r--r-- 1 oziha 197609  5290 Jan 10 14:24 AnimatedValue.tsx
-rw-r--r-- 1 oziha 197609 11184 Jan 10 14:23 animations.ts
-rw-r--r-- 1 oziha 197609  2169 Jan 10 14:25 index.ts
-rw-r--r-- 1 oziha 197609  4285 Jan 10 14:24 PageTransition.tsx
-rw-r--r-- 1 oziha 197609  3938 Jan 10 14:24 StaggerContainer.tsx

## Exports from motion/index.ts:
export {
export { AnimatedValue } from './AnimatedValue';
export { PageTransition } from './PageTransition';
export { StaggerContainer, StaggerItem } from './StaggerContainer';

## Animation variants defined:
export const pageVariants: Variants = {
export const sectionVariants: Variants = {
export const cardVariants: Variants = {
export const valueChangeVariants: Variants = {
export const pulseVariants: Variants = {
export const spinVariants: Variants = {
export const fadeVariants: Variants = {
export const scaleVariants: Variants = {

## DURATION_SEC constants:
export const DURATION_SEC = {
  instant: 0,
  micro: 0.1, // 100ms - hover effects
  fast: 0.15, // 150ms - matches motion.fast
  normal: 0.2, // 200ms - matches motion.normal
  slow: 0.3, // 300ms - matches motion.slow
  layout: 0.5, // 500ms - matches motion.layout
} as const;

## EASE constants:
export const EASE = {
  /** Linear motion (constant speed) */
  linear: [0, 0, 1, 1] as const,
  /** Slow start, fast end */
  easeIn: [0.4, 0, 1, 1] as const,
  /** Fast start, slow end (most natural) */
  easeOut: [0, 0, 0.2, 1] as const,
  /** Slow start and end */
  easeInOut: [0.4, 0, 0.2, 1] as const,
  /** Slight pullback before motion (anticipation) */
  anticipate: [0.36, 0, 0.66, -0.56] as const,

## useMotion for reduced motion:
Files with useMotion: 3
isReduced checks: 10

## Typecheck result:
PASS
