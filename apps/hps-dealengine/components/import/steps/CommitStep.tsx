"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  UploadCloudIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  RefreshCwIcon,
  ExternalLinkIcon,
} from "lucide-react";
import type {
  ColumnMapping,
  FileType,
  SourceRoute,
  ImportJob,
} from "@hps-internal/contracts";
import type {
  ParsedFile,
  NormalizedRow,
  BatchValidationResult,
} from "@/lib/import";
import {
  createImportJobDryRun,
  uploadImportFile,
} from "@/lib/import/importApi";
import {
  upsertImportItems,
  aggregateUpsertResults,
  markJobReady,
  markJobFailed,
  type ImportItemInput,
  type ImportItemPayload,
} from "@/lib/import/importItemsApi";

// =============================================================================
// TYPES
// =============================================================================

interface CommitStepProps {
  file: File | null;
  fileHash: string | null;
  fileType: FileType | null;
  parsedFile: ParsedFile | null;
  normalizedRows: Array<NormalizedRow & { dedupeKey: string }>;
  validationResult: BatchValidationResult | null;
  columnMapping: ColumnMapping;
  sourceRoute: SourceRoute;
  onComplete?: (jobId: string) => void;
  onBack: () => void;
}

type CommitPhase =
  | "ready"
  | "creating_job"
  | "uploading_file"
  | "processing_items"
  | "finalizing"
  | "complete"
  | "error";

interface CommitProgress {
  phase: CommitPhase;
  message: string;
  detail?: string;
  percent?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizedToPayload(
  normalized: Record<string, string>
): ImportItemPayload {
  return {
    street: normalized.street || "",
    city: normalized.city || "",
    state: normalized.state || "",
    zip: normalized.zip || "",
    client_name: normalized.client_name || "",
    client_phone: normalized.client_phone || "",
    client_email: normalized.client_email || "",
    seller_name: normalized.seller_name || null,
    seller_phone: normalized.seller_phone || null,
    seller_email: normalized.seller_email || null,
    tags: normalized.tags ? normalized.tags.split(",").map((t) => t.trim()) : null,
    notes: normalized.notes || null,
    external_id: normalized.external_id || null,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CommitStep({
  file,
  fileHash,
  fileType,
  parsedFile,
  normalizedRows,
  validationResult,
  columnMapping,
  sourceRoute,
  onComplete,
  onBack,
}: CommitStepProps) {
  const [progress, setProgress] = useState<CommitProgress>({
    phase: "ready",
    message: "Ready to import",
  });
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startImport = useCallback(async () => {
    if (!file || !fileHash || !fileType || !parsedFile || !validationResult) {
      setError("Missing required data. Please go back and try again.");
      return;
    }

    setError(null);
    setProgress({ phase: "creating_job", message: "Creating import job..." });

    try {
      // =======================================================================
      // PHASE 1: Create Job
      // =======================================================================
      const jobResult = await createImportJobDryRun({
        file,
        source_route: sourceRoute,
        import_kind: "deals",
        file_type: fileType,
        file_name: file.name,
      });

      const createdJob = jobResult.job;
      setJob(createdJob);

      // =======================================================================
      // PHASE 2: Upload File
      // =======================================================================
      setProgress({
        phase: "uploading_file",
        message: "Uploading file...",
        percent: 0,
      });

      await uploadImportFile(
        jobResult.upload_path,
        jobResult.upload_url,
        file
      );

      setProgress({
        phase: "uploading_file",
        message: "File uploaded",
        percent: 100,
      });

      // =======================================================================
      // PHASE 3: Process Items
      // =======================================================================
      setProgress({
        phase: "processing_items",
        message: "Processing rows...",
        detail: `0 of ${normalizedRows.length}`,
        percent: 0,
      });

      // Prepare items for upsert - transform normalized rows to API format
      const items: ImportItemInput[] = normalizedRows.map((row, index) => {
        const validation = validationResult.results[index];
        return {
          row_number: row.rowNumber,
          dedupe_key: row.dedupeKey,
          payload_json: normalizedToPayload(row.normalized),
          validation: {
            valid: validation?.isValid ?? true,
            errors: (validation?.errors ?? []).map((e) => e.message),
          },
        };
      });

      // Upsert in batches
      const batchResults = await upsertImportItems(
        createdJob.id,
        items,
        (processed, total) => {
          const percent = Math.round((processed / total) * 100);
          setProgress({
            phase: "processing_items",
            message: "Processing rows...",
            detail: `${processed} of ${total}`,
            percent,
          });
        }
      );

      const totals = aggregateUpsertResults(batchResults);

      // =======================================================================
      // PHASE 4: Finalize
      // =======================================================================
      setProgress({
        phase: "finalizing",
        message: "Finalizing import...",
      });

      // Update job status to ready with counts
      await markJobReady(createdJob.id, {
        total_rows: totals.totalProcessed,
        valid_rows: totals.validCount,
        error_rows: totals.needsFixCount,
      });

      // =======================================================================
      // COMPLETE
      // =======================================================================
      setProgress({
        phase: "complete",
        message: "Import complete!",
        detail: `${totals.validCount} valid, ${totals.needsFixCount} need fixes`,
      });

      // Slight delay before callback to show success state
      setTimeout(() => {
        onComplete?.(createdJob.id);
      }, 1500);
    } catch (err) {
      console.error("Import error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setProgress({
        phase: "error",
        message: "Import failed",
      });

      // Try to mark job as failed if we have one
      if (job?.id) {
        try {
          await markJobFailed(job.id, errorMessage);
        } catch {
          // Ignore failure to mark failed
        }
      }
    }
  }, [
    file,
    fileHash,
    fileType,
    parsedFile,
    normalizedRows,
    validationResult,
    sourceRoute,
    onComplete,
    job,
  ]);

  const handleRetry = useCallback(() => {
    setError(null);
    setJob(null);
    setProgress({ phase: "ready", message: "Ready to import" });
  }, []);

  // Calculate stats
  const validCount = validationResult?.validCount || 0;
  const invalidCount = validationResult?.invalidCount || 0;
  const totalRows = validCount + invalidCount;

  const isProcessing = [
    "creating_job",
    "uploading_file",
    "processing_items",
    "finalizing",
  ].includes(progress.phase);
  const isComplete = progress.phase === "complete";
  const hasError = progress.phase === "error";

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
        <h3 className="text-lg font-medium text-white mb-4">Import Summary</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-2xl font-semibold text-white">{totalRows}</p>
            <p className="text-slate-400 text-sm">Total Rows</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-2xl font-semibold text-emerald-400">
              {validCount}
            </p>
            <p className="text-slate-400 text-sm">Valid</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-2xl font-semibold text-amber-400">
              {invalidCount}
            </p>
            <p className="text-slate-400 text-sm">Need Fixes</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-2xl font-semibold text-slate-300">
              {Object.values(columnMapping).filter(Boolean).length}
            </p>
            <p className="text-slate-400 text-sm">Mapped Fields</p>
          </div>
        </div>

        {file && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              <span className="text-slate-300">{file.name}</span>
              <span className="mx-2">•</span>
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              <span className="mx-2">•</span>
              <span className="uppercase">{fileType}</span>
            </p>
          </div>
        )}
      </div>

      {/* Progress Card */}
      {(isProcessing || isComplete || hasError) && (
        <div
          className={`
          p-6 rounded-xl border
          ${
            isComplete
              ? "bg-emerald-500/10 border-emerald-500/30"
              : hasError
                ? "bg-red-500/10 border-red-500/30"
                : "bg-slate-800/50 border-slate-700"
          }
        `}
        >
          <div className="flex items-center gap-4">
            {isProcessing && (
              <Loader2Icon className="w-8 h-8 text-blue-400 animate-spin" />
            )}
            {isComplete && (
              <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
            )}
            {hasError && <XCircleIcon className="w-8 h-8 text-red-400" />}

            <div className="flex-1">
              <p
                className={`
                font-medium
                ${isComplete ? "text-emerald-400" : hasError ? "text-red-400" : "text-white"}
              `}
              >
                {progress.message}
              </p>
              {progress.detail && (
                <p className="text-slate-400 text-sm mt-1">{progress.detail}</p>
              )}
            </div>

            {progress.percent !== undefined && !isComplete && !hasError && (
              <span className="text-slate-300 font-medium">
                {progress.percent}%
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {progress.percent !== undefined && !isComplete && !hasError && (
            <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Import failed</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300
                       bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
          >
            <RefreshCwIcon className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Success Actions */}
      {isComplete && job && (
        <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
          <div className="flex-1">
            <p className="text-emerald-400 font-medium">
              Import job created successfully!
            </p>
            <p className="text-emerald-300/80 text-sm">
              Redirecting to Import Center...
            </p>
          </div>
          <Link
            href={`/import?jobId=${job.id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-400 hover:text-emerald-300
                       bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"
          >
            View Import
            <ExternalLinkIcon className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Info Banner */}
      {progress.phase === "ready" && (
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <UploadCloudIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-400 font-medium">Ready to import</p>
            <p className="text-blue-300/80 text-sm mt-1">
              Click &quot;Start Import&quot; to upload your file and create the import
              job.
              {invalidCount > 0 &&
                " Rows with errors will be saved for later review."}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Back
        </button>

        {!isComplete && (
          <button
            onClick={startImport}
            disabled={isProcessing || validCount === 0}
            className={`
              flex items-center gap-2 px-6 py-2 font-medium rounded-lg transition-colors
              ${
                !isProcessing && validCount > 0
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <UploadCloudIcon className="w-4 h-4" />
                Start Import
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
