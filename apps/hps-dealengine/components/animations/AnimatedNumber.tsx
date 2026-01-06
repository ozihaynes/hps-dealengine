/**
 * AnimatedNumber Component
 *
 * Displays a number with count-up animation and slot-machine style
 * digit transitions. Respects reduced motion preferences.
 *
 * @module components/animations/AnimatedNumber
 * @version 1.0.0 (Slice 20 - Animation Library Enhancement)
 */

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountUp, type UseCountUpOptions } from '@/lib/animations/useCountUp';
import { DURATION, EASING, prefersReducedMotion } from '@/lib/animations/tokens';

// =============================================================================
// TYPES
// =============================================================================

export interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number;
  /** Starting value (default: 0) */
  from?: number;
  /** Animation duration in seconds (default: 0.8) */
  duration?: number;
  /** Delay before animation starts in seconds */
  delay?: number;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Custom formatter function */
  formatter?: (value: number) => string;
  /** Prefix (e.g., "$") */
  prefix?: string;
  /** Suffix (e.g., "%", "K") */
  suffix?: string;
  /** Additional CSS classes */
  className?: string;
  /** Animation style */
  variant?: 'countup' | 'slot';
  /** Callback when animation completes */
  onComplete?: () => void;
}

// =============================================================================
// SLOT MACHINE ANIMATION (Individual Digits)
// =============================================================================

interface SlotDigitProps {
  digit: string;
  delay: number;
}

function SlotDigit({ digit, delay }: SlotDigitProps): React.ReactElement {
  const shouldReduceMotion = prefersReducedMotion();

  if (shouldReduceMotion) {
    return <span>{digit}</span>;
  }

  return (
    <span className="inline-block overflow-hidden relative" style={{ height: '1em' }}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{
            duration: DURATION.fast,
            ease: EASING.decelerate,
            delay,
          }}
          className="inline-block"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// =============================================================================
// SLOT MACHINE NUMBER DISPLAY
// =============================================================================

interface SlotNumberProps {
  value: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function SlotNumber({ value, prefix, suffix, className }: SlotNumberProps): React.ReactElement {
  const digits = value.split('');
  const staggerDelay = 0.02; // 20ms between each digit

  return (
    <span className={className}>
      {prefix && <span>{prefix}</span>}
      {digits.map((digit, index) => (
        <SlotDigit
          key={`${index}-${digit}`}
          digit={digit}
          delay={index * staggerDelay}
        />
      ))}
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AnimatedNumber - Displays a number with smooth animation
 *
 * @example
 * ```tsx
 * // Basic count-up
 * <AnimatedNumber value={18500} />
 *
 * // With currency formatting
 * <AnimatedNumber value={185000} prefix="$" />
 *
 * // Percentage
 * <AnimatedNumber value={85.5} decimals={1} suffix="%" />
 *
 * // Slot machine style
 * <AnimatedNumber value={1234} variant="slot" />
 * ```
 */
export function AnimatedNumber({
  value,
  from = 0,
  duration = DURATION.slower,
  delay = 0,
  decimals = 0,
  formatter,
  prefix = '',
  suffix = '',
  className = '',
  variant = 'countup',
  onComplete,
}: AnimatedNumberProps): React.ReactElement {
  // Default formatter with decimals support
  const defaultFormatter = useMemo(() => {
    return (v: number) => {
      return v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };
  }, [decimals]);

  // Use count-up animation
  const {
    value: animatedValue,
    isAnimating,
  } = useCountUp({
    start: from,
    end: value,
    duration,
    delay,
    decimals,
    formatter: formatter ?? defaultFormatter,
    onComplete,
  });

  // Render based on variant
  if (variant === 'slot') {
    return (
      <SlotNumber
        value={animatedValue}
        prefix={prefix}
        suffix={suffix}
        className={className}
      />
    );
  }

  // Default count-up variant
  return (
    <span className={className}>
      {prefix}
      {animatedValue}
      {suffix}
    </span>
  );
}

// =============================================================================
// SPECIALIZED COMPONENTS
// =============================================================================

/**
 * AnimatedCurrency - Specialized for currency display
 */
export interface AnimatedCurrencyProps {
  value: number;
  currency?: string;
  decimals?: number;
  className?: string;
  duration?: number;
  delay?: number;
  onComplete?: () => void;
}

export function AnimatedCurrency({
  value,
  currency = 'USD',
  decimals = 0,
  className = '',
  duration,
  delay,
  onComplete,
}: AnimatedCurrencyProps): React.ReactElement {
  const formatter = useMemo(() => {
    return (v: number) =>
      v.toLocaleString('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  }, [currency, decimals]);

  return (
    <AnimatedNumber
      value={value}
      decimals={decimals}
      formatter={formatter}
      className={className}
      duration={duration}
      delay={delay}
      onComplete={onComplete}
    />
  );
}

/**
 * AnimatedPercentage - Specialized for percentage display
 */
export interface AnimatedPercentageProps {
  value: number;
  decimals?: number;
  className?: string;
  duration?: number;
  delay?: number;
  onComplete?: () => void;
}

export function AnimatedPercentage({
  value,
  decimals = 0,
  className = '',
  duration,
  delay,
  onComplete,
}: AnimatedPercentageProps): React.ReactElement {
  return (
    <AnimatedNumber
      value={value}
      decimals={decimals}
      suffix="%"
      className={className}
      duration={duration}
      delay={delay}
      onComplete={onComplete}
    />
  );
}

export default AnimatedNumber;
