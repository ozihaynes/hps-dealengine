/**
 * ShimmerEffect — Loading shimmer animation component
 *
 * A standalone shimmer effect that can be used as a building block
 * for skeleton loading states. Respects reduced motion preferences.
 *
 * Features:
 * - GPU-accelerated gradient animation
 * - Reduced motion support (falls back to pulse)
 * - Configurable colors and timing
 * - Multiple shape presets
 *
 * @module components/loading/ShimmerEffect
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import { prefersReducedMotion } from '@/lib/animations/tokens';

// =============================================================================
// TYPES
// =============================================================================

export interface ShimmerEffectProps {
  /** Width of shimmer element */
  width?: string | number;
  /** Height of shimmer element */
  height?: string | number;
  /** Border radius (or 'full' for circle) */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | string;
  /** Animation duration in seconds */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ROUNDED_MAP: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const shimmerVariant = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: '-200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  },
};

const pulseVariant = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ShimmerEffect - Animated loading shimmer
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ShimmerEffect width={200} height={20} />
 *
 * // Circle avatar placeholder
 * <ShimmerEffect width={48} height={48} rounded="full" />
 *
 * // Full-width text line
 * <ShimmerEffect width="100%" height={16} rounded="md" />
 * ```
 */
export const ShimmerEffect = memo(function ShimmerEffect({
  width = '100%',
  height = 16,
  rounded = 'md',
  duration = 1.5,
  className,
  testId,
}: ShimmerEffectProps): React.ReactElement {
  const shouldReduceMotion = prefersReducedMotion();
  const roundedClass = ROUNDED_MAP[rounded] ?? rounded;

  const style: React.CSSProperties = {
    width,
    height,
  };

  // Reduced motion: static pulse instead of sliding shimmer
  if (shouldReduceMotion) {
    return (
      <motion.div
        variants={pulseVariant}
        initial="initial"
        animate="animate"
        className={cn(
          'bg-slate-700/60',
          roundedClass,
          className
        )}
        style={style}
        data-testid={testId ?? 'shimmer-effect'}
        data-reduced-motion="true"
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      variants={shimmerVariant}
      initial="initial"
      animate="animate"
      className={cn(
        'bg-gradient-to-r from-slate-700/60 via-slate-600/60 to-slate-700/60',
        'bg-[length:200%_100%]',
        roundedClass,
        className
      )}
      style={{
        ...style,
        animationDuration: `${duration}s`,
      }}
      data-testid={testId ?? 'shimmer-effect'}
      aria-hidden="true"
    />
  );
});

// =============================================================================
// PRESET COMPONENTS
// =============================================================================

/**
 * ShimmerText - Single line text skeleton
 */
export interface ShimmerTextProps {
  width?: string | number;
  height?: number;
  className?: string;
}

export const ShimmerText = memo(function ShimmerText({
  width = '100%',
  height = 14,
  className,
}: ShimmerTextProps): React.ReactElement {
  return (
    <ShimmerEffect
      width={width}
      height={height}
      rounded="sm"
      className={className}
      testId="shimmer-text"
    />
  );
});

/**
 * ShimmerHeading - Heading skeleton (taller)
 */
export const ShimmerHeading = memo(function ShimmerHeading({
  width = '60%',
  height = 24,
  className,
}: ShimmerTextProps): React.ReactElement {
  return (
    <ShimmerEffect
      width={width}
      height={height}
      rounded="md"
      className={className}
      testId="shimmer-heading"
    />
  );
});

/**
 * ShimmerAvatar - Circular avatar skeleton
 */
export interface ShimmerAvatarProps {
  size?: number;
  className?: string;
}

export const ShimmerAvatar = memo(function ShimmerAvatar({
  size = 40,
  className,
}: ShimmerAvatarProps): React.ReactElement {
  return (
    <ShimmerEffect
      width={size}
      height={size}
      rounded="full"
      className={className}
      testId="shimmer-avatar"
    />
  );
});

/**
 * ShimmerButton - Button-shaped skeleton
 */
export interface ShimmerButtonProps {
  width?: string | number;
  height?: number;
  className?: string;
}

export const ShimmerButton = memo(function ShimmerButton({
  width = 100,
  height = 44,
  className,
}: ShimmerButtonProps): React.ReactElement {
  return (
    <ShimmerEffect
      width={width}
      height={height}
      rounded="lg"
      className={className}
      testId="shimmer-button"
    />
  );
});

/**
 * ShimmerBadge - Small badge/chip skeleton
 */
export interface ShimmerBadgeProps {
  width?: number;
  className?: string;
}

export const ShimmerBadge = memo(function ShimmerBadge({
  width = 60,
  className,
}: ShimmerBadgeProps): React.ReactElement {
  return (
    <ShimmerEffect
      width={width}
      height={22}
      rounded="full"
      className={className}
      testId="shimmer-badge"
    />
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default ShimmerEffect;
