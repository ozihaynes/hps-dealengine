"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchIntakeSubmissionDetail,
  type IntakeSubmissionDetail as DetailType,
} from "@/lib/intakeStaff";
import { IntakeSubmissionDetail } from "@/components/intake/IntakeSubmissionDetail";
import { RequestRevisionModal } from "@/components/intake/RequestRevisionModal";
import { RejectSubmissionModal } from "@/components/intake/RejectSubmissionModal";
import { PopulateSubmissionModal } from "@/components/intake/PopulateSubmissionModal";

export default function IntakeSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [detail, setDetail] = useState<DetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPopulateModal, setShowPopulateModal] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!submissionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchIntakeSubmissionDetail(submissionId);
      setDetail(response);
    } catch (err) {
      console.error("Failed to load submission detail:", err);
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setIsLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleActionComplete = () => {
    // Reload detail after action
    loadDetail();
    setShowRevisionModal(false);
    setShowRejectModal(false);
  };

  const handlePopulateComplete = () => {
    // Reload detail and redirect to inbox after population
    loadDetail();
    setShowPopulateModal(false);
    router.push("/intake-inbox");
  };

  // Compute file status for populate modal
  const hasPendingFiles = detail?.files.some((f) => f.scan_status === "PENDING") ?? false;
  const hasInfectedFiles = detail?.files.some((f) => f.scan_status === "INFECTED") ?? false;

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="ml-3 text-gray-400">Loading submission...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/intake-inbox"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Inbox
          </Link>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">
              {error || "Submission not found or access denied"}
            </p>
            <button
              type="button"
              onClick={() => router.push("/intake-inbox")}
              className="mt-4 rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
            >
              Return to Inbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/intake-inbox"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Inbox
        </Link>

        {/* Detail Component */}
        <IntakeSubmissionDetail
          detail={detail}
          onRequestRevision={() => setShowRevisionModal(true)}
          onReject={() => setShowRejectModal(true)}
          onPopulate={() => setShowPopulateModal(true)}
        />
      </div>

      {/* Modals */}
      {showRevisionModal && (
        <RequestRevisionModal
          submissionId={submissionId}
          onClose={() => setShowRevisionModal(false)}
          onSuccess={handleActionComplete}
        />
      )}

      {showRejectModal && (
        <RejectSubmissionModal
          submissionId={submissionId}
          onClose={() => setShowRejectModal(false)}
          onSuccess={handleActionComplete}
        />
      )}

      {showPopulateModal && (
        <PopulateSubmissionModal
          submissionId={submissionId}
          hasPendingFiles={hasPendingFiles}
          hasInfectedFiles={hasInfectedFiles}
          onClose={() => setShowPopulateModal(false)}
          onSuccess={handlePopulateComplete}
        />
      )}
    </div>
  );
}
