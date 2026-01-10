/**
 * InlineError - Inline error message with recovery actions
 * @module components/underwrite/states/InlineError
 * @slice 20 of 22
 *
 * Displays error messages inline with optional dismiss and retry actions.
 * Uses assertive aria-live for immediate screen reader announcement.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="alert" for error semantics
 * - aria-live="assertive" for immediate announcement
 * - aria-hidden on decorative icon
 * - Proper button labeling
 * - Touch targets >= 44px
 *
 * Principles Applied:
 * - Error UX: What happened + Why + What to do
 * - Recovery: Clear retry and dismiss actions
 * - Accessibility: Screen reader friendly
 */

'use client';

import * as React from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { cn, colors, focus } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface InlineErrorProps {
  /** Error message (what happened + why) */
  message: string;
  /** Optional title (default: "Error") */
  title?: string;
  /** Allow dismissing the error */
  dismissible?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Retry callback (shows retry button if provided) */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function InlineError({
  message,
  title = 'Error',
  dismissible = false,
  onDismiss,
  onRetry,
  retryLabel = 'Try again',
  className,
}: InlineErrorProps): React.JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg',
        'bg-red-500/10 border border-red-500/30',
        className
      )}
    >
      {/* Icon */}
      <AlertCircle
        className={cn('w-5 h-5 flex-shrink-0 mt-0.5', colors.text.error)}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn('text-sm font-medium mb-0.5', colors.text.error)}>
          {title}
        </h4>
        <p className="text-sm text-red-300/80">{message}</p>

        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'inline-flex items-center gap-1.5 mt-2',
              'min-h-[44px] px-3 py-2 -ml-3 rounded-lg',
              'text-sm text-red-400 hover:text-red-300',
              'hover:bg-red-500/10',
              'transition-colors duration-150',
              focus.ring
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            {retryLabel}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss error"
          className={cn(
            'flex items-center justify-center',
            'w-11 h-11 -mr-2 -mt-2 rounded-lg',
            'text-red-400/60 hover:text-red-400',
            'hover:bg-red-500/10',
            'transition-colors duration-150',
            focus.ring
          )}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

InlineError.displayName = 'InlineError';
