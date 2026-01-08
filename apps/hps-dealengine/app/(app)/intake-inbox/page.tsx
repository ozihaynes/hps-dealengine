"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchIntakeInbox,
  type IntakeInboxItem,
  type IntakeSubmissionStatus,
  type IntakeInboxFilters as FiltersType,
} from "@/lib/intakeStaff";
import { IntakeInboxFilters } from "@/components/intake/IntakeInboxFilters";
import { IntakeInboxTable } from "@/components/intake/IntakeInboxTable";

const PAGE_SIZE = 20;

export default function IntakeInboxPage() {
  const [items, setItems] = useState<IntakeInboxItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [status, setStatus] = useState<IntakeSubmissionStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadInbox = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: FiltersType = {
        page,
        page_size: PAGE_SIZE,
      };

      if (status) filters.status = status;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (debouncedSearch) filters.search = debouncedSearch;

      const response = await fetchIntakeInbox(filters);
      setItems(response.items);
      setTotalCount(response.total_count);
    } catch (err) {
      console.error("Failed to load inbox:", err);
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setIsLoading(false);
    }
  }, [page, status, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [status, dateFrom, dateTo, debouncedSearch]);

  const handleClearFilters = () => {
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Intake Inbox</h1>
          <p className="mt-1 text-sm text-gray-400">
            Review and manage client intake submissions
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {totalCount} {totalCount === 1 ? "submission" : "submissions"}
        </div>
      </div>

      {/* Filters */}
      <IntakeInboxFilters
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={search}
        onStatusChange={setStatus}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearchChange={setSearch}
        onClearFilters={handleClearFilters}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <IntakeInboxTable
        items={items}
        isLoading={isLoading}
        hasActiveFilters={!!(status || dateFrom || dateTo || debouncedSearch)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
