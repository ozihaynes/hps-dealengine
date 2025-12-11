"use client";

import React, { useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";

import { GlassCard, Button, Icon } from "@/components/ui";
import { Icons } from "@/constants";
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
  propertyAddress: string;
  created: string;
  raw: DbDeal;
};

function deriveClientName(deal: DbDeal): string {
  const payloadContact = extractContactFromPayload(deal.payload ?? null);
  return (
    deal.client_name ??
    (deal as any)?.clientName ??
    payloadContact?.name ??
    "Client name not set"
  );
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
    const mapped: DisplayDeal[] = deals.map((deal) => ({
      id: deal.id,
      clientName: deriveClientName(deal),
      propertyAddress: derivePropertyAddress(deal),
      created: deal.created_at
        ? new Date(deal.created_at).toLocaleString()
        : "Unknown date",
      raw: deal,
    }));

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
    <GlassCard className="w-full p-8 md:p-10 relative overflow-hidden border-t border-accent-green/30">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent-green/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print-hidden">
        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Icon d={Icons.briefcase} size={20} className="text-text-secondary" />
          {title}
        </h3>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64 group">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dark-input h-10 text-sm w-full pl-10 transition-all focus:ring-2 focus:ring-accent-blue/50"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon
                d={Icons.search}
                size={16}
                className="text-text-secondary group-focus-within:text-accent-blue transition-colors"
              />
            </div>
          </div>
          <div className="w-full md:w-40">
            <input
              type="date"
              className="dark-input h-10 text-sm w-full"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="w-full md:w-40">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="dark-select h-10 text-sm w-full py-0 px-3"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="az">Sort: Address (A-Z)</option>
            </select>
          </div>
          {actionsSlot}
          {showPrintButton && (
            <Button
              type="button"
              variant="neutral"
              className="whitespace-nowrap print-hidden"
              onClick={() => window.print()}
            >
              <Icon d={Icons.print} size={16} className="mr-2" />
              Print
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-brand-navy/95 backdrop-blur-md z-10 text-xs uppercase tracking-wider text-text-secondary font-semibold">
              <tr>
                <th className="p-4 border-b border-white/10 whitespace-nowrap">
                  Client Name
                </th>
                <th className="p-4 border-b border-white/10">Property Address</th>
                <th className="p-4 border-b border-white/10 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-text-secondary">
                    Loading deals.
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-accent-red">
                    {error}
                    {onRetry && (
                      <div className="mt-3">
                        <Button variant="neutral" size="sm" onClick={onRetry}>
                          Retry
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                displayDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => handleRowClick(deal)}
                    className="group cursor-pointer hover:bg-accent-blue/10 transition-colors duration-150"
                  >
                    <td className="p-4 text-text-primary font-medium group-hover:text-accent-blue transition-colors">
                      {deal.clientName}
                    </td>
                    <td className="p-4 text-text-secondary">{deal.propertyAddress}</td>
                    <td className="p-4 text-text-secondary text-right font-mono text-xs">
                      {deal.created}
                    </td>
                  </tr>
                ))}
              {!loading && !error && displayDeals.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-text-secondary">
                    No deals found matching your filters.
                    {emptyCta ? <div className="mt-3">{emptyCta}</div> : null}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 text-right text-xs text-text-secondary/50">
        Showing {displayDeals.length} records
      </div>
    </GlassCard>
  );
}

export default DealsTable;
