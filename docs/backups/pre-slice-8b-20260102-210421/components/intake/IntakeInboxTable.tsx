"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { IntakeInboxItem } from "@/lib/intakeStaff";
import { IntakeStatusBadge } from "./IntakeStatusBadge";

type IntakeInboxTableProps = {
  items: IntakeInboxItem[];
  isLoading?: boolean;
  hasActiveFilters?: boolean;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddress(deal: IntakeInboxItem["deal"]): string {
  if (!deal) return "No address";
  const parts = [deal.address, deal.city, deal.state, deal.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No address";
}

export function IntakeInboxTable({ items, isLoading, hasActiveFilters }: IntakeInboxTableProps) {
  const router = useRouter();

  const handleRowClick = (submissionId: string) => {
    router.push(`/intake-inbox/${submissionId}`);
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="p-8 text-center text-gray-400">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-2">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Inbox icon */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <svg
              className="h-8 w-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
              />
            </svg>
          </div>

          {hasActiveFilters ? (
            <>
              <h3 className="text-lg font-medium text-white">No matching submissions</h3>
              <p className="mt-1 text-sm text-gray-400">
                Try adjusting your filters or search terms
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-white">No intake submissions yet</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-400">
                Submissions will appear here when clients complete intake forms.
                Send an intake link from a deal page to get started.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Recipient
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Submitted
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Files
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Cycle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item) => (
              <tr
                key={item.submission.id}
                onClick={() => handleRowClick(item.submission.id)}
                className="cursor-pointer transition-colors hover:bg-white/5"
              >
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white">
                    {formatAddress(item.deal)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-white">
                    {item.link?.recipient_name || item.link?.recipient_email || "—"}
                  </div>
                  {item.link?.recipient_name && item.link?.recipient_email && (
                    <div className="text-xs text-gray-400">
                      {item.link.recipient_email}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <IntakeStatusBadge status={item.submission.status} size="sm" />
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-300">
                    {formatDate(item.submission.submitted_at)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">
                      {item.files_count}
                    </span>
                    {item.files_pending_scan > 0 && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                        {item.files_pending_scan} scanning
                      </span>
                    )}
                    {item.files_infected > 0 && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                        {item.files_infected} infected
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-400">
                    {item.submission.revision_cycle}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default IntakeInboxTable;
