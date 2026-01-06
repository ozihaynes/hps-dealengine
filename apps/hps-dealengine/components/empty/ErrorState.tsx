/**
 * ErrorState — Error display component with recovery options
 *
 * Shows user-friendly error messages with retry and alternative actions.
 * Supports multiple severity levels and error types.
 *
 * Features:
 * - Multiple severity levels (error, warning, info)
 * - Retry action with loading state
 * - Contact support link
 * - Error code display (for debugging)
 * - Animated entrance
 *
 * @module components/empty/ErrorState
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

'use client';

import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message?: string;
  /** Error code (for support/debugging) */
  errorCode?: string;
  /** Severity level */
  severity?: 'error' | 'warning' | 'info';
  /** Retry action */
  onRetry?: () => void | Promise<void>;
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Show contact support link */
  showSupport?: boolean;
  /** Support email/link */
  supportLink?: string;
  /** Display variant */
  variant?: 'default' | 'compact' | 'inline' | 'card';
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SEVERITY_CONFIG = {
  error: {
    icon: '❌',
    colors: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/20',
      text: 'text-red-400',
    },
    defaultTitle: 'Something went wrong',
    defaultMessage: 'An unexpected error occurred. Please try again.',
  },
  warning: {
    icon: '⚠️',
    colors: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20',
      text: 'text-amber-400',
    },
    defaultTitle: 'Warning',
    defaultMessage: 'There was an issue that may affect your experience.',
  },
  info: {
    icon: 'ℹ️',
    colors: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      text: 'text-blue-400',
    },
    defaultTitle: 'Information',
    defaultMessage: 'Please review the following information.',
  },
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
};

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ErrorState - User-friendly error display with recovery options
 *
 * @example
 * ```tsx
 * // Basic error with retry
 * <ErrorState
 *   title="Failed to load data"
 *   message="Unable to fetch deals. Please try again."
 *   onRetry={() => refetch()}
 * />
 *
 * // Warning with action
 * <ErrorState
 *   severity="warning"
 *   title="Session expiring"
 *   message="Your session will expire in 5 minutes."
 *   secondaryAction={{ label: "Extend", onClick: extendSession }}
 * />
 *
 * // Compact inline error
 * <ErrorState
 *   variant="inline"
 *   message="Invalid input"
 *   severity="error"
 * />
 * ```
 */
export const ErrorState = memo(function ErrorState({
  title,
  message,
  errorCode,
  severity = 'error',
  onRetry,
  secondaryAction,
  showSupport = false,
  supportLink = 'mailto:support@example.com',
  variant = 'default',
  className,
  testId,
}: ErrorStateProps): React.ReactElement {
  const [isRetrying, setIsRetrying] = useState(false);
  const config = SEVERITY_CONFIG[severity];

  const displayTitle = title ?? config.defaultTitle;
  const displayMessage = message ?? config.defaultMessage;

  // Handle retry with loading state
  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // INLINE VARIANT
  // ───────────────────────────────────────────────────────────────────────

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'rounded-md',
          config.colors.bg,
          config.colors.border,
          'border',
          className
        )}
        data-testid={testId ?? 'error-state-inline'}
        data-severity={severity}
        role="alert"
      >
        <span aria-hidden="true">{config.icon}</span>
        <span className={cn('text-sm', config.colors.text)}>
          {displayMessage}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              'ml-auto text-xs font-medium underline',
              config.colors.text,
              'hover:opacity-80',
              isRetrying && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
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
          'py-8 px-6 text-center',
          className
        )}
        data-testid={testId ?? 'error-state-compact'}
        data-severity={severity}
        role="alert"
      >
        <div className="text-3xl mb-2" aria-hidden="true">
          {config.icon}
        </div>
        <h3 className={cn('text-base font-medium mb-1', config.colors.text)}>
          {displayTitle}
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {displayMessage}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              'mt-4 h-9 px-4',
              'rounded-lg text-sm font-medium',
              'bg-[var(--card-bg-solid)] hover:bg-[var(--card-bg-hover)] text-slate-100',
              'transition-colors duration-150',
              isRetrying && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
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
          'rounded-xl border',
          config.colors.bg,
          config.colors.border,
          'p-6',
          className
        )}
        data-testid={testId ?? 'error-state-card'}
        data-severity={severity}
        role="alert"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-lg',
              config.colors.iconBg
            )}
          >
            <span className="text-xl" aria-hidden="true">
              {config.icon}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className={cn('text-base font-semibold mb-1', config.colors.text)}>
              {displayTitle}
            </h3>
            <p className="text-sm text-slate-400">
              {displayMessage}
            </p>

            {/* Error code */}
            {errorCode && (
              <p className="text-xs text-slate-500 mt-2 font-mono">
                Error code: {errorCode}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              {onRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className={cn(
                    'h-9 px-4',
                    'rounded-lg text-sm font-medium',
                    'bg-[var(--card-bg-solid)] hover:bg-[var(--card-bg-hover)] text-slate-100',
                    'transition-colors duration-150',
                    isRetrying && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </button>
              )}
              {secondaryAction && (
                secondaryAction.href ? (
                  <a
                    href={secondaryAction.href}
                    className="text-sm text-slate-400 hover:text-slate-200 underline"
                  >
                    {secondaryAction.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    className="text-sm text-slate-400 hover:text-slate-200 underline"
                  >
                    {secondaryAction.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
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
        'py-16 px-6 text-center',
        className
      )}
      data-testid={testId ?? 'error-state'}
      data-severity={severity}
      role="alert"
    >
      {/* Icon with animation on error */}
      <motion.div
        variants={severity === 'error' ? shakeVariants : undefined}
        animate={severity === 'error' ? 'shake' : undefined}
        className="text-6xl mb-6"
        aria-hidden="true"
      >
        {config.icon}
      </motion.div>

      {/* Title */}
      <h3 className={cn('text-xl font-semibold mb-2', config.colors.text)}>
        {displayTitle}
      </h3>

      {/* Message */}
      <p className="text-sm text-slate-400 max-w-md mb-6">
        {displayMessage}
      </p>

      {/* Error code */}
      {errorCode && (
        <p className="text-xs text-slate-500 mb-6 font-mono bg-[var(--card-bg)] px-3 py-1.5 rounded">
          Error code: {errorCode}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              'h-11 min-h-[44px] px-6',
              'rounded-lg text-sm font-medium',
              'bg-[var(--card-bg-solid)] hover:bg-[var(--card-bg-hover)] text-slate-100',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-slate-500',
              isRetrying && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        )}
        {secondaryAction && (
          secondaryAction.href ? (
            <a
              href={secondaryAction.href}
              className={cn(
                'h-11 min-h-[44px] px-6',
                'inline-flex items-center justify-center',
                'rounded-lg text-sm font-medium',
                'border border-white/10 hover:border-white/20',
                'text-slate-300 hover:text-slate-100',
                'transition-colors duration-150'
              )}
            >
              {secondaryAction.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className={cn(
                'h-11 min-h-[44px] px-6',
                'rounded-lg text-sm font-medium',
                'border border-white/10 hover:border-white/20',
                'text-slate-300 hover:text-slate-100',
                'transition-colors duration-150'
              )}
            >
              {secondaryAction.label}
            </button>
          )
        )}
      </div>

      {/* Support link */}
      {showSupport && (
        <p className="text-xs text-slate-500 mt-6">
          If this problem persists,{' '}
          <a
            href={supportLink}
            className="text-slate-400 hover:text-slate-300 underline"
          >
            contact support
          </a>
        </p>
      )}
    </motion.div>
  );
});

// =============================================================================
// SPECIALIZED ERROR STATES
// =============================================================================

/**
 * NetworkError - Pre-configured network error state
 */
export const NetworkError = memo(function NetworkError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      severity="error"
      onRetry={onRetry}
      className={className}
      testId="network-error"
    />
  );
});

/**
 * NotFoundError - Pre-configured 404 error state
 */
export const NotFoundError = memo(function NotFoundError({
  resource = 'item',
  backHref,
  className,
}: {
  resource?: string;
  backHref?: string;
  className?: string;
}): React.ReactElement {
  return (
    <ErrorState
      title="Not Found"
      message={`The ${resource} you're looking for doesn't exist or has been removed.`}
      severity="warning"
      secondaryAction={backHref ? { label: 'Go Back', href: backHref } : undefined}
      className={className}
      testId="not-found-error"
    />
  );
});

/**
 * PermissionError - Pre-configured permission denied state
 */
export const PermissionError = memo(function PermissionError({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <ErrorState
      title="Access Denied"
      message="You don't have permission to view this content. Please contact your administrator if you believe this is an error."
      severity="warning"
      showSupport={true}
      className={className}
      testId="permission-error"
    />
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export default ErrorState;
