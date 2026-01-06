"use client";

import { useState, useMemo } from "react";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
} from "lucide-react";
import type { ColumnMapping, CanonicalField } from "@hps-internal/contracts";
import type {
  ParsedFile,
  NormalizedRow,
  BatchValidationResult,
} from "@/lib/import";

// =============================================================================
// TYPES
// =============================================================================

interface ValidateStepProps {
  parsedFile: ParsedFile | null;
  normalizedRows: Array<NormalizedRow & { dedupeKey?: string }>;
  validationResult: BatchValidationResult | null;
  columnMapping: ColumnMapping;
  onNext: () => void;
  onBack: () => void;
}

type FilterMode = "all" | "valid" | "errors";

const FIELD_LABELS: Record<CanonicalField, string> = {
  street: "Street Address",
  city: "City",
  state: "State",
  zip: "ZIP Code",
  client_name: "Client Name",
  client_phone: "Client Phone",
  client_email: "Client Email",
  seller_name: "Seller Name",
  seller_phone: "Seller Phone",
  seller_email: "Seller Email",
  seller_strike_price: "Minimum Acceptable Price",
  absorption_rate: "Absorption Rate",
  cash_buyer_share_pct: "Cash Buyer Share %",
  tags: "Tags",
  notes: "Notes",
  external_id: "External ID",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ValidateStep({
  parsedFile,
  normalizedRows,
  validationResult,
  columnMapping,
  onNext,
  onBack,
}: ValidateStepProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showErrorBreakdown, setShowErrorBreakdown] = useState(true);

  // Combine normalized rows with validation results
  const rowsWithValidation = useMemo(() => {
    if (!validationResult) return [];

    return normalizedRows.map((row, index) => {
      const validation = validationResult.results[index];
      return {
        ...row,
        isValid: validation?.isValid ?? true,
        errors: validation?.errors ?? [],
      };
    });
  }, [normalizedRows, validationResult]);

  // Filter rows based on mode
  const filteredRows = useMemo(() => {
    switch (filterMode) {
      case "valid":
        return rowsWithValidation.filter((r) => r.isValid);
      case "errors":
        return rowsWithValidation.filter((r) => !r.isValid);
      default:
        return rowsWithValidation;
    }
  }, [rowsWithValidation, filterMode]);

  // Error breakdown by field
  const errorBreakdown = useMemo(() => {
    if (!validationResult) return [];

    return Object.entries(validationResult.errorsByField)
      .map(([field, count]) => ({
        field: field as CanonicalField,
        label: FIELD_LABELS[field as CanonicalField] || field,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [validationResult]);

  const toggleRowExpand = (rowNumber: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  if (!parsedFile || !validationResult) {
    return (
      <div className="flex items-center justify-center p-12">
        <div
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Validating data"
        />
      </div>
    );
  }

  const { validCount, invalidCount } = validationResult;
  const totalRows = validCount + invalidCount;
  const validPercent =
    totalRows > 0 ? Math.round((validCount / totalRows) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CopyIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{totalRows}</p>
              <p className="text-slate-400 text-sm">Total Rows</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-400">
                {validCount}
              </p>
              <p className="text-slate-400 text-sm">Valid ({validPercent}%)</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircleIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-red-400">
                {invalidCount}
              </p>
              <p className="text-slate-400 text-sm">Need Fixes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Breakdown */}
      {invalidCount > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowErrorBreakdown(!showErrorBreakdown)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-amber-400" />
              <span className="text-white font-medium">
                Error Breakdown by Field
              </span>
            </div>
            {showErrorBreakdown ? (
              <ChevronDownIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {showErrorBreakdown && (
            <div className="p-4 pt-0 space-y-2">
              {errorBreakdown.map(({ field, label, count }) => (
                <div
                  key={field}
                  className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg"
                >
                  <span className="text-slate-300">{label}</span>
                  <span className="text-red-400 font-medium">
                    {count} error{count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg w-fit">
        {[
          { mode: "all" as const, label: "All", count: totalRows },
          { mode: "valid" as const, label: "Valid", count: validCount },
          { mode: "errors" as const, label: "Errors", count: invalidCount },
        ].map(({ mode, label, count }) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            aria-pressed={filterMode === mode}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${
                filterMode === mode
                  ? "bg-blue-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }
            `}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="border border-slate-700 rounded-xl overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800 z-10">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-slate-300 font-medium w-12">
                  #
                </th>
                <th scope="col" className="px-4 py-3 text-left text-slate-300 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-slate-300 font-medium">
                  Address
                </th>
                <th scope="col" className="px-4 py-3 text-left text-slate-300 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 text-left text-slate-300 font-medium">
                  Issues
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredRows.slice(0, 100).map((row) => {
                const address = `${row.normalized.street || ""}, ${row.normalized.city || ""}, ${row.normalized.state || ""} ${row.normalized.zip || ""}`.trim();
                const client = row.normalized.client_name || "—";

                return (
                  <tr
                    key={row.rowNumber}
                    className={`
                      ${row.isValid ? "bg-slate-800/30" : "bg-red-500/5"}
                      ${!row.isValid ? "cursor-pointer hover:bg-red-500/10" : ""}
                    `}
                    onClick={() =>
                      !row.isValid && toggleRowExpand(row.rowNumber)
                    }
                  >
                    <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircleIcon className="w-4 h-4" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircleIcon className="w-4 h-4" />
                          {row.errors.length} error
                          {row.errors.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 truncate max-w-[200px]">
                      {address || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 truncate max-w-[150px]">
                      {client}
                    </td>
                    <td className="px-4 py-3">
                      {!row.isValid && (
                        <div className="flex flex-wrap gap-1">
                          {row.errors.slice(0, 3).map((err, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded"
                            >
                              {FIELD_LABELS[err.field as CanonicalField] ||
                                err.field}
                            </span>
                          ))}
                          {row.errors.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
                              +{row.errors.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 100 && (
          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 text-center">
            <p className="text-slate-400 text-sm">
              Showing 100 of {filteredRows.length} rows
            </p>
          </div>
        )}
      </div>

      {/* Action Banner */}
      {invalidCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertCircleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">
              {invalidCount} row{invalidCount !== 1 ? "s" : ""} have validation
              errors
            </p>
            <p className="text-amber-300/80 text-sm mt-1">
              These rows will be saved with &quot;needs fix&quot; status. You can edit
              them in the Import Center after committing.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Back to Mapping
        </button>
        <button
          onClick={onNext}
          disabled={validCount === 0}
          className={`
            px-6 py-2 font-medium rounded-lg transition-colors
            ${
              validCount > 0
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          Continue to Import ({validCount} valid)
        </button>
      </div>
    </div>
  );
}
