"use client";

import { useState, useCallback } from "react";
import { DownloadIcon, Loader2Icon, CheckIcon } from "lucide-react";
import type { ItemStatus } from "@/lib/import/importItemsApi";
import { fetchAllImportItems } from "@/lib/import/importItemsApi";
import {
  exportItemsToCsv,
  downloadCsv,
  generateExportFilename,
} from "@/lib/import/exportCsv";

interface ExportButtonProps {
  jobId: string;
  jobName: string;
  statusFilter?: ItemStatus | null;
  disabled?: boolean;
  variant?: "default" | "small";
}

export function ExportButton({
  jobId,
  jobName,
  statusFilter,
  disabled = false,
  variant = "default",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setShowSuccess(false);

    try {
      // Fetch all items
      const items = await fetchAllImportItems(
        jobId,
        statusFilter || undefined
      );

      if (items.length === 0) {
        alert("No items to export");
        return;
      }

      // Generate CSV
      const csv = exportItemsToCsv(items, {
        includeHeaders: true,
        includeRowNumbers: true,
        includeStatus: true,
        includeErrors: true,
      });

      // Download
      const suffix = statusFilter ? statusFilter.replace(/_/g, "-") : "all";
      const filename = generateExportFilename(jobName, suffix);
      downloadCsv(csv, filename);

      // Show success briefly
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export items");
    } finally {
      setIsExporting(false);
    }
  }, [jobId, jobName, statusFilter]);

  const isSmall = variant === "small";

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className={`
        flex items-center gap-2 font-medium rounded-lg transition-colors
        ${isSmall ? "px-2 py-1.5 text-xs" : "px-3 py-1.5 text-sm"}
        ${
          disabled || isExporting
            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
            : showSuccess
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
        }
      `}
      title={statusFilter ? `Export ${statusFilter} items` : "Export all items"}
      aria-label={
        statusFilter ? `Export ${statusFilter} items` : "Export all items"
      }
    >
      {isExporting ? (
        <Loader2Icon
          className={`${isSmall ? "w-3 h-3" : "w-4 h-4"} animate-spin`}
        />
      ) : showSuccess ? (
        <CheckIcon className={`${isSmall ? "w-3 h-3" : "w-4 h-4"}`} />
      ) : (
        <DownloadIcon className={`${isSmall ? "w-3 h-3" : "w-4 h-4"}`} />
      )}
      {!isSmall && (showSuccess ? "Exported" : "Export")}
    </button>
  );
}
