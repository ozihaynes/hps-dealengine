"use client";

import React from "react";
import type { IntakeSubmissionStatus } from "@/lib/intakeStaff";

type IntakeInboxFiltersProps = {
  status: IntakeSubmissionStatus | "";
  dateFrom: string;
  dateTo: string;
  search: string;
  onStatusChange: (status: IntakeSubmissionStatus | "") => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
};

const STATUS_OPTIONS: { value: IntakeSubmissionStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "REVISION_REQUESTED", label: "Revision Requested" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ARCHIVED", label: "Archived" },
];

export function IntakeInboxFilters({
  status,
  dateFrom,
  dateTo,
  search,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onClearFilters,
}: IntakeInboxFiltersProps) {
  const hasActiveFilters = status !== "" || dateFrom !== "" || dateTo !== "" || search !== "";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="inbox-search"
            className="mb-1.5 block text-xs font-medium text-gray-400"
          >
            Search
          </label>
          <input
            id="inbox-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Address, email, or name..."
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Status Filter */}
        <div className="min-w-[160px]">
          <label
            htmlFor="inbox-status"
            className="mb-1.5 block text-xs font-medium text-gray-400"
          >
            Status
          </label>
          <select
            id="inbox-status"
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as IntakeSubmissionStatus | "")
            }
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="min-w-[140px]">
          <label
            htmlFor="inbox-date-from"
            className="mb-1.5 block text-xs font-medium text-gray-400"
          >
            From Date
          </label>
          <input
            id="inbox-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Date To */}
        <div className="min-w-[140px]">
          <label
            htmlFor="inbox-date-to"
            className="mb-1.5 block text-xs font-medium text-gray-400"
          >
            To Date
          </label>
          <input
            id="inbox-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

export default IntakeInboxFilters;
