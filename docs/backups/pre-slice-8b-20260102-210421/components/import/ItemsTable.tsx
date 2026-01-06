"use client";

import { useState } from "react";
import type { ItemStatus } from "@hps-internal/contracts";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  PencilIcon,
} from "lucide-react";
import { ItemStatusBadge } from "./ItemStatusBadge";
import type { ImportItemRow } from "@/hooks/useImportItems";

// =============================================================================
// TYPES
// =============================================================================

interface ItemsTableProps {
  items: ImportItemRow[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
  onRefresh: () => void;
  onFilterChange: (status: ItemStatus | null) => void;
  currentFilter: ItemStatus | null;
  onEdit?: (item: ImportItemRow) => void;
}

const FILTER_OPTIONS: Array<{ value: ItemStatus | null; label: string }> = [
  { value: null, label: "All Items" },
  { value: "valid", label: "Valid" },
  { value: "needs_fix", label: "Needs Fix" },
  { value: "promoted", label: "Promoted" },
  { value: "skipped_duplicate", label: "Duplicates" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ItemsTable({
  items,
  isLoading,
  error,
  hasMore,
  total,
  onLoadMore,
  onRefresh,
  onFilterChange,
  currentFilter,
  onEdit,
}: ItemsTableProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getAddressDisplay = (payload: Record<string, unknown>): string => {
    const street = payload.street || "";
    const city = payload.city || "";
    const state = payload.state || "";
    const zip = payload.zip || "";
    return `${street}, ${city}, ${state} ${zip}`.trim().replace(/^,\s*/, "");
  };

  const getClientDisplay = (payload: Record<string, unknown>): string => {
    return (payload.client_name as string) || "—";
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

        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">
            {items.length} of {total} items
          </span>
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
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangleIcon className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-white font-medium mb-1">No items found</p>
          <p className="text-slate-400 text-sm">
            {currentFilter
              ? `No items with "${currentFilter.replace(/_/g, " ")}" status`
              : "No items in this job"}
          </p>
        </div>
      )}

      {/* Items List */}
      {items.length > 0 && (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium w-8" />
                  <th className="px-4 py-3 text-left text-slate-300 font-medium w-16">
                    Row
                  </th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">
                    Issues
                  </th>
                  <th className="px-4 py-3 text-right text-slate-300 font-medium w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const hasErrors =
                    item.validation_errors && item.validation_errors.length > 0;

                  return (
                    <>
                      <tr
                        key={item.id}
                        className={`
                          ${item.status === "needs_fix" ? "bg-amber-500/5" : ""}
                          ${item.status === "failed" ? "bg-red-500/5" : ""}
                          hover:bg-slate-800/50 transition-colors
                        `}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-4 h-4" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {item.row_number}
                        </td>
                        <td className="px-4 py-3">
                          <ItemStatusBadge status={item.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-slate-300 truncate max-w-[200px]">
                          {getAddressDisplay(item.payload_json)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 truncate max-w-[150px]">
                          {getClientDisplay(item.payload_json)}
                        </td>
                        <td className="px-4 py-3">
                          {hasErrors ? (
                            <span className="text-amber-400 text-xs">
                              {item.validation_errors?.length} error
                              {item.validation_errors!.length !== 1 ? "s" : ""}
                            </span>
                          ) : item.skip_reason ? (
                            <span className="text-slate-500 text-xs capitalize">
                              {item.skip_reason.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {onEdit && ["pending", "valid", "needs_fix"].includes(item.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700
                                         rounded transition-colors"
                              title="Edit item"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr
                          key={`${item.id}-details`}
                          className="bg-slate-900/50"
                        >
                          <td colSpan={7} className="px-8 py-4">
                            <div className="space-y-4">
                              {/* Payload */}
                              <div>
                                <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">
                                  Payload Data
                                </p>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  {Object.entries(item.payload_json).map(
                                    ([key, value]) => (
                                      <div key={key}>
                                        <p className="text-slate-500 capitalize">
                                          {key.replace(/_/g, " ")}
                                        </p>
                                        <p className="text-white">
                                          {String(value) || "—"}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Validation Errors */}
                              {hasErrors && (
                                <div>
                                  <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">
                                    Validation Errors
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.validation_errors?.map((err, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded"
                                      >
                                        {err}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Skip Reason */}
                              {item.skip_reason && (
                                <div>
                                  <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">
                                    Skip Reason
                                  </p>
                                  <p className="text-slate-400 capitalize">
                                    {item.skip_reason.replace(/_/g, " ")}
                                  </p>
                                </div>
                              )}

                              {/* Promoted Deal */}
                              {item.promoted_deal_id && (
                                <div>
                                  <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">
                                    Promoted Deal
                                  </p>
                                  <p className="text-blue-400 font-mono text-xs">
                                    {item.promoted_deal_id}
                                  </p>
                                </div>
                              )}

                              {/* Item ID */}
                              <div>
                                <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">
                                  Item ID
                                </p>
                                <p className="text-slate-500 font-mono text-xs">
                                  {item.id}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

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

      {/* Loading State */}
      {isLoading && items.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
