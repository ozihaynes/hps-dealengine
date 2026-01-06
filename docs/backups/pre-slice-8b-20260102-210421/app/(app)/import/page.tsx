"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PlusIcon, FileSpreadsheetIcon, ArrowRightIcon } from "lucide-react";
import type { JobStatus, ItemStatus } from "@hps-internal/contracts";
import type { ImportJob } from "@hps-internal/contracts";
import { useImportJobs } from "@/hooks/useImportJobs";
import { useImportItems, type ImportItemRow } from "@/hooks/useImportItems";
import { JobsTable } from "@/components/import/JobsTable";
import { ItemsTable } from "@/components/import/ItemsTable";
import { ItemEditDrawer } from "@/components/import/ItemEditDrawer";
import { PromoteModal } from "@/components/import/PromoteModal";
import { ExportButton } from "@/components/import/ExportButton";
import { JobStatusBadge } from "@/components/import/JobStatusBadge";
import type { ImportItem } from "@/lib/import/importItemsApi";

export default function ImportCenterPage() {
  const searchParams = useSearchParams();
  const highlightJobId = searchParams.get("jobId");

  const [currentFilter, setCurrentFilter] = useState<JobStatus | null>(null);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [itemStatusFilter, setItemStatusFilter] = useState<ItemStatus | null>(null);
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Jobs hook
  const [jobsState, jobsActions] = useImportJobs({
    initialStatus: currentFilter,
    pageSize: 20,
    enableRealtime: true,
  });

  // Items hook (only when job is selected)
  const [itemsState, itemsActions] = useImportItems({
    jobId: selectedJob?.id || "",
    initialStatus: itemStatusFilter,
    pageSize: 50,
    enableRealtime: true,
  });

  // Handle job filter change
  const handleJobFilterChange = useCallback(
    (status: JobStatus | null) => {
      setCurrentFilter(status);
      jobsActions.setFilter(status);
    },
    [jobsActions]
  );

  // Handle item filter change
  const handleItemFilterChange = useCallback(
    (status: ItemStatus | null) => {
      setItemStatusFilter(status);
      itemsActions.setFilter(status);
    },
    [itemsActions]
  );

  // Handle job selection from table
  const handleJobSelect = useCallback((job: ImportJob) => {
    setSelectedJob(job);
    setItemStatusFilter(null);
  }, []);

  // Handle edit item
  const handleEditItem = useCallback((item: ImportItemRow) => {
    // Convert ImportItemRow to ImportItem for the drawer
    const importItem: ImportItem = {
      id: item.id,
      job_id: item.job_id,
      row_number: item.row_number,
      dedupe_key: item.dedupe_key,
      payload_json: item.payload_json as unknown as ImportItem["payload_json"],
      status: item.status,
      skip_reason: item.skip_reason as ImportItem["skip_reason"],
      validation_errors: item.validation_errors,
      promoted_deal_id: item.promoted_deal_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
    setEditingItem(importItem);
  }, []);

  // Handle item saved
  const handleItemSaved = useCallback(() => {
    // Refresh items and jobs to get updated counts
    itemsActions.refresh();
    jobsActions.refresh();
  }, [itemsActions, jobsActions]);

  // Handle promotion complete
  const handlePromoteComplete = useCallback(() => {
    // Refresh items and jobs to get updated counts
    itemsActions.refresh();
    jobsActions.refresh();
    setShowPromoteModal(false);
  }, [itemsActions, jobsActions]);

  // Check if job can be promoted
  const canPromote =
    selectedJob &&
    (selectedJob.status === "ready" || selectedJob.status === "promoting") &&
    (selectedJob.rows_valid ?? 0) > 0;

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Import Center</h1>
            <p className="text-slate-400 mt-1">Manage your deal imports</p>
          </div>
          <Link
            href="/import/wizard"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600
                       text-white font-medium rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Import
          </Link>
        </div>

        {/* Success Banner */}
        {highlightJobId && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-emerald-400">
              Import job created successfully! Job ID:{" "}
              <code className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded">
                {highlightJobId}
              </code>
            </p>
          </div>
        )}

        {/* Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jobs Panel */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-white font-medium">Import Jobs</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              <JobsTable
                jobs={jobsState.jobs}
                isLoading={jobsState.isLoading}
                error={jobsState.error}
                hasMore={jobsState.hasMore}
                onLoadMore={jobsActions.loadMore}
                onRefresh={jobsActions.refresh}
                onFilterChange={handleJobFilterChange}
                currentFilter={currentFilter}
                highlightJobId={highlightJobId}
                onJobClick={handleJobSelect}
                selectedJobId={selectedJob?.id}
              />
            </div>
          </div>

          {/* Items Panel */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {selectedJob ? (
              <>
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h2 className="text-white font-medium truncate">
                        {selectedJob.file_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <JobStatusBadge status={selectedJob.status} size="sm" />
                        <span className="text-slate-500 text-xs">
                          {selectedJob.rows_valid}/{selectedJob.rows_total} valid
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExportButton
                        jobId={selectedJob.id}
                        jobName={selectedJob.file_name}
                        statusFilter={itemStatusFilter}
                        variant="small"
                      />
                      {canPromote && (
                        <button
                          onClick={() => setShowPromoteModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600
                                     text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                          Promote
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedJob(null)}
                        className="text-slate-400 hover:text-white text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
                <div className="max-h-[550px] overflow-y-auto">
                  <ItemsTable
                    items={itemsState.items}
                    isLoading={itemsState.isLoading}
                    error={itemsState.error}
                    hasMore={itemsState.hasMore}
                    total={itemsState.total}
                    onLoadMore={itemsActions.loadMore}
                    onRefresh={itemsActions.refresh}
                    onFilterChange={handleItemFilterChange}
                    currentFilter={itemStatusFilter}
                    onEdit={handleEditItem}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <FileSpreadsheetIcon className="w-12 h-12 text-slate-600 mb-4" />
                <p className="text-slate-400">Select a job to view items</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      <ItemEditDrawer
        item={editingItem}
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSaved={handleItemSaved}
      />

      {/* Promote Modal */}
      {selectedJob && (
        <PromoteModal
          job={selectedJob}
          isOpen={showPromoteModal}
          onClose={() => setShowPromoteModal(false)}
          onComplete={handlePromoteComplete}
        />
      )}
    </div>
  );
}
