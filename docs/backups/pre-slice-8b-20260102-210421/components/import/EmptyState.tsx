"use client";

import { FileSpreadsheetIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  showAction?: boolean;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No imports yet",
  description = "Get started by importing your first file",
  showAction = true,
  actionLabel = "New Import",
  actionHref = "/import/wizard",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        {icon || <FileSpreadsheetIcon className="w-8 h-8 text-slate-500" />}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6">{description}</p>
      {showAction && (
        <Link
          href={actionHref}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
