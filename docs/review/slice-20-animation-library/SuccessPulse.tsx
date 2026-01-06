/**
 * SuccessPulse Component
 *
 * Adds a subtle pulsing glow effect to its children.
 * Used for PURSUE verdict states and success confirmations.
 * Respects reduced motion preferences.
 *
 * @module components/animations/SuccessPulse
 * @version 1.0.0 (Slice 20 - Animation Library Enhancement)
 */

'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { prefersReducedMotion } from '@/lib/animations/tokens';

// =============================================================================
// TYPES
// =============================================================================

export type PulseColor = 'success' | 'warning' | 'info' | 'custom';

export interface SuccessPulseProps {
  /** Content to wrap with pulse effect */
  children: React.ReactNode;
  /** Whether to animate */
  isActive?: boolean;
  /** Pulse color variant */
  color?: PulseColor;
  /** Custom color (used when color="custom") */
  customColor?: string;
  /** Pulse intensity (glow size in px) */
  intensity?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay between pulses in seconds */
  repeatDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COLOR MAPPINGS
// =============================================================================

const colorMap: Record<Exclude<PulseColor, 'custom'>, string> = {
  success: '16, 185, 129',  // Emerald-500
  warning: '245, 158, 11',  // Amber-500
  info: '59, 130, 246',     // Blue-500
};

// =============================================================================
// VARIANTS
// =============================================================================

function createPulseVariants(
  color: string,
  intensity: number,
  duration: number,
  repeatDelay: number
): Variants {
  return {
    idle: {
      boxShadow: `0 0 0 0 rgba(${color}, 0)`,
    },
    pulse: {
      boxShadow: [
        `0 0 0 0 rgba(${color}, 0)`,
        `0 0 0 ${intensity}px rgba(${color}, 0.15)`,
        `0 0 0 0 rgba(${color}, 0)`,
      ],
      transition: {
        duration,
        repeat: Infinity,
        repeatDelay,
        ease: 'easeInOut',
      },
    },
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SuccessPulse - Wraps content with a pulsing glow effect
 *
 * @example
 * ```tsx
 * // Success state (default)
 * <SuccessPulse isActive={isPursue}>
 *   <VerdictChip verdict="PURSUE" />
 * </SuccessPulse>
 *
 * // Warning state
 * <SuccessPulse isActive={needsAttention} color="warning">
 *   <StatusBadge status="needs_review" />
 * </SuccessPulse>
 *
 * // Custom color
 * <SuccessPulse isActive color="custom" customColor="147, 51, 234">
 *   <Badge>New</Badge>
 * </SuccessPulse>
 * ```
 */
export function SuccessPulse({
  children,
  isActive = true,
  color = 'success',
  customColor,
  intensity = 8,
  duration = 2,
  repeatDelay = 3,
  className = '',
  style,
}: SuccessPulseProps): React.ReactElement {
  const shouldReduceMotion = prefersReducedMotion();

  // Get color value
  const colorValue = color === 'custom' && customColor
    ? customColor
    : colorMap[color as Exclude<PulseColor, 'custom'>] ?? colorMap.success;

  // Create variants
  const variants = createPulseVariants(colorValue, intensity, duration, repeatDelay);

  // Reduced motion: render without animation
  if (shouldReduceMotion || !isActive) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      initial="idle"
      animate="pulse"
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// SPECIALIZED COMPONENTS
// =============================================================================

/**
 * WarningPulse - Warning variant of SuccessPulse
 */
export interface WarningPulseProps extends Omit<SuccessPulseProps, 'color' | 'customColor'> {}

export function WarningPulse(props: WarningPulseProps): React.ReactElement {
  return <SuccessPulse {...props} color="warning" />;
}

/**
 * InfoPulse - Info variant of SuccessPulse
 */
export interface InfoPulseProps extends Omit<SuccessPulseProps, 'color' | 'customColor'> {}

export function InfoPulse(props: InfoPulseProps): React.ReactElement {
  return <SuccessPulse {...props} color="info" />;
}

/**
 * PulseRing - Standalone pulse ring (no children)
 *
 * Useful for status indicators and loading states
 */
export interface PulseRingProps {
  /** Size of the ring in px */
  size?: number;
  /** Color variant */
  color?: PulseColor;
  /** Custom color */
  customColor?: string;
  /** Whether to animate */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PulseRing({
  size = 12,
  color = 'success',
  customColor,
  isActive = true,
  className = '',
}: PulseRingProps): React.ReactElement {
  const shouldReduceMotion = prefersReducedMotion();

  // Get color value
  const colorValue = color === 'custom' && customColor
    ? customColor
    : colorMap[color as Exclude<PulseColor, 'custom'>] ?? colorMap.success;

  // Background color for the dot
  const bgColor = `rgb(${colorValue})`;

  // Reduced motion: static dot
  if (shouldReduceMotion || !isActive) {
    return (
      <div
        className={`rounded-full ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor,
        }}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: bgColor }}
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Center dot */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: bgColor }}
      />
    </div>
  );
}

export default SuccessPulse;
