/**
 * AnimatedList Component
 *
 * Renders a list with staggered enter animations for each item.
 * Respects reduced motion preferences.
 *
 * @module components/animations/AnimatedList
 * @version 1.0.0 (Slice 20 - Animation Library Enhancement)
 */

'use client';

import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  listItem,
  gridItem,
  fadeInUp,
} from '@/lib/animations/variants';
import { prefersReducedMotion } from '@/lib/animations/tokens';

// =============================================================================
// TYPES
// =============================================================================

export interface AnimatedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Unique key extractor */
  keyExtractor: (item: T, index: number) => string;
  /** Stagger speed */
  speed?: 'fast' | 'default' | 'slow';
  /** Item animation variant */
  variant?: 'slide' | 'fade' | 'scale';
  /** Additional container classes */
  className?: string;
  /** Additional item wrapper classes */
  itemClassName?: string;
  /** Whether to animate on initial render */
  animateOnMount?: boolean;
  /** Whether to animate when items change */
  animateOnChange?: boolean;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Render as a specific element */
  as?: 'ul' | 'ol' | 'div';
}

// =============================================================================
// VARIANT MAPPINGS
// =============================================================================

const containerVariants: Record<string, Variants> = {
  fast: staggerContainerFast,
  default: staggerContainer,
  slow: staggerContainerSlow,
};

const itemVariants: Record<string, Variants> = {
  slide: listItem,
  fade: fadeInUp,
  scale: gridItem,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AnimatedList - Renders items with staggered animations
 *
 * @example
 * ```tsx
 * // Basic list
 * <AnimatedList
 *   items={deals}
 *   keyExtractor={(item) => item.id}
 *   renderItem={(item) => <DealCard deal={item} />}
 * />
 *
 * // Grid with scale animation
 * <AnimatedList
 *   items={cards}
 *   keyExtractor={(item) => item.id}
 *   renderItem={(item) => <Card {...item} />}
 *   variant="scale"
 *   className="grid grid-cols-3 gap-4"
 * />
 *
 * // Slow stagger for emphasis
 * <AnimatedList
 *   items={features}
 *   keyExtractor={(_, i) => String(i)}
 *   renderItem={(item) => <Feature {...item} />}
 *   speed="slow"
 * />
 * ```
 */
export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  speed = 'default',
  variant = 'fade',
  className = '',
  itemClassName = '',
  animateOnMount = true,
  animateOnChange = true,
  emptyState,
  as = 'div',
}: AnimatedListProps<T>): React.ReactElement {
  const shouldReduceMotion = prefersReducedMotion();
  const Container = motion[as];
  const ItemWrapper = motion.div;

  // Get variants
  const container = containerVariants[speed];
  const item = itemVariants[variant];

  // Handle empty state
  if (items.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    return <Container className={className} />;
  }

  // Reduced motion: render without animation
  if (shouldReduceMotion) {
    const StaticContainer = as;
    return (
      <StaticContainer className={className}>
        {items.map((itemData, index) => (
          <div key={keyExtractor(itemData, index)} className={itemClassName}>
            {renderItem(itemData, index)}
          </div>
        ))}
      </StaticContainer>
    );
  }

  return (
    <Container
      className={className}
      variants={container}
      initial={animateOnMount ? 'hidden' : 'visible'}
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {items.map((itemData, index) => (
          <ItemWrapper
            key={keyExtractor(itemData, index)}
            className={itemClassName}
            variants={item}
            initial={animateOnChange ? 'hidden' : false}
            animate="visible"
            exit="exit"
            layout={animateOnChange}
          >
            {renderItem(itemData, index)}
          </ItemWrapper>
        ))}
      </AnimatePresence>
    </Container>
  );
}

// =============================================================================
// SPECIALIZED COMPONENTS
// =============================================================================

/**
 * AnimatedGrid - Grid-specific animated list
 */
export interface AnimatedGridProps<T> extends Omit<AnimatedListProps<T>, 'variant' | 'as'> {
  /** Number of columns (Tailwind classes) */
  columns?: 1 | 2 | 3 | 4;
  /** Gap size */
  gap?: 2 | 4 | 6 | 8;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gapClasses = {
  2: 'gap-2',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

export function AnimatedGrid<T>({
  columns = 3,
  gap = 4,
  className = '',
  ...props
}: AnimatedGridProps<T>): React.ReactElement {
  const gridClasses = `grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`;

  return (
    <AnimatedList
      {...props}
      variant="scale"
      className={gridClasses}
    />
  );
}

/**
 * AnimatedUnorderedList - Semantic unordered list
 */
export function AnimatedUnorderedList<T>(
  props: Omit<AnimatedListProps<T>, 'as'>
): React.ReactElement {
  return <AnimatedList {...props} as="ul" variant="slide" />;
}

/**
 * AnimatedOrderedList - Semantic ordered list
 */
export function AnimatedOrderedList<T>(
  props: Omit<AnimatedListProps<T>, 'as'>
): React.ReactElement {
  return <AnimatedList {...props} as="ol" variant="slide" />;
}

export default AnimatedList;
