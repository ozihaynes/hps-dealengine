"use client";

import React, { useState } from "react";
import { rejectIntakeSubmission } from "@/lib/intakeStaff";

type RejectSubmissionModalProps = {
  submissionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function RejectSubmissionModal({
  submissionId,
  onClose,
  onSuccess,
}: RejectSubmissionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.length < 10) {
      setError("Please provide at least 10 characters for the rejection reason.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await rejectIntakeSubmission(submissionId, reason);
      onSuccess();
    } catch (err) {
      console.error("Failed to reject submission:", err);
      setError(err instanceof Error ? err.message : "Failed to reject submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-gray-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">Reject Submission</h2>
        <p className="mt-1 text-sm text-gray-400">
          This action cannot be undone. The client will be notified of the rejection.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="rejection-reason"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Rejection Reason
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this submission is being rejected..."
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              {reason.length}/10 characters minimum
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
              disabled={isSubmitting || reason.length < 10}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Rejecting..." : "Reject Submission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RejectSubmissionModal;
