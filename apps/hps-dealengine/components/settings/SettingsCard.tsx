'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';

/**
 * Motion configuration
 * Uses ease-out-expo for smooth deceleration
 */
const CARD_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.2,
    ease: [0.16, 1, 0.3, 1], // ease-out-expo
  },
} as const;

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'danger';
  /** For testing and automation */
  'data-testid'?: string;
}

/**
 * SettingsCard
 *
 * Consistent card component for settings sections.
 * Supports default and danger variants for different contexts.
 *
 * Accessibility:
 * - Uses semantic section element
 * - aria-labelledby connects card to its title
 * - Respects prefers-reduced-motion
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
  icon,
  className,
  variant = 'default',
  'data-testid': testId,
}: SettingsCardProps): JSX.Element {
  const titleId = testId ? `${testId}-title` : undefined;

  return (
    <motion.section
      {...CARD_MOTION}
      className={cn(
        'rounded-xl border backdrop-blur-sm overflow-hidden',
        'motion-reduce:transform-none motion-reduce:transition-none',
        variant === 'default' && 'border-white/5 bg-surface-elevated/70',
        variant === 'danger' && 'border-accent-red/30 bg-accent-red/5',
        className
      )}
      data-testid={testId}
      aria-labelledby={titleId}
    >
      {/* Card Header */}
      <header
        className={cn(
          'px-5 py-4 border-b flex items-start justify-between gap-3',
          variant === 'default' ? 'border-white/5' : 'border-accent-red/20'
        )}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={cn(
                'rounded-md p-2 mt-0.5',
                variant === 'default'
                  ? 'bg-[color:var(--accent-color)]/10 text-[color:var(--accent-color)]'
                  : 'bg-accent-red/10 text-accent-red'
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <div>
            <h3
              id={titleId}
              className={cn(
                'text-base font-semibold',
                variant === 'default' ? 'text-text-primary' : 'text-accent-red'
              )}
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Card Body */}
      <div className="px-5 py-4">{children}</div>

      {/* Card Footer (optional) */}
      {footer && (
        <footer
          className={cn(
            'px-5 py-3 border-t flex items-center justify-end gap-3',
            variant === 'default'
              ? 'bg-white/5 border-white/5'
              : 'bg-accent-red/5 border-accent-red/20'
          )}
        >
          {footer}
        </footer>
      )}
    </motion.section>
  );
}
