/**
 * ErrorBoundary - Catch and display React errors gracefully
 * @module components/underwrite/states/ErrorBoundary
 * @slice 20 of 22
 *
 * React error boundary that catches errors in child components
 * and displays a user-friendly error UI with recovery actions.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="alert" on error display
 * - aria-hidden on decorative icons
 * - Focus management on retry button
 * - Touch targets >= 44px
 *
 * Principles Applied:
 * - Error UX: Helpful messages, not technical jargon
 * - Recovery: Retry and refresh options
 * - Logging: Console error for debugging
 */

'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn, card, colors, focus } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ErrorBoundaryProps {
  /** Custom fallback UI (default: built-in error UI) */
  fallback?: React.ReactNode;
  /** Error callback for logging/reporting */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Children to render */
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT (Class required for error boundary)
// ═══════════════════════════════════════════════════════════════════════════════

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging (console.error is intentional here)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom fallback takes precedence
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          role="alert"
          className={cn(
            card.base,
            'p-6 text-center',
            'border-red-500/30 bg-red-500/5'
          )}
        >
          <AlertTriangle
            className="w-10 h-10 text-red-400 mx-auto mb-4"
            aria-hidden="true"
          />
          <h3 className={cn('text-lg font-semibold mb-2', colors.text.primary)}>
            Something went wrong
          </h3>
          <p className={cn('text-sm mb-4 max-w-md mx-auto', colors.text.muted)}>
            We encountered an error while loading this section. This has been
            logged and we&apos;ll look into it.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className={cn(
                'inline-flex items-center justify-center gap-2',
                'min-h-[44px] px-4 py-2 rounded-lg',
                'bg-slate-700 hover:bg-slate-600',
                'text-white text-sm font-medium',
                'transition-colors duration-150',
                focus.ring
              )}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
            <button
              onClick={this.handleRefresh}
              className={cn(
                'inline-flex items-center justify-center',
                'min-h-[44px] px-4 py-2 rounded-lg',
                'bg-slate-800 hover:bg-slate-700',
                'text-slate-300 text-sm',
                'transition-colors duration-150',
                focus.ring
              )}
            >
              Refresh Page
            </button>
          </div>
          {/* Technical details in development only */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-left">
              <summary
                className={cn(
                  'text-xs cursor-pointer select-none',
                  colors.text.muted
                )}
              >
                Technical details (dev only)
              </summary>
              <pre
                className={cn(
                  'mt-2 p-3 rounded-lg text-xs overflow-auto',
                  'bg-slate-900 text-red-400'
                )}
              >
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
