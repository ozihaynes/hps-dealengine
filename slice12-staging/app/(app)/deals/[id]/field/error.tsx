"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Field Mode Error Boundary
 * 
 * Handles unexpected errors in the field mode route.
 * Provides clear recovery options (retry or go back).
 * 
 * Principles Applied:
 * - Error Experience Design: Helpful, not scary
 * - Clear recovery actions
 * - 48px touch targets
 */
export default function FieldModeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header
        className={`
          sticky top-0 z-10
          bg-surface-primary/80
          backdrop-blur-md
          border-b border-white/5
          px-4 py-3
          flex items-center gap-3
        `}
      >
        <button
          onClick={() => router.back()}
          className={`
            flex items-center justify-center
            w-12 h-12
            rounded-lg
            bg-surface-secondary/50
            hover:bg-surface-secondary
            transition-colors
            -ml-2
          `}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <h1 className="text-sm font-medium text-text-primary">
          Field Mode
        </h1>
      </header>

      {/* Error Content */}
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[70vh]">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-text-secondary mb-2 max-w-xs">
          We couldn't load the field view. This might be a temporary issue.
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-red-400 mb-4 max-w-xs font-mono">
            {error.message}
          </p>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={reset}
            className="min-h-[48px] w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button
            onClick={() => router.back()}
            variant="secondary"
            className="min-h-[48px] w-full"
          >
            Go Back
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-text-tertiary mt-6">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
