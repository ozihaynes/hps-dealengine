"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { ImportJob, JobStatus } from "@hps-internal/contracts";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  RefreshCwIcon,
  ArchiveIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { JobStatusBadge } from "./JobStatusBadge";
import { archiveImportJob } from "@/lib/import/importJobsApi";

// =============================================================================
// TYPES
// =============================================================================

interface JobsTableProps {
  jobs: ImportJob[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onFilterChange: (status: JobStatus | null) => void;
  currentFilter: JobStatus | null;
  highlightJobId?: string | null;
  onJobClick?: (job: ImportJob) => void;
  selectedJobId?: string | null;
}

const FILTER_OPTIONS: Array<{ value: JobStatus | null; label: string }> = [
  { value: null, label: "All Jobs" },
  { value: "ready", label: "Ready" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
  { value: "archived", label: "Archived" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function JobsTable({
  jobs,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onRefresh,
  onFilterChange,
  currentFilter,
  highlightJobId,
  onJobClick,
  selectedJobId,
}: JobsTableProps) {
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [archivingJob, setArchivingJob] = useState<string | null>(null);

  const toggleExpand = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleArchive = async (jobId: string) => {
    setArchivingJob(jobId);
    try {
      await archiveImportJob(jobId);
      onRefresh();
    } catch (err) {
      console.error("Failed to archive job:", err);
    } finally {
      setArchivingJob(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => onFilterChange(value)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${
                  currentFilter === value
                    ? "bg-blue-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white
                     hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCwIcon
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileSpreadsheetIcon className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-white font-medium mb-1">No import jobs found</p>
          <p className="text-slate-400 text-sm">
            {currentFilter
              ? `No jobs with "${currentFilter}" status`
              : "Start by creating a new import"}
          </p>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length > 0 && (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300 font-medium w-8" />
                <th className="px-4 py-3 text-left text-slate-300 font-medium">
                  File
                </th>
                <th className="px-4 py-3 text-left text-slate-300 font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-slate-300 font-medium">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-slate-300 font-medium">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-slate-300 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {jobs.map((job) => {
                const isExpanded = expandedJobs.has(job.id);
                const isHighlighted = highlightJobId === job.id;
                const isSelected = selectedJobId === job.id;
                const totalRows = job.rows_total || 0;
                const promotedRows = job.rows_promoted || 0;
                const progressPercent =
                  totalRows > 0
                    ? Math.round((promotedRows / totalRows) * 100)
                    : 0;

                return (
                  <>
                    <tr
                      key={job.id}
                      onClick={() => onJobClick?.(job)}
                      className={`
                        ${isSelected ? "bg-blue-500/20 border-l-2 border-blue-500" : ""}
                        ${isHighlighted && !isSelected ? "bg-blue-500/10" : ""}
                        ${!isSelected && !isHighlighted ? "hover:bg-slate-800/50" : ""}
                        ${onJobClick ? "cursor-pointer" : ""}
                        transition-colors
                      `}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(job.id);
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheetIcon className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="text-white font-medium truncate max-w-[200px]">
                              {job.file_name}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {formatFileSize(job.file_size_bytes)} •{" "}
                              {job.file_type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        {totalRows > 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-xs">
                              {promotedRows}/{totalRows}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDistanceToNow(new Date(job.created_at), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === "ready" && (
                            <Link
                              href={`/import/${job.id}`}
                              className="px-2 py-1 text-xs font-medium text-blue-400
                                         hover:text-blue-300 bg-blue-500/20 hover:bg-blue-500/30
                                         rounded transition-colors flex items-center gap-1"
                            >
                              <ExternalLinkIcon className="w-3 h-3" />
                              Review
                            </Link>
                          )}
                          {job.status !== "archived" && (
                            <button
                              onClick={() => handleArchive(job.id)}
                              disabled={archivingJob === job.id}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white
                                         hover:bg-slate-700 rounded transition-colors
                                         disabled:opacity-50"
                            >
                              <ArchiveIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr key={`${job.id}-details`} className="bg-slate-900/50">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="grid grid-cols-4 gap-6 text-sm">
                            <div>
                              <p className="text-slate-500 mb-1">Rows Total</p>
                              <p className="text-white font-medium">
                                {job.rows_total}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Valid</p>
                              <p className="text-emerald-400 font-medium">
                                {job.rows_valid}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Needs Fix</p>
                              <p className="text-amber-400 font-medium">
                                {job.rows_needs_fix}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Promoted</p>
                              <p className="text-blue-400 font-medium">
                                {job.rows_promoted}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">
                                Skipped (Duplicate)
                              </p>
                              <p className="text-slate-400 font-medium">
                                {job.rows_skipped_duplicate}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">
                                Skipped (Other)
                              </p>
                              <p className="text-slate-400 font-medium">
                                {job.rows_skipped_other}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Source</p>
                              <p className="text-white font-medium capitalize">
                                {job.source_route}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Job ID</p>
                              <p className="text-slate-400 font-mono text-xs">
                                {job.id}
                              </p>
                            </div>
                          </div>

                          {job.status_message && (
                            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                              <p className="text-slate-500 text-xs mb-1">
                                Status Message
                              </p>
                              <p className="text-slate-300">
                                {job.status_message}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {/* Load More */}
          {hasMore && (
            <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 text-center">
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium
                           disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && jobs.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
