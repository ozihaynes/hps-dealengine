"use client";

import React, { useEffect, useState } from "react";
import {
  uploadEvidence,
  listEvidence,
  getEvidenceUrl,
  type Evidence,
} from "@/lib/evidence";

type KindOption = { value: string; label: string };

type EvidenceUploadProps = {
  dealId: string;
  runId?: string | null;
  kindOptions?: KindOption[];
  title?: string;
  onUploadComplete?: () => void;
};

const DEFAULT_KINDS: KindOption[] = [
  { value: "payoff_letter", label: "Payoff letter" },
  { value: "title_quote", label: "Title quote" },
  { value: "insurance_quote", label: "Insurance quote" },
  { value: "repair_bid", label: "Repair bid" },
  { value: "photos", label: "Photos" },
];

export function EvidenceUpload({
  dealId,
  runId,
  kindOptions,
  title,
  onUploadComplete,
}: EvidenceUploadProps) {
  const kinds = kindOptions ?? DEFAULT_KINDS;
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<string>(
    kinds[0]?.value ?? "photos",
  );

  useEffect(() => {
    setError(null);
    setLoading(true);
    listEvidence({ dealId, runId })
      .then(setEvidence)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dealId, runId]);

  const handleUpload = async (
    evt: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await uploadEvidence({
        dealId,
        runId: runId ?? undefined,
        kind: selectedKind,
        file,
      });

      // Prefer run scope when available for refresh
      const scoped = await listEvidence({ dealId, runId });
      if (scoped.length > 0) {
        setEvidence(scoped);
      } else {
        const next = await listEvidence({ dealId });
        setEvidence(next);
      }
      if (typeof onUploadComplete === "function") {
        onUploadComplete();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
      evt.target.value = "";
    }
  };

  const handleCopyLink = async (id: string) => {
    try {
      const url = await getEvidenceUrl(id);
      await navigator.clipboard.writeText(url);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to sign URL";
      setError(msg);
    }
  };

  const handleOpen = async (id: string) => {
    try {
      const url = await getEvidenceUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to open evidence";
      setError(msg);
    }
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {title ?? "Evidence"}
          </p>
          <p className="text-xs text-text-secondary">
            Attach artifacts to this deal
            {runId ? " / run" : ""}. Links are short-lived.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            className="rounded border border-border-subtle bg-surface-elevated px-2 py-1 text-xs"
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
          >
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center rounded-md bg-accent-blue/10 px-3 py-1.5 text-xs font-semibold text-accent-blue shadow-sm hover:bg-accent-blue/20">
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? "Uploading." : "Upload"}
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="max-h-64 overflow-auto rounded-lg border border-border-subtle/60">
        {loading ? (
          <div className="px-3 py-2 text-xs text-text-secondary">
            Loading evidence.
          </div>
        ) : evidence.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-secondary">
            No evidence yet for this {runId ? "run" : "deal"}.
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">Kind</th>
                <th className="px-3 py-2 text-left">File</th>
                <th className="px-3 py-2 text-left">Added</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border-subtle/40 last:border-b-0"
                >
                  <td className="px-3 py-2 align-top">
                    {row.kind}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-mono text-[11px]">
                      {row.storageKey.split("/").pop()}
                    </div>
                    <div className="text-[10px] text-text-secondary">
                      {(row.bytes / 1024).toFixed(1)} KB ú{" "}
                      {row.mimeType}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-text-secondary">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      className="text-[11px] text-accent-blue hover:underline"
                      onClick={() => void handleCopyLink(row.id)}
                    >
                      Copy link
                    </button>
                    <span className="mx-1 text-text-secondary">/</span>
                    <button
                      type="button"
                      className="text-[11px] text-accent-blue hover:underline"
                      onClick={() => void handleOpen(row.id)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
