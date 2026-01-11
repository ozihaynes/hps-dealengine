/**
 * State Components Barrel Export
 * @module components/underwrite/states
 * @slice 20 of 22
 *
 * Components for handling error and loading states.
 * All motion components respect prefers-reduced-motion.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';

export { InlineError } from './InlineError';
export type { InlineErrorProps } from './InlineError';

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING STATES
// ═══════════════════════════════════════════════════════════════════════════════

export { SkeletonCard } from './SkeletonCard';
export type { SkeletonCardProps } from './SkeletonCard';

export { SectionSkeleton } from './SectionSkeleton';
export type { SectionSkeletonProps } from './SectionSkeleton';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';
