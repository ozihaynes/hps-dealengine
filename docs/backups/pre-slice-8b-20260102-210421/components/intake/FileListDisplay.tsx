"use client";

import React from "react";

export type DisplayFile = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  scanStatus: "PENDING" | "CLEAN" | "INFECTED" | "SCAN_FAILED";
  createdAt?: string;
};

type FileListDisplayProps = {
  files: DisplayFile[];
  title?: string;
  showRemove?: boolean;
  onRemove?: (fileId: string) => void;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileListDisplay({
  files,
  title,
  showRemove = false,
  onRemove,
}: FileListDisplayProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-medium text-[color:var(--text-primary)]">{title}</h4>
      )}
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
          >
            {/* File icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <FileIcon mimeType={file.mimeType} />
            </div>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                {file.filename}
              </p>
              <p className="text-xs text-[color:var(--text-secondary)]">
                {formatBytes(file.size)}
              </p>
            </div>

            {/* Scan status badge */}
            <ScanStatusBadge status={file.scanStatus} />

            {/* Remove button */}
            {showRemove && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanStatusBadge({ status }: { status: DisplayFile["scanStatus"] }) {
  const config = {
    PENDING: {
      label: "Scanning",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: (
        <svg
          className="h-3 w-3 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    CLEAN: {
      label: "Clean",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    INFECTED: {
      label: "Infected",
      className: "bg-red-500/10 text-red-400 border-red-500/30",
      icon: (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    SCAN_FAILED: {
      label: "Error",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      icon: (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const { label, className, icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) {
    return (
      <svg
        className="h-5 w-5 text-[color:var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <svg
        className="h-5 w-5 text-[color:var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5 text-[color:var(--text-secondary)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

export default FileListDisplay;
