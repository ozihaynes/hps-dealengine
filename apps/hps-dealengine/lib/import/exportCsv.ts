"use client";

import { sanitizeForCsv } from "./sanitization";
import type { ImportItem, ItemStatus } from "./importItemsApi";

// =============================================================================
// TYPES
// =============================================================================

export interface ExportOptions {
  includeHeaders?: boolean;
  includeRowNumbers?: boolean;
  includeStatus?: boolean;
  includeErrors?: boolean;
  statusFilter?: ItemStatus[];
}

// =============================================================================
// CSV EXPORT
// =============================================================================

/**
 * Export import items to CSV with OWASP-safe sanitization
 */
export function exportItemsToCsv(
  items: ImportItem[],
  options: ExportOptions = {}
): string {
  const {
    includeHeaders = true,
    includeRowNumbers = true,
    includeStatus = true,
    includeErrors = true,
    statusFilter,
  } = options;

  // Filter items if needed
  let filteredItems = items;
  if (statusFilter && statusFilter.length > 0) {
    filteredItems = items.filter((item) => statusFilter.includes(item.status));
  }

  if (filteredItems.length === 0) {
    return "";
  }

  // Define columns
  const columns: string[] = [];
  if (includeRowNumbers) columns.push("Row");
  if (includeStatus) columns.push("Status");

  // Add canonical fields
  columns.push(
    "Street",
    "City",
    "State",
    "ZIP",
    "Client Name",
    "Client Phone",
    "Client Email",
    "Seller Name",
    "Seller Phone",
    "Seller Email",
    "Tags",
    "Notes",
    "External ID"
  );

  if (includeErrors) columns.push("Errors");

  // Build rows
  const rows: string[][] = [];

  if (includeHeaders) {
    rows.push(columns);
  }

  for (const item of filteredItems) {
    const payload =
      (item.payload_json as unknown as Record<string, unknown>) || {};
    const errors = item.validation_errors || [];

    const row: string[] = [];

    if (includeRowNumbers) row.push(sanitizeForCsv(String(item.row_number)));
    if (includeStatus) row.push(sanitizeForCsv(formatStatus(item.status)));

    // Canonical fields
    row.push(sanitizeForCsv(payload.street as string));
    row.push(sanitizeForCsv(payload.city as string));
    row.push(sanitizeForCsv(payload.state as string));
    row.push(sanitizeForCsv(payload.zip as string));
    row.push(sanitizeForCsv(payload.client_name as string));
    row.push(sanitizeForCsv(payload.client_phone as string));
    row.push(sanitizeForCsv(payload.client_email as string));
    row.push(sanitizeForCsv(payload.seller_name as string));
    row.push(sanitizeForCsv(payload.seller_phone as string));
    row.push(sanitizeForCsv(payload.seller_email as string));
    row.push(sanitizeForCsv(formatTags(payload.tags)));
    row.push(sanitizeForCsv(payload.notes as string));
    row.push(sanitizeForCsv(payload.external_id as string));

    if (includeErrors) {
      const errorText = errors.join("; ");
      row.push(sanitizeForCsv(errorText));
    }

    rows.push(row);
  }

  // Convert to CSV string
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

/**
 * Escape a cell value for CSV
 */
function escapeCell(value: string): string {
  // If the value contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (
    value.includes('"') ||
    value.includes(",") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format tags array for display
 */
function formatTags(tags: unknown): string {
  if (!tags) return "";
  if (Array.isArray(tags)) return tags.join(", ");
  return String(tags);
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    valid: "Valid",
    needs_fix: "Needs Fix",
    promoted: "Promoted",
    skipped_duplicate: "Duplicate",
    skipped_other: "Skipped",
    failed: "Failed",
  };
  return statusMap[status] || status;
}

/**
 * Download CSV as a file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  jobName: string,
  suffix?: string
): string {
  const baseName = jobName.replace(/\.[^/.]+$/, ""); // Remove extension
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);

  if (suffix) {
    return `${safeName}_${suffix}_${timestamp}.csv`;
  }
  return `${safeName}_export_${timestamp}.csv`;
}
