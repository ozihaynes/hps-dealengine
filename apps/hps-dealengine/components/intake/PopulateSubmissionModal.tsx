"use client";

import React, { useState } from "react";
import {
  populateSubmission,
  type PopulateSubmissionResponse,
} from "@/lib/intakeStaff";
import { useDealSession } from "@/lib/dealSessionContext";

type PopulateSubmissionModalProps = {
  submissionId: string;
  hasPendingFiles: boolean;
  hasInfectedFiles: boolean;
  onClose: () => void;
  onSuccess: (result: PopulateSubmissionResponse) => void;
};

export function PopulateSubmissionModal({
  submissionId,
  hasPendingFiles,
  hasInfectedFiles,
  onClose,
  onSuccess,
}: PopulateSubmissionModalProps) {
  const { refreshDeal } = useDealSession();
  const [overwriteMode, setOverwriteMode] = useState<"skip" | "overwrite">("skip");
  const [overwriteReason, setOverwriteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PopulateSubmissionResponse | null>(null);

  const canSubmit =
    !hasPendingFiles &&
    !hasInfectedFiles &&
    (overwriteMode === "skip" || overwriteReason.length >= 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const overwriteReasons =
        overwriteMode === "overwrite"
          ? { _bulk: overwriteReason }
          : undefined;

      const response = await populateSubmission(
        submissionId,
        overwriteMode,
        overwriteReasons
      );

      setResult(response);

      // Refresh the deal in context to pick up populated data
      await refreshDeal();

      // Call onSuccess after a short delay to show the result
      setTimeout(() => {
        onSuccess(response);
      }, 2000);
    } catch (err) {
      console.error("Failed to populate:", err);
      setError(err instanceof Error ? err.message : "Failed to populate deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show result view after successful population
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-gray-900 p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-6 w-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">
              {result.idempotent_hit ? "Already Populated" : "Population Complete"}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {result.idempotent_hit
                ? "This submission was already populated with the same settings."
                : "Deal has been updated with client data."}
            </p>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {result.summary.created_count}
              </p>
              <p className="text-xs text-gray-400">Created</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-gray-400">
                {result.summary.skipped_count}
              </p>
              <p className="text-xs text-gray-400">Skipped</p>
            </div>
            {result.summary.overwritten_count > 0 && (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {result.summary.overwritten_count}
                </p>
                <p className="text-xs text-gray-400">Overwritten</p>
              </div>
            )}
            {result.summary.evidence_converted_count > 0 && (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {result.summary.evidence_converted_count}
                </p>
                <p className="text-xs text-gray-400">Files Converted</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-gray-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">Accept & Populate Deal</h2>
        <p className="mt-1 text-sm text-gray-400">
          This will transfer client data to the deal record.
        </p>

        {/* File warnings */}
        {(hasPendingFiles || hasInfectedFiles) && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
            {hasPendingFiles && (
              <p className="text-sm text-amber-400">
                Some files are still being scanned. Please wait for scan completion.
              </p>
            )}
            {hasInfectedFiles && (
              <p className="text-sm text-red-400">
                Some files failed virus scan. Remove infected files before populating.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Overwrite mode selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              How should existing fields be handled?
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="radio"
                  name="overwrite_mode"
                  value="skip"
                  checked={overwriteMode === "skip"}
                  onChange={() => setOverwriteMode("skip")}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    Skip existing fields
                  </p>
                  <p className="text-xs text-gray-400">
                    Only populate empty fields. Existing values are preserved.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="radio"
                  name="overwrite_mode"
                  value="overwrite"
                  checked={overwriteMode === "overwrite"}
                  onChange={() => setOverwriteMode("overwrite")}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    Overwrite existing fields
                  </p>
                  <p className="text-xs text-gray-400">
                    Replace existing values with client data.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Overwrite reason (required if overwrite mode) */}
          {overwriteMode === "overwrite" && (
            <div>
              <label
                htmlFor="overwrite-reason"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Reason for Overwriting
              </label>
              <textarea
                id="overwrite-reason"
                value={overwriteReason}
                onChange={(e) => setOverwriteReason(e.target.value)}
                rows={3}
                placeholder="Explain why existing values should be replaced..."
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                {overwriteReason.length}/10 characters minimum
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-400">
              This action will update the deal record and cannot be undone.
              The submission status will change to COMPLETED.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Populating..." : "Populate Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PopulateSubmissionModal;
