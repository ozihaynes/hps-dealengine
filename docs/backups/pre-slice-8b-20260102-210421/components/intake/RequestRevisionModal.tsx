"use client";

import React, { useState } from "react";
import { requestIntakeRevision } from "@/lib/intakeStaff";

type RequestRevisionModalProps = {
  submissionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function RequestRevisionModal({
  submissionId,
  onClose,
  onSuccess,
}: RequestRevisionModalProps) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (notes.length < 10) {
      setError("Please provide at least 10 characters for the revision notes.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await requestIntakeRevision(submissionId, notes);
      onSuccess();
    } catch (err) {
      console.error("Failed to request revision:", err);
      setError(err instanceof Error ? err.message : "Failed to request revision");
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
        <h2 className="text-lg font-semibold text-white">Request Revision</h2>
        <p className="mt-1 text-sm text-gray-400">
          Send the client a request to revise and resubmit their intake form.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="revision-notes"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Revision Notes
            </label>
            <textarea
              id="revision-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Explain what needs to be revised or corrected..."
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              {notes.length}/10 characters minimum
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
              disabled={isSubmitting || notes.length < 10}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RequestRevisionModal;
