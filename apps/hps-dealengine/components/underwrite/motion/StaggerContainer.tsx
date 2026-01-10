/**
 * StaggerContainer - Animate children with staggered delays
 * @module components/underwrite/motion/StaggerContainer
 * @slice 19 of 22
 *
 * Container that staggers children animations.
 * Each child animates in sequence with configurable delay.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Motion: Staggered entry feels natural
 * - Disney: Secondary action principle
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '../utils';
import { staggerContainer, staggerItem } from './animations';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StaggerContainerProps {
  /** Children to stagger */
  children: React.ReactNode;
  /** Delay between each child (seconds) */
  staggerDelay?: number;
  /** Optional className */
  className?: string;
  /** HTML element to render as */
  as?: 'div' | 'ul' | 'ol' | 'section';
}

export interface StaggerItemProps {
  /** Content to animate */
  children: React.ReactNode;
  /** Additional delay for this item (seconds) */
  delay?: number;
  /** Optional className */
  className?: string;
  /** HTML element to render as */
  as?: 'div' | 'li' | 'article';
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGGER CONTAINER
// ═══════════════════════════════════════════════════════════════════════════════

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
  as = 'div',
}: StaggerContainerProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // Reduced motion: render without animation
  if (isReduced) {
    const Element = as;
    return <Element className={className}>{children}</Element>;
  }

  const MotionElement = motion[as];
  const variants = staggerContainer(staggerDelay);

  return (
    <MotionElement
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
    >
      {children}
    </MotionElement>
  );
}

StaggerContainer.displayName = 'StaggerContainer';

// ═══════════════════════════════════════════════════════════════════════════════
// STAGGER ITEM
// ═══════════════════════════════════════════════════════════════════════════════

export function StaggerItem({
  children,
  delay = 0,
  className,
  as = 'div',
}: StaggerItemProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // Reduced motion: render without animation
  if (isReduced) {
    const Element = as;
    return <Element className={className}>{children}</Element>;
  }

  const MotionElement = motion[as];
  const variants = staggerItem(delay);

  return (
    <MotionElement variants={variants} className={className}>
      {children}
    </MotionElement>
  );
}

StaggerItem.displayName = 'StaggerItem';
