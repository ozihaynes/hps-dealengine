/**
 * EmptyState — Base empty state component
 *
 * Flexible, composable empty state component with illustration,
 * messaging, and call-to-action support.
 *
 * Features:
 * - Multiple variants (default, compact, minimal)
 * - Customizable illustration
 * - Primary and secondary actions
 * - Animated entrance
 * - Accessible markup
 *
 * @module components/empty/EmptyState
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler or href */
  onClick?: () => void;
  href?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Icon component */
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Illustration (emoji or React node) */
  illustration?: React.ReactNode;
  /** Primary action */
  action?: EmptyStateAction;
  /** Secondary action */
  secondaryAction?: EmptyStateAction;
  /** Display variant */
  variant?: 'default' | 'compact' | 'minimal' | 'card';
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
  /** Children content (additional info) */
  children?: React.ReactNode;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * ActionButton - Styled button for empty state actions
 */
interface ActionButtonProps extends EmptyStateAction {
  className?: string;
}

const ActionButton = memo(function ActionButton({
  label,
  onClick,
  href,
  variant = 'primary',
  icon,
  className,
}: ActionButtonProps): React.ReactElement {
  const baseStyles = cn(
    'inline-flex items-center justify-center gap-2',
    'h-11 min-h-[44px] px-6',
    'rounded-lg text-sm font-medium',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900'
  );

  const variantStyles = {
    primary: cn(
      'bg-emerald-600 hover:bg-emerald-500',
      'text-white',
      'focus:ring-emerald-500'
    ),
    secondary: cn(
      'bg-zinc-800 hover:bg-zinc-700',
      'text-zinc-100',
      'border border-zinc-700',
      'focus:ring-zinc-500'
    ),
    ghost: cn(
      'bg-transparent hover:bg-zinc-800',
      'text-zinc-400 hover:text-zinc-100',
      'focus:ring-zinc-500'
    ),
  };

  const Element = href ? 'a' : 'button';
  const elementProps = href
    ? { href }
    : { type: 'button' as const, onClick };

  return (
    <Element
      {...elementProps}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {label}
    </Element>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * EmptyState - Flexible empty state component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <EmptyState
 *   title="No deals yet"
 *   description="Create your first deal to get started"
 *   illustration="📋"
 *   action={{ label: "Create Deal", href: "/startup" }}
 * />
 *
 * // Compact variant
 * <EmptyState
 *   variant="compact"
 *   title="No results"
 *   description="Try adjusting your filters"
 * />
 *
 * // With secondary action
 * <EmptyState
 *   title="No matches"
 *   description="No deals match your current filters"
 *   action={{ label: "Clear Filters", onClick: clearFilters }}
 *   secondaryAction={{ label: "View All", href: "/deals" }}
 * />
 * ```
 */
export const EmptyState = memo(function EmptyState({
  title,
  description,
  illustration = '📋',
  action,
  secondaryAction,
  variant = 'default',
  className,
  testId,
  children,
}: EmptyStateProps): React.ReactElement {
  // ───────────────────────────────────────────────────────────────────────
  // MINIMAL VARIANT
  // ───────────────────────────────────────────────────────────────────────

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'py-8 px-4 text-center',
          className
        )}
        data-testid={testId ?? 'empty-state-minimal'}
        data-variant="minimal"
        role="status"
        aria-label={title}
      >
        <p className="text-sm text-zinc-500">{title}</p>
        {action && (
          <div className="mt-3">
            <ActionButton {...action} variant="ghost" />
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // COMPACT VARIANT
  // ───────────────────────────────────────────────────────────────────────

  if (variant === 'compact') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'py-10 px-6 text-center',
          className
        )}
        data-testid={testId ?? 'empty-state-compact'}
        data-variant="compact"
        role="status"
        aria-label={title}
      >
        {/* Illustration */}
        {illustration && (
          <div className="text-4xl mb-3" aria-hidden="true">
            {illustration}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-medium text-zinc-200 mb-1">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">{description}</p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {action && <ActionButton {...action} />}
            {secondaryAction && (
              <ActionButton {...secondaryAction} variant="secondary" />
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // CARD VARIANT
  // ───────────────────────────────────────────────────────────────────────

  if (variant === 'card') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'rounded-xl border border-zinc-700 bg-zinc-800/50',
          'py-12 px-8 text-center',
          className
        )}
        data-testid={testId ?? 'empty-state-card'}
        data-variant="card"
        role="status"
        aria-label={title}
      >
        {/* Illustration */}
        {illustration && (
          <motion.div
            variants={itemVariants}
            className="text-5xl mb-4"
            aria-hidden="true"
          >
            {illustration}
          </motion.div>
        )}

        {/* Title */}
        <motion.h3
          variants={itemVariants}
          className="text-xl font-semibold text-zinc-200 mb-2"
        >
          {title}
        </motion.h3>

        {/* Description */}
        {description && (
          <motion.p
            variants={itemVariants}
            className="text-sm text-zinc-400 max-w-md mx-auto mb-6"
          >
            {description}
          </motion.p>
        )}

        {/* Children (additional content) */}
        {children && (
          <motion.div variants={itemVariants} className="mb-6">
            {children}
          </motion.div>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-3"
          >
            {action && <ActionButton {...action} />}
            {secondaryAction && (
              <ActionButton {...secondaryAction} variant="secondary" />
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // DEFAULT VARIANT
  // ───────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center',
        'py-16 px-6',
        'text-center',
        className
      )}
      data-testid={testId ?? 'empty-state'}
      data-variant="default"
      role="status"
      aria-label={title}
    >
      {/* Illustration */}
      {illustration && (
        <motion.div
          variants={itemVariants}
          className="text-6xl mb-6"
          aria-hidden="true"
        >
          {illustration}
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        variants={itemVariants}
        className="text-xl font-semibold text-zinc-100 mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          variants={itemVariants}
          className="text-sm text-zinc-400 max-w-md mb-6"
        >
          {description}
        </motion.p>
      )}

      {/* Children (additional content) */}
      {children && (
        <motion.div variants={itemVariants} className="mb-6">
          {children}
        </motion.div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3"
        >
          {action && <ActionButton {...action} />}
          {secondaryAction && (
            <ActionButton {...secondaryAction} variant="secondary" />
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default EmptyState;
