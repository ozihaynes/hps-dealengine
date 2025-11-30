"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { listEvidence, getEvidenceUrl, type Evidence } from "@/lib/evidence";
import {
  listPolicyOverridesForDealOrRun,
  type PolicyOverride,
} from "@/lib/policyOverrides";
import StrategistPanel from "@/components/underwrite/StrategistPanel";
import { GlassCard } from "@/components/ui";

type SimpleUser = {
  id: string;
  email?: string | null;
};

type RunRow = {
  id: string;
  org_id: string;
  posture: string;
  created_at: string;
  input: unknown;
  output: unknown;
  trace: unknown[] | null;
  input_hash: string | null;
  output_hash: string | null;
  policy_hash: string | null;
};

type StatusState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded" }
  | { kind: "not-signed-in" }
  | { kind: "empty" }
  | { kind: "error"; message: string };

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TracePage() {
  const [status, setStatus] = useState<StatusState>({ kind: "idle" });
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<PolicyOverride[]>([]);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    const load = async () => {
      setStatus({ kind: "loading" });

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        setStatus({ kind: "not-signed-in" });
        return;
      }

      const u = userData.user as { id: string; email?: string | null };
      setUser({ id: u.id, email: u.email ?? null });

      const { data, error } = await supabase
        .from("runs")
        .select(
          "id, org_id, posture, created_at, input, output, trace, input_hash, output_hash, policy_hash"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }

      const safeRuns: RunRow[] = (data ?? []).map((row: any) => ({
        id: row.id as string,
        org_id: row.org_id as string,
        posture: row.posture as string,
        created_at: row.created_at as string,
        input: row.input,
        output: row.output,
        trace: (row.trace as unknown[]) ?? [],
        input_hash: (row.input_hash as string | null) ?? null,
        output_hash: (row.output_hash as string | null) ?? null,
        policy_hash: (row.policy_hash as string | null) ?? null,
      }));

      if (safeRuns.length === 0) {
        setRuns([]);
        setSelectedId(null);
        setStatus({ kind: "empty" });
        return;
      }

      setRuns(safeRuns);
      setSelectedId(safeRuns[0]?.id ?? null);
      setStatus({ kind: "loaded" });
    };

    void load();
  }, []);

  const selected = runs.find((r) => r.id === selectedId) ?? null;
  const selectedDealId =
    (selected?.input as any)?.dealId ??
    (selected as any)?.deal_id ??
    null;
  const evidenceSummary = selected
    ? evidence.map((row) => ({
        id: row.id,
        kind: row.kind,
        label: row.storageKey.split("/").pop() ?? row.kind ?? "evidence",
        uri: undefined,
      }))
    : [];

  useEffect(() => {
    if (!selected) {
      setEvidence([]);
      setOverrides([]);
      return;
    }

    setEvidenceError(null);
    setOverrideError(null);

    // Evidence scoped to run_id
    listEvidence({ runId: selected.id })
      .then(setEvidence)
      .catch((err) => setEvidenceError(err.message));

    const dealId = (selected.input as any)?.dealId ?? selected.id;
    listPolicyOverridesForDealOrRun({ dealId, runId: selected.id })
      .then(setOverrides)
      .catch((err) => {
        setOverrideError(err.message);
        setOverrides([]);
      });
  }, [selected]);

  const handleCopyLink = async (id: string) => {
    try {
      const url = await getEvidenceUrl(id);
      await navigator.clipboard.writeText(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to sign URL";
      setEvidenceError(msg);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-4 md:p-5 space-y-2">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Runs Trace</h1>
            <p className="text-sm text-text-secondary">
              Last 50 runs visible to your memberships. Select a run to inspect envelopes, trace,
              overrides, and evidence.
            </p>
          </div>
          <div className="text-xs text-text-secondary text-right">
            {user ? (
              <span className="block">
                User: <span className="font-mono">{user.email ?? user.id}</span>
              </span>
            ) : (
              <span>{status.kind === "loading" ? "Loading." : ""}</span>
            )}
          </div>
        </div>
        {status.kind === "not-signed-in" && (
          <p className="rounded-md bg-red-950/40 px-3 py-2 text-xs text-red-300">
            No Supabase auth session detected. Sign in to view runs.
          </p>
        )}
        {status.kind === "error" && (
          <p className="rounded-md bg-red-950/40 px-3 py-2 text-xs text-red-300">
            Error loading runs: {status.message}
          </p>
        )}
        {status.kind === "empty" && (
          <p className="rounded-md bg-slate-900/60 px-3 py-2 text-xs text-text-secondary">
            No runs found yet for your orgs. Run an analysis to populate this view.
          </p>
        )}
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)]">
        <GlassCard className="p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="label-xs uppercase">Runs</h2>
            <span className="text-[11px] text-text-secondary">
              {runs.length} {runs.length === 1 ? "row" : "rows"}
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-border/40">
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-2 py-1 text-left">Created</th>
                  <th className="px-2 py-1 text-left">Org</th>
                  <th className="px-2 py-1 text-left">Posture</th>
                  <th className="px-2 py-1 text-left">Input hash</th>
                  <th className="px-2 py-1 text-left">Policy hash</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isSelected = run.id === selectedId;
                  return (
                    <tr
                      key={run.id}
                      className={
                        "cursor-pointer border-b border-border/30 last:border-b-0 " +
                        (isSelected ? "bg-blue-950/40" : "hover:bg-slate-900/60")
                      }
                      onClick={() => setSelectedId(run.id)}
                    >
                      <td className="px-2 py-1 align-top font-mono">{formatDate(run.created_at)}</td>
                      <td className="px-2 py-1 align-top font-mono">{run.org_id.slice(0, 8)}.</td>
                      <td className="px-2 py-1 align-top">{run.posture}</td>
                      <td className="px-2 py-1 align-top font-mono">{run.input_hash ?? "-"}</td>
                      <td className="px-2 py-1 align-top font-mono">{run.policy_hash ?? "-"}</td>
                    </tr>
                  );
                })}
                {runs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-4 text-center text-[11px] text-text-secondary"
                    >
                      {status.kind === "loading" ? "Loading runs." : "No runs available yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-3">
          <GlassCard className="p-3 md:p-4">
            <h2 className="mb-1 label-xs uppercase">Input envelope</h2>
            <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 p-2 text-[11px] font-mono leading-relaxed text-text-primary/90">
              {selected ? pretty(selected.input) : "// Select a run"}
            </pre>
          </GlassCard>

          <GlassCard className="p-3 md:p-4">
            <h2 className="mb-1 label-xs uppercase">Output envelope</h2>
            <pre className="max-h-[140px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 p-2 text-[11px] font-mono leading-relaxed text-text-primary/90">
              {selected ? pretty(selected.output) : "// Select a run"}
            </pre>
          </GlassCard>

          <GlassCard className="p-3 md:p-4">
            <h2 className="mb-1 label-xs uppercase">Trace</h2>
            <pre className="max-h-[160px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 p-2 text-[11px] font-mono leading-relaxed text-text-primary/90">
              {selected ? pretty(selected.trace) : "// Select a run"}
            </pre>
          </GlassCard>

          <GlassCard className="p-3 md:p-4 space-y-2">
            <h2 className="label-xs uppercase">Policy Overrides (this run)</h2>
            {overrideError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-[11px] text-red-200">
                {overrideError}
              </div>
            )}
            {overrides.length === 0 ? (
              <p className="text-[11px] text-text-secondary">
                {selected ? "No overrides for this run yet." : "// Select a run"}
              </p>
            ) : (
              <div className="max-h-56 overflow-auto rounded-lg border border-border/40">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-2 py-1 text-left">Token</th>
                      <th className="px-2 py-1 text-left">Status</th>
                      <th className="px-2 py-1 text-left">Requested</th>
                      <th className="px-2 py-1 text-left">Approved</th>
                      <th className="px-2 py-1 text-left">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((row) => (
                      <tr key={row.id} className="border-b border-border/30 last:border-b-0">
                        <td className="px-2 py-1 align-top font-mono">{row.tokenKey}</td>
                        <td className="px-2 py-1 align-top">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide border " +
                              (row.status === "approved"
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                                : row.status === "rejected"
                                ? "border-red-500/50 bg-red-500/10 text-red-200"
                                : "border-amber-500/50 bg-amber-500/10 text-amber-200")
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-2 py-1 align-top text-text-secondary">
                          {row.requestedAt ? new Date(row.requestedAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-2 py-1 align-top text-text-secondary">
                          {row.approvedAt
                            ? `${new Date(row.approvedAt).toLocaleString()}${
                                row.approvedBy ? ` by ${row.approvedBy}` : ""
                              }`
                            : "-"}
                        </td>
                        <td className="px-2 py-1 align-top text-text-secondary">
                          <div className="mb-1 text-text-primary">{row.justification || "-"}</div>
                          <div className="rounded bg-black/40 p-2 font-mono">
                            {pretty(row.newValue)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-3 md:p-4 space-y-2">
            <h2 className="label-xs uppercase">Evidence</h2>
            {evidenceError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-[11px] text-red-200">
                {evidenceError}
              </div>
            )}
            {evidence.length === 0 ? (
              <p className="text-[11px] text-text-secondary">
                {selected ? "No evidence for this run yet." : "// Select a run"}
              </p>
            ) : (
              <div className="max-h-56 overflow-auto rounded-lg border border-border/40">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-2 py-1 text-left">Kind</th>
                      <th className="px-2 py-1 text-left">File</th>
                      <th className="px-2 py-1 text-left">Added</th>
                      <th className="px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((row) => (
                      <tr key={row.id} className="border-b border-border/30 last:border-b-0">
                        <td className="px-2 py-1 align-top">{row.kind}</td>
                        <td className="px-2 py-1 align-top font-mono">
                          {row.storageKey.split("/").pop()}
                        </td>
                        <td className="px-2 py-1 align-top text-text-secondary">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-1 align-top">
                          <button
                            type="button"
                            className="text-[11px] text-accent-blue hover:underline"
                            onClick={() => void handleCopyLink(row.id)}
                          >
                            Copy link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-3 md:p-4">
            <StrategistPanel
              dealId={selectedDealId ?? undefined}
              runId={selected?.id ?? undefined}
              posture={(selected?.posture as any) ?? undefined}
              runOutput={selected?.output ?? null}
              runTrace={selected?.trace ?? null}
              policySnapshot={null}
              evidenceSummary={evidenceSummary}
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
