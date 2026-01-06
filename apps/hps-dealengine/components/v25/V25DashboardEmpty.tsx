/**
 * V25DashboardEmpty — Slice 13
 *
 * Empty state when no analysis has been run.
 * Provides clear guidance on next steps.
 *
 * Design Principles:
 * - Friendly illustration + clear CTA
 * - Explains what the dashboard shows
 * - Accessible and helpful
 *
 * @module V25DashboardEmpty
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import { fadeInUp } from '@/lib/animations';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface V25DashboardEmptyProps {
  /** Additional CSS classes */
  className?: string;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Optional action button */
  action?: React.ReactNode;
  /** Variant style */
  variant?: 'default' | 'compact' | 'minimal';
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

const FEATURE_LIST = [
  { icon: '🎯', label: 'Deal verdict with confidence score' },
  { icon: '📊', label: 'Price geometry and ZOPA analysis' },
  { icon: '⚠️', label: 'Risk gates status' },
  { icon: '📈', label: 'Market velocity indicators' },
  { icon: '💰', label: 'Net clearance by exit strategy' },
];

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const V25DashboardEmpty = memo(function V25DashboardEmpty({
  className,
  title = 'No Analysis Yet',
  description = 'Run an analysis to see the V2.5 dashboard with all key deal metrics.',
  action,
  variant = 'default',
}: V25DashboardEmptyProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // MINIMAL VARIANT
  // ─────────────────────────────────────────────────────────────────

  if (variant === 'minimal') {
    return (
      <div
        data-testid="v25-dashboard-empty"
        data-variant="minimal"
        className={cn(
          'rounded-xl border border-white/10 bg-[var(--card-bg-hero)] backdrop-blur-xl p-4 text-center',
          className
        )}
      >
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // COMPACT VARIANT
  // ─────────────────────────────────────────────────────────────────

  if (variant === 'compact') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        data-testid="v25-dashboard-empty"
        data-variant="compact"
        className={cn(
          'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-6 text-center',
          className
        )}
      >
        <div className="text-3xl mb-3" aria-hidden="true">
          📊
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DEFAULT VARIANT
  // ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      data-testid="v25-dashboard-empty"
      data-variant="default"
      className={cn(
        'rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-8',
        className
      )}
    >
      <div className="max-w-lg mx-auto text-center">
        {/* Illustration */}
        <div className="text-5xl mb-4" aria-hidden="true">
          📊
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{description}</p>

        {/* Feature List */}
        <div className="bg-[var(--card-bg-hero)] rounded-lg p-4 mb-6">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            What you&apos;ll see:
          </h4>
          <ul className="space-y-2 text-left">
            {FEATURE_LIST.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-slate-400"
              >
                <span aria-hidden="true">{feature.icon}</span>
                {feature.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Action */}
        {action && <div>{action}</div>}

        {/* Help Text */}
        <p className="text-xs text-slate-600 mt-4">
          Enter deal details in the form on the left and click &quot;Analyze&quot; to
          generate the dashboard.
        </p>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default V25DashboardEmpty;
