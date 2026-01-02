"use client";

import React, { useState } from "react";
import type { IntakeSubmissionDetail as DetailType } from "@/lib/intakeStaff";
import { IntakeStatusBadge } from "./IntakeStatusBadge";
import { getEvidenceTypeLabel } from "@/lib/constants/evidenceTypes";

type IntakeSubmissionDetailProps = {
  detail: DetailType;
  onRequestRevision: () => void;
  onReject: () => void;
  onPopulate: () => void;
};

type TabId = "answers" | "evidence" | "audit";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatAddress(deal: DetailType["deal"]): string {
  if (!deal) return "No address";
  const parts = [deal.address, deal.city, deal.state, deal.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No address";
}

export function IntakeSubmissionDetail({
  detail,
  onRequestRevision,
  onReject,
  onPopulate,
}: IntakeSubmissionDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("answers");

  const submission = detail.submission as Record<string, unknown>;
  const payload = submission.payload_json as Record<string, unknown> | null;
  const status = submission.status as string;
  const canTakeAction =
    status === "SUBMITTED" || status === "PENDING_REVIEW";

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "answers", label: "Answers" },
    { id: "evidence", label: "Evidence", count: detail.files.length },
    {
      id: "audit",
      label: "Audit Trail",
      count:
        detail.revision_requests.length +
        (detail.rejection ? 1 : 0) +
        detail.population_events.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {formatAddress(detail.deal)}
            </h1>
            <IntakeStatusBadge status={status} size="md" />
          </div>
          {detail.link && (
            <p className="mt-1 text-sm text-gray-400">
              From:{" "}
              {String(
                (detail.link as Record<string, unknown>).recipient_name ||
                  (detail.link as Record<string, unknown>).recipient_email ||
                  "Unknown"
              )}
            </p>
          )}
          {detail.schema_version && (
            <p className="mt-1 text-xs text-gray-500">
              Schema: {detail.schema_version.display_name} v
              {detail.schema_version.semantic_version}
            </p>
          )}
        </div>

        {/* Actions */}
        {canTakeAction && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPopulate}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Accept & Populate
            </button>
            <button
              type="button"
              onClick={onRequestRevision}
              className="rounded-md border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              Request Revision
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-amber-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        {activeTab === "answers" && (
          <AnswersTab payload={payload} />
        )}
        {activeTab === "evidence" && (
          <EvidenceTab files={detail.files} />
        )}
        {activeTab === "audit" && (
          <AuditTab
            revisionRequests={detail.revision_requests}
            rejection={detail.rejection}
            populationEvents={detail.population_events}
          />
        )}
      </div>
    </div>
  );
}

function AnswersTab({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload || Object.keys(payload).length === 0) {
    return <p className="text-gray-400">No answers submitted.</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(payload).map(([key, value]) => (
        <div key={key} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {key.replace(/_/g, " ")}
          </dt>
          <dd className="mt-1 text-sm text-white">
            {typeof value === "object"
              ? JSON.stringify(value, null, 2)
              : String(value ?? "—")}
          </dd>
        </div>
      ))}
    </div>
  );
}

function EvidenceTab({ files }: { files: DetailType["files"] }) {
  if (files.length === 0) {
    return <p className="text-gray-400">No files uploaded.</p>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-gray-400">
              <FileIcon mimeType={file.mime_type} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {file.original_filename}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-amber-400/80">
                  {getEvidenceTypeLabel(file.upload_key)}
                </span>
                <span>&middot;</span>
                <span>{formatBytes(file.size_bytes)}</span>
                <span>&middot;</span>
                <span>{formatDate(file.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ScanStatusBadge status={file.scan_status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function ScanStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Scanning",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    CLEAN: {
      label: "Clean",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    INFECTED: {
      label: "Infected",
      className: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    ERROR: {
      label: "Error",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    },
  };

  const { label, className } = config[status] ?? config.PENDING;

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function AuditTab({
  revisionRequests,
  rejection,
  populationEvents,
}: {
  revisionRequests: DetailType["revision_requests"];
  rejection: DetailType["rejection"];
  populationEvents: DetailType["population_events"];
}) {
  // Combine all events into a timeline
  const events: Array<{
    id: string;
    type: "revision" | "rejection" | "population";
    date: string;
    content: React.ReactNode;
  }> = [];

  revisionRequests.forEach((req) => {
    events.push({
      id: `rev-${req.id}`,
      type: "revision",
      date: req.created_at,
      content: (
        <div>
          <p className="text-sm font-medium text-purple-400">
            Revision Requested
          </p>
          <p className="mt-1 text-sm text-gray-300">{req.request_notes}</p>
          {req.responded_at && (
            <p className="mt-1 text-xs text-gray-500">
              Responded: {formatDate(req.responded_at)}
            </p>
          )}
        </div>
      ),
    });
  });

  if (rejection) {
    events.push({
      id: `rej-${rejection.id}`,
      type: "rejection",
      date: rejection.created_at,
      content: (
        <div>
          <p className="text-sm font-medium text-red-400">Rejected</p>
          <p className="mt-1 text-sm text-gray-300">
            {rejection.rejection_reason}
          </p>
        </div>
      ),
    });
  }

  populationEvents.forEach((evt) => {
    const summary = evt.summary_json as Record<string, unknown>;
    events.push({
      id: `pop-${evt.id}`,
      type: "population",
      date: evt.created_at,
      content: (
        <div>
          <p className="text-sm font-medium text-emerald-400">
            Data Populated
          </p>
          <p className="mt-1 text-sm text-gray-300">
            {(summary.fields_populated as number) ?? 0} fields populated (
            {evt.overwrite_mode})
          </p>
        </div>
      ),
    });
  });

  // Sort by date descending
  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (events.length === 0) {
    return <p className="text-gray-400">No audit events.</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="relative pl-6 border-l-2 border-white/10"
        >
          <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-white/30" />
          <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
          <div className="mt-1">{event.content}</div>
        </div>
      ))}
    </div>
  );
}

export default IntakeSubmissionDetail;
