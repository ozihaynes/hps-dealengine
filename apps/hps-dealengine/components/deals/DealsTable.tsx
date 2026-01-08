"use client";

import React, { useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { SearchIcon, CalendarIcon, ChevronDownIcon, LayoutListIcon, PrinterIcon } from "lucide-react";

import type { DbDeal } from "@/lib/dealSessionContext";
import { extractContactFromPayload, formatAddressLine } from "@/lib/deals";

type DealsTableProps = {
  deals: DbDeal[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (deal: DbDeal) => void;
  actionsSlot?: ReactNode;
  title?: string;
  emptyCta?: ReactNode;
  showPrintButton?: boolean;
};

type DisplayDeal = {
  id: string;
  clientName: string;
  clientNameIsPlaceholder: boolean;
  propertyAddress: string;
  created: string;
  raw: DbDeal;
};

function deriveClientName(deal: DbDeal): { name: string; isPlaceholder: boolean } {
  const payloadContact = extractContactFromPayload(deal.payload ?? null);
  const name =
    deal.client_name ??
    (deal as any)?.clientName ??
    payloadContact?.name ??
    null;

  return {
    name: name ?? "Client name not set",
    isPlaceholder: !name,
  };
}

function derivePropertyAddress(deal: DbDeal): string {
  const addressLine = formatAddressLine({
    address: deal.address ?? "",
    city: deal.city ?? undefined,
    state: deal.state ?? undefined,
    zip: deal.zip ?? undefined,
  });
  return addressLine || "Property address not set";
}

// Shared input classes for consistency
const inputClasses = `
  h-9 px-3
  bg-slate-800/60
  border border-slate-600/40
  rounded-lg
  text-sm text-white
  placeholder:text-slate-500
  transition-all duration-150
  focus:outline-none
  focus:border-sky-500/50
  focus:ring-1
  focus:ring-sky-500/20
`;

export function DealsTable({
  deals,
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  actionsSlot,
  title = "Deals",
  emptyCta,
  showPrintButton = false,
}: DealsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "az">("newest");

  const displayDeals: DisplayDeal[] = useMemo(() => {
    const mapped: DisplayDeal[] = deals.map((deal) => {
      const { name, isPlaceholder } = deriveClientName(deal);
      return {
        id: deal.id,
        clientName: name,
        clientNameIsPlaceholder: isPlaceholder,
        propertyAddress: derivePropertyAddress(deal),
        created: deal.created_at
          ? new Date(deal.created_at).toLocaleString()
          : "Unknown date",
        raw: deal,
      };
    });

    let data = [...mapped];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(
        (d) =>
          d.propertyAddress.toLowerCase().includes(lower) ||
          d.clientName.toLowerCase().includes(lower),
      );
    }

    if (dateFilter) {
      const dateStr = new Date(dateFilter).toISOString().split("T")[0];
      data = data.filter((d) => {
        const dealDate = new Date(d.created);
        return dealDate.toISOString().startsWith(dateStr);
      });
    }

    if (sortOrder === "newest") {
      data.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      );
    } else if (sortOrder === "oldest") {
      data.sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
      );
    } else if (sortOrder === "az") {
      data.sort((a, b) => a.propertyAddress.localeCompare(b.propertyAddress));
    }

    return data;
  }, [deals, searchTerm, dateFilter, sortOrder]);

  const handleRowClick = useCallback(
    (deal: DisplayDeal) => {
      if (onRowClick) onRowClick(deal.raw);
    },
    [onRowClick],
  );

  return (
    <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/30 rounded-xl overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-slate-700/30 flex flex-wrap items-center justify-between gap-4 print-hidden">
        {/* Left: Title */}
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <LayoutListIcon className="w-5 h-5 text-slate-400" />
          {title}
        </h2>

        {/* Right: Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClasses} w-44 pl-9`}
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`${inputClasses} w-40 pl-9`}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className={`${inputClasses} w-36 pr-8 appearance-none cursor-pointer`}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="az">Sort: A-Z</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {/* Actions Slot */}
          {actionsSlot}

          {/* Print Button */}
          {showPrintButton && (
            <button
              type="button"
              onClick={() => window.print()}
              className={`${inputClasses} flex items-center gap-2 hover:border-slate-500/50 hover:text-white`}
            >
              <PrinterIcon className="w-4 h-4" />
              Print
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Head */}
          <thead>
            <tr className="border-b border-slate-700/30">
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Client Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Property Address
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-700/20">
            {/* Loading State */}
            {loading && (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">Loading deals...</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Error State */}
            {error && !loading && (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-sm text-red-400">{error}</span>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/60 border border-slate-600/40 rounded-lg hover:border-slate-500/50 hover:text-white transition-all"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!loading &&
              !error &&
              displayDeals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => handleRowClick(deal)}
                  className="group cursor-pointer hover:bg-slate-800/40 transition-all duration-150"
                >
                  {/* Client Name */}
                  <td className="px-5 py-4">
                    {deal.clientNameIsPlaceholder ? (
                      <span className="text-sm text-slate-500 italic">
                        {deal.clientName}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-white group-hover:text-sky-400 transition-colors">
                        {deal.clientName}
                      </span>
                    )}
                  </td>

                  {/* Property Address */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-300">
                      {deal.propertyAddress}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm text-slate-500 font-mono">
                      {deal.created}
                    </span>
                  </td>
                </tr>
              ))}

            {/* Empty State */}
            {!loading && !error && displayDeals.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/30">
                      <LayoutListIcon className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white mb-1">No deals found</h3>
                      <p className="text-sm text-slate-400">
                        {searchTerm || dateFilter
                          ? "Try adjusting your filters"
                          : "Create your first deal to get started"}
                      </p>
                    </div>
                    {emptyCta && <div className="mt-2">{emptyCta}</div>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-700/30 text-right">
        <span className="text-xs text-slate-500">
          Showing {displayDeals.length} {displayDeals.length === 1 ? "record" : "records"}
        </span>
      </div>
    </section>
  );
}

export default DealsTable;
