"use client";

import { useState, useCallback, useEffect } from "react";
import {
  XIcon,
  Loader2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  FileSpreadsheetIcon,
} from "lucide-react";
import type { ImportJob } from "@hps-internal/contracts";
import {
  promoteAllItems,
  type PromoteProgress,
  type PromoteResult,
} from "@/lib/import/importPromoteApi";

// =============================================================================
// TYPES
// =============================================================================

interface PromoteModalProps {
  job: ImportJob;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ModalState = "confirm" | "promoting" | "complete" | "error";

// =============================================================================
// COMPONENT
// =============================================================================

export function PromoteModal({
  job,
  isOpen,
  onClose,
  onComplete,
}: PromoteModalProps) {
  const [state, setState] = useState<ModalState>("confirm");
  const [progress, setProgress] = useState<PromoteProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    totalPromoted: number;
    totalFailed: number;
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState("confirm");
      setProgress(null);
      setError(null);
      setResults(null);
    }
  }, [isOpen]);

  // Handle promotion
  const handlePromote = useCallback(async () => {
    setState("promoting");
    setError(null);

    try {
      const result = await promoteAllItems(
        job.id,
        // Progress callback
        (prog: PromoteProgress) => {
          setProgress(prog);
        },
        // Batch complete callback
        (_batchResults: PromoteResult[]) => {
          // Could log batch results if needed
        }
      );

      setResults({
        totalPromoted: result.totalPromoted,
        totalFailed: result.totalFailed,
      });
      setState("complete");

      // Notify parent after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error("Promotion error:", err);
      setError(err instanceof Error ? err.message : "Failed to promote items");
      setState("error");
    }
  }, [job.id, onComplete]);

  // Handle close
  const handleClose = useCallback(() => {
    if (state === "promoting") {
      // Don't allow closing during promotion
      return;
    }
    onClose();
  }, [state, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  const validCount = job.rows_valid ?? 0;
  const progressPercent = progress
    ? Math.round((progress.promoted / progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ArrowRightIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Promote to Deals
              </h2>
              <p className="text-sm text-slate-400">{job.file_name}</p>
            </div>
          </div>
          {state !== "promoting" && (
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Confirm State */}
          {state === "confirm" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                  <FileSpreadsheetIcon className="h-8 w-8 text-blue-400" />
                </div>
                <p className="text-slate-300">
                  Ready to create <span className="font-semibold text-white">{validCount}</span> deals
                  from valid import items.
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {job.rows_valid ?? 0}
                  </p>
                  <p className="text-xs text-slate-400">Valid</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {job.rows_needs_fix ?? 0}
                  </p>
                  <p className="text-xs text-slate-400">Need Fix</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-400">
                    {job.rows_skipped_duplicate ?? 0}
                  </p>
                  <p className="text-xs text-slate-400">Duplicate</p>
                </div>
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-6">
                <p className="text-xs text-amber-400">
                  This will create real deals in your system. Each valid item
                  will become a separate deal record. This action cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800
                             border border-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  disabled={validCount === 0}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors
                    ${
                      validCount > 0
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }
                  `}
                >
                  <ArrowRightIcon className="w-4 h-4" />
                  Promote {validCount} Items
                </button>
              </div>
            </>
          )}

          {/* Promoting State */}
          {state === "promoting" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                  <Loader2Icon className="h-8 w-8 text-blue-400 animate-spin" />
                </div>
                <p className="text-white font-medium">Creating Deals...</p>
                <p className="text-sm text-slate-400 mt-1">
                  Please wait while items are promoted
                </p>
              </div>

              {/* Progress */}
              {progress && (
                <div className="space-y-4">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      {progress.promoted} of {progress.total} promoted
                    </span>
                    <span className="text-slate-400">{progressPercent}%</span>
                  </div>
                  {progress.failed > 0 && (
                    <p className="text-sm text-red-400">
                      {progress.failed} failed
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Complete State */}
          {state === "complete" && results && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-white font-medium">Promotion Complete!</p>
                <p className="text-sm text-slate-400 mt-1">
                  Deals have been created successfully
                </p>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-400">
                    {results.totalPromoted}
                  </p>
                  <p className="text-sm text-slate-400">Deals Created</p>
                </div>
                {results.totalFailed > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
                    <p className="text-3xl font-bold text-red-400">
                      {results.totalFailed}
                    </p>
                    <p className="text-sm text-slate-400">Failed</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </>
          )}

          {/* Error State */}
          {state === "error" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <AlertCircleIcon className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-white font-medium">Promotion Failed</p>
                <p className="text-sm text-red-400 mt-2">{error}</p>
              </div>

              {/* Partial Results */}
              {progress && progress.promoted > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-6">
                  <p className="text-sm text-amber-400">
                    {progress.promoted} items were promoted before the error occurred.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800
                             border border-slate-600 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setState("confirm");
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
