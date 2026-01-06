"use client";

import { AlertCircleIcon, XIcon, RefreshCwIcon } from "lucide-react";

interface ErrorBannerProps {
  error: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon
          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20
                         rounded transition-colors"
              title="Retry"
              aria-label="Retry"
            >
              <RefreshCwIcon className="w-4 h-4" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20
                         rounded transition-colors"
              title="Dismiss"
              aria-label="Dismiss error"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
