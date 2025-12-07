"use client";

import React, { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { listEvidence, getEvidenceUrl, type Evidence } from "@/lib/evidence";
import {
  listPolicyOverridesForDealOrRun,
  type PolicyOverride,
} from "@/lib/policyOverrides";
import { GlassCard } from "@/components/ui";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useDealSession } from "@/lib/dealSessionContext";
import { SANDBOX_V1_KNOBS } from "@/constants/sandboxKnobs";
import { evidenceLabel } from "@/lib/evidenceFreshness";
import KnobFamilySummary from "@/components/overview/KnobFamilySummary";

type SimpleUser = {
  id: string;
  email?: string | null;
};

type RunRow = {
  id: string;
  org_id: string;
  posture: string;
  created_at: string;
  deal_id?: string | null;
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
  | { kind: "no-deal" }
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
  const { dbDeal } = useDealSession();

  useEffect(() => {
    const supabase = getSupabase();

    const load = async () => {
      setStatus({ kind: "loading" });

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user) {
        setStatus({ kind: "not-signed-in" });
        return;
      }

      const u = userData.user as { id: string; email?: string | null };
      setUser({ id: u.id, email: u.email ?? null });

      if (!dbDeal?.id || !dbDeal.org_id) {
        setRuns([]);
        setSelectedId(null);
        setStatus({ kind: "no-deal" });
        return;
      }

      const { data, error } = await supabase
        .from("runs")
        .select(
          "id, org_id, deal_id, posture, created_at, input, output, trace, input_hash, output_hash, policy_hash",
        )
        .eq("org_id", dbDeal.org_id)
        .or(`deal_id.eq.${dbDeal.id},input->>dealId.eq.${dbDeal.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }

      const safeRuns: RunRow[] = (data ?? []).map((row: any) => ({
        id: row.id as string,
        org_id: row.org_id as string,
        deal_id: (row.deal_id as string | null) ?? null,
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
  }, [dbDeal?.id, dbDeal?.org_id]);

  const selected = runs.find((r) => r.id === selectedId) ?? null;
  const selectedDealId =
    selected?.deal_id ??
    (selected?.input as any)?.dealId ??
    dbDeal?.id ??
    null;
  const selectedOrgId = selected?.org_id ?? dbDeal?.org_id ?? null;
  const sandboxSnapshot = (selected?.input as any)?.sandbox ?? {};
  const repairSnapshot = (selected?.input as any)?.repairProfile ?? null;
  const evidenceAttachments = selected
    ? evidence.map((row) => ({
        id: row.id,
        kind: row.kind,
        label: row.storageKey.split("/").pop() ?? row.kind ?? "evidence",
        uri: undefined,
      }))
    : [];
  const outputs = (selected?.output as any)?.outputs ?? null;
  const riskSummary = outputs?.risk_summary ?? null;
  const evidenceFreshness = outputs?.evidence_summary ?? null;
  const workflowState = outputs?.workflow_state ?? null;
  const workflowReasons = outputs?.workflow_reasons ?? [];
  const confidenceGrade = outputs?.confidence_grade ?? null;
  const confidenceReasons = outputs?.confidence_reasons ?? [];
  const riskGates = (riskSummary?.per_gate as Record<string, any>) ?? {};
  const freshnessByKind = (evidenceFreshness?.freshness_by_kind as Record<string, any>) ?? {};
  const traceFrames = Array.isArray(selected?.trace) ? ((selected?.trace as any[]) ?? []) : [];
  const findTrace = (rule: string) => traceFrames.find((t: any) => t?.rule === rule);
  const evidenceTrace = findTrace("EVIDENCE_FRESHNESS_POLICY");
  const riskTrace = findTrace("RISK_GATES_POLICY");
  const confidenceTrace = findTrace("CONFIDENCE_POLICY");
  const workflowTrace = findTrace("WORKFLOW_STATE_POLICY");
  const knobSummaryOutput = selected ? { ...(selected.output as any), trace: traceFrames } : null;

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

    const dealId = selectedDealId ?? selected.id;
    listPolicyOverridesForDealOrRun({
      dealId,
      runId: selected.id,
      orgId: selectedOrgId ?? undefined,
      posture: selected?.posture ?? undefined,
      approvedOnly: true,
      includeDealIdNullForPosture: true,
    })
      .then(setOverrides)
      .catch((err) => {
        setOverrideError(err.message);
        setOverrides([]);
      });
  }, [selected, selectedDealId, selectedOrgId]);

  const handleCopyLink = async (id: string) => {
    try {
      const url = await getEvidenceUrl(id);
      await navigator.clipboard.writeText(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to sign URL";
      setEvidenceError(msg);
    }
  };

  const statusBadge = (s: string | null | undefined, testId?: string) => {
    const sharedProps = testId ? { "data-testid": testId } : {};
    switch (s) {
      case "pass":
        return (
          <span
            className="rounded bg-green-900/40 px-2 py-0.5 text-[11px] text-green-200"
            {...sharedProps}
          >
            Pass
          </span>
        );
      case "watch":
        return (
          <span
            className="rounded bg-amber-900/40 px-2 py-0.5 text-[11px] text-amber-200"
            {...sharedProps}
          >
            Watch
          </span>
        );
      case "fail":
        return (
          <span className="rounded bg-red-900/40 px-2 py-0.5 text-[11px] text-red-200" {...sharedProps}>
            Fail
          </span>
        );
      default:
        return (
          <span
            className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-text-secondary"
            {...sharedProps}
          >
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-4 md:p-5 space-y-2">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Runs Trace</h1>
            <p className="text-sm text-text-secondary">
              Last 50 runs for the active deal. Select a run to inspect envelopes, trace,
              overrides, and evidence.
            </p>
            <p className="text-xs text-text-secondary">
              Deal:{" "}
              {dbDeal?.address
                ? `${dbDeal.address} (${dbDeal.id.slice(0, 8)}...)`
                : dbDeal?.id ?? "Select a deal on /deals"}
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
        {status.kind === "no-deal" && (
          <p className="rounded-md bg-amber-900/40 px-3 py-2 text-xs text-amber-200">
            Select a deal on /deals to view its runs and trace.
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
                  <th className="px-2 py-1 text-left">Deal</th>
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
                      <td className="px-2 py-1 align-top font-mono">
                        {(run.deal_id ?? "").slice(0, 8) || "-"}
                      </td>
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
            <h2 className="mb-1 label-xs uppercase">Valuation & Profit (raw trace)</h2>
            <pre className="max-h-[160px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 p-2 text-[11px] font-mono leading-relaxed text-text-primary/90">
              {selected ? pretty(selected.trace) : "// Select a run"}
            </pre>
          </GlassCard>

          <GlassCard className="p-3 md:p-4 space-y-2">
            <h2 className="label-xs uppercase">Timeline &amp; Carry (trace summary)</h2>
            {selected?.output && (selected.output as any)?.outputs?.timeline_summary ? (
              <div className="space-y-1 text-[11px]">
                {(() => {
                  const ts = (selected.output as any).outputs.timeline_summary;
                  const rows: Array<[string, string]> = [
                    ["Speed band", ts.speed_band ?? "-"],
                    ["DOM / MOI", `${ts.dom_zip_days ?? "-"} / ${ts.moi_zip_months ?? "-"}`],
                    ["Days to money", ts.days_to_money ?? ts.dtm_selected_days ?? "-"],
                    ["Urgency", ts.urgency ?? "-"],
                    ["Carry months (raw/capped)", `${ts.carry_months_raw ?? "-"} / ${ts.carry_months ?? ts.carry_months_capped ?? "-"}`],
                    ["Hold monthly", ts.hold_monthly_dollars ?? "-"],
                    ["Carry total", ts.carry_total_dollars ?? "-"],
                    ["DTM source", ts.dtm_source ?? "-"],
                  ];
                  return rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-mono text-text-primary">{value}</span>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary">
                {selected ? "No timeline summary on this run." : "// Select a run"}
              </p>
            )}
          </GlassCard>

          <GlassCard className="p-3 md:p-4 space-y-3">
            <h2 className="label-xs uppercase">Risk, Evidence &amp; Workflow (trace summary)</h2>
            {outputs ? (
              <div className="space-y-3 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-text-primary">Workflow:</span>
                    <span
                      className="rounded bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-text-primary"
                      data-testid="trace-workflow-state"
                    >
                      {workflowState ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-text-primary">Confidence:</span>
                    <span
                      className="rounded bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-text-primary"
                      data-testid="trace-confidence-grade"
                    >
                      {confidenceGrade ?? "?"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-text-primary">Risk:</span>
                    {statusBadge((riskSummary as any)?.overall ?? null, "trace-risk-overall")}
                  </div>
                </div>

                {Array.isArray(workflowReasons) && workflowReasons.length > 0 && (
                  <div className="space-y-1">
                    <p className="label-xxs uppercase text-text-secondary">Workflow reasons</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-text-primary">
                      {workflowReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(confidenceReasons) && confidenceReasons.length > 0 && (
                  <div className="space-y-1">
                    <p className="label-xxs uppercase text-text-secondary">Confidence reasons</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-text-primary">
                      {confidenceReasons.map((reason: string, idx: number) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(riskSummary?.reasons) && riskSummary.reasons.length > 0 && (
                  <div className="space-y-1">
                    <p className="label-xxs uppercase text-text-secondary">Risk reasons</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-text-primary">
                      {riskSummary.reasons.map((reason: string, idx: number) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Object.keys(riskGates).length > 0 && (
                  <div>
                    <p className="label-xxs uppercase text-text-secondary mb-1">Gates</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(riskGates).map(([key, value]) => {
                        const reasons =
                          (Array.isArray((value as any)?.reasons) ? ((value as any).reasons as string[]) : []) ?? [];
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded bg-white/5 px-2 py-1"
                            data-testid={`trace-gate-${key}`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">
                                {key.replace(/_/g, " ")}
                              </span>
                              {reasons.length > 0 ? (
                                <span className="text-[10px] text-text-secondary">{reasons[0]}</span>
                              ) : null}
                            </div>
                            {statusBadge((value as any)?.status)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.keys(freshnessByKind).length > 0 && (
                  <div className="space-y-2">
                    <p className="label-xxs uppercase text-text-secondary mb-1">Evidence freshness</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(freshnessByKind).map(([kind, value]) => {
                        const status = (value as any)?.status ?? value;
                        const blocking = Boolean((value as any)?.blocking_for_ready);
                        const age = (value as any)?.age_days;
                        const reasons =
                          (Array.isArray((value as any)?.reasons) ? ((value as any).reasons as string[]) : []) ?? [];
                        return (
                          <div
                            key={kind}
                            className="flex items-center justify-between rounded bg-white/5 px-2 py-1"
                            data-testid={`trace-evidence-${kind}`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">{evidenceLabel(kind)}</span>
                              <span className="text-[10px] text-text-secondary">
                                {age != null ? `${age}d` : "-"} {blocking ? "- blocking" : ""}
                              </span>
                              {reasons.length > 0 ? (
                                <span className="text-[10px] text-text-secondary">{reasons[0]}</span>
                              ) : null}
                            </div>
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-text-primary capitalize">
                              {String(status ?? "unknown")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary">Select a run to view risk and evidence.</p>
            )}
          </GlassCard>

          <KnobFamilySummary runOutput={knobSummaryOutput} sandbox={sandboxSnapshot} title="Policy & Knob Coverage" />

          <div className="grid gap-3 md:grid-cols-2">
            <GlassCard className="p-3 md:p-4 space-y-2">
            <h2 className="label-xs uppercase flex items-center gap-1">
              Confidence policy trace
              <InfoTooltip helpKey="confidence_grade" />
            </h2>
              {confidenceTrace ? (
                (() => {
                  const details = (confidenceTrace as any).details ?? {};
                  const reasons = Array.isArray(details.reasons) ? (details.reasons as string[]) : [];
                  let rubricSummary = null;
                  if (typeof details.rubric_raw === "string") {
                    try {
                      const parsed = JSON.parse(details.rubric_raw);
                      const entries = Object.entries(parsed)
                        .map(([grade, range]: any) => `${grade}: ${Array.isArray(range) ? range.join("-") : range}`)
                        .join("; ");
                      rubricSummary = entries;
                    } catch {
                      rubricSummary = details.rubric_raw;
                    }
                  }
                  return (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Grade</span>
                        <span className="font-mono text-text-primary">{details.grade ?? confidenceGrade ?? "?"}</span>
                      </div>
                      {rubricSummary && (
                        <div className="text-[11px] text-text-secondary">
                          Rubric: {rubricSummary}
                        </div>
                      )}
                      {reasons.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 text-text-primary">
                          {reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-[11px] text-text-secondary">No confidence trace on this run.</p>
              )}
            </GlassCard>

            <GlassCard className="p-3 md:p-4 space-y-2">
              <h2 className="label-xs uppercase">Evidence freshness trace</h2>
              {evidenceTrace ? (
                (() => {
                  const details = (evidenceTrace as any).details ?? {};
                  const freshness = (details.freshness_by_kind as Record<string, any>) ?? {};
                  const placeholdersAllowed = details.allow_placeholders_when_evidence_missing === true;
                  const placeholdersUsed = details.placeholders_used === true;
                  const placeholderKinds =
                    Array.isArray(details.placeholder_kinds) && details.placeholder_kinds.length > 0
                      ? (details.placeholder_kinds as string[])
                      : [];
                  return Object.keys(freshness).length === 0 ? (
                    <p className="text-[11px] text-text-secondary">No freshness entries.</p>
                  ) : (
                    <div className="space-y-2 text-[11px]">
                      <div className="rounded bg-white/5 px-2 py-1 text-[11px] text-text-secondary">
                        Placeholders: allowed {placeholdersAllowed ? "Yes" : "No"} - used{" "}
                        {placeholdersUsed ? "Yes" : "No"}
                        {placeholderKinds.length > 0 ? ` - kinds: ${placeholderKinds.join(", ")}` : ""}
                      </div>
                      {Object.entries(freshness).map(([kind, value]) => (
                        <div key={kind} className="flex items-center justify-between rounded bg-white/5 px-2 py-1">
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary">{evidenceLabel(kind)}</span>
                            <span className="text-[10px] text-text-secondary">
                              {(value as any)?.age_days ?? "-"}d - {(value as any)?.as_of_date ?? "n/a"}
                            </span>
                          </div>
                          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-text-primary capitalize">
                            {(value as any)?.status ?? "unknown"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <p className="text-[11px] text-text-secondary">No evidence freshness trace on this run.</p>
              )}
            </GlassCard>

            <GlassCard className="p-3 md:p-4 space-y-2">
              <h2 className="label-xs uppercase">Risk gates trace</h2>
              {riskTrace ? (
                (() => {
                  const details = (riskTrace as any).details ?? {};
                  const gates = (details.per_gate as Record<string, any>) ?? {};
                  return Object.keys(gates).length === 0 ? (
                    <p className="text-[11px] text-text-secondary">No gate decisions recorded.</p>
                  ) : (
                    <div className="space-y-1 text-[11px]">
                      {Object.entries(gates).map(([key, value]) => {
                        const reasons =
                          (Array.isArray((value as any)?.reasons) ? ((value as any).reasons as string[]) : []) ?? [];
                        const enabled = (value as any)?.enabled !== false;
                        return (
                          <div key={key} className="flex items-center justify-between rounded bg-white/5 px-2 py-1">
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">
                                {key.replace(/_/g, " ")}
                                {!enabled ? " (disabled)" : ""}
                              </span>
                              {reasons.length > 0 ? (
                                <span className="text-[10px] text-text-secondary">{reasons[0]}</span>
                              ) : null}
                            </div>
                            {enabled ? statusBadge((value as any)?.status) : statusBadge("unknown")}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-[11px] text-text-secondary">No risk gates trace on this run.</p>
              )}
            </GlassCard>

            <GlassCard className="p-3 md:p-4 space-y-2">
              <h2 className="label-xs uppercase">Workflow state trace</h2>
              {workflowTrace ? (
                (() => {
                  const details = (workflowTrace as any).details ?? {};
                  const reasons = Array.isArray(details.reasons) ? (details.reasons as string[]) : [];
                  const placeholderNote =
                    details.placeholders_used === true
                      ? "Placeholders used for missing evidence."
                      : details.allow_placeholders_when_evidence_missing === true
                      ? "Placeholders allowed if needed."
                      : "Placeholders disabled by policy.";
                  return (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Workflow</span>
                        <span className="font-mono text-text-primary">{details.workflow_state ?? "Unknown"}</span>
                      </div>
                      <div className="text-text-secondary">
                        {`Borderline band >= ${
                          details.workflow_policy?.analyst_review_borderline_threshold ?? "n/a"
                        }; Cash gate spread >= ${
                          details.workflow_policy?.cash_presentation_min_spread_over_payoff ?? "n/a"
                        }.`}
                      </div>
                      <div className="text-text-secondary">{placeholderNote}</div>
                      {reasons.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 text-text-primary">
                          {reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-[11px] text-text-secondary">No workflow trace on this run.</p>
              )}
            </GlassCard>
          </div>

          <GlassCard className="p-3 md:p-4">
            <h2 className="mb-1 label-xs uppercase">Repairs Snapshot</h2>
            {repairSnapshot ? (
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Profile</span>
                  <span className="font-mono text-text-primary">
                    {repairSnapshot.profileName ?? repairSnapshot.name ?? "n/a"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Market</span>
                  <span className="font-mono text-text-primary">
                    {repairSnapshot.marketCode ?? "n/a"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">As of</span>
                  <span className="font-mono text-text-primary">
                    {repairSnapshot.asOf ?? "n/a"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Version</span>
                  <span className="font-mono text-text-primary">
                    {repairSnapshot.version ?? "n/a"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary">
                No repair profile captured for this run.
              </p>
            )}
          </GlassCard>

          <GlassCard className="p-3 md:p-4">
            <h2 className="mb-1 label-xs uppercase">Sandbox Snapshot</h2>
            {SANDBOX_V1_KNOBS.map((k) => {
              const val = (sandboxSnapshot as any)?.[k.key];
              return (
                <div key={k.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">{k.label}</span>
                  <span className="font-mono text-text-primary">
                    {typeof val === "undefined" ? "-" : JSON.stringify(val)}
                  </span>
                </div>
              );
            })}
          </GlassCard>

          <GlassCard className="p-3 md:p-4 space-y-2">
            <h2 className="label-xs uppercase">Policy Overrides (this run)</h2>
            {overrideError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-[11px] text-red-200">
                {overrideError}
              </div>
            )}
            {overrides.filter((o) => o.status === "approved").length === 0 ? (
              <p className="text-[11px] text-text-secondary">
                {selected ? "No approved overrides for this run yet." : "// Select a run"}
              </p>
            ) : (
              <div className="max-h-56 overflow-auto rounded-lg border border-border/40">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-2 py-1 text-left">Token</th>
                      <th className="px-2 py-1 text-left">Old -&gt; New</th>
                      <th className="px-2 py-1 text-left">Approved By</th>
                      <th className="px-2 py-1 text-left">Approved At</th>
                      <th className="px-2 py-1 text-left">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides
                      .filter((row) => row.status === "approved")
                      .map((row) => (
                      <tr key={row.id} className="border-b border-border/30 last:border-b-0">
                        <td className="px-2 py-1 align-top font-mono">{row.tokenKey}</td>
                        <td className="px-2 py-1 align-top">
                          <div className="rounded bg-black/40 p-1 font-mono text-[11px]">
                            {JSON.stringify(row.oldValue)}
                          </div>
                          <div className="mt-1 rounded bg-black/40 p-1 font-mono text-[11px]">
                            {JSON.stringify(row.newValue)}
                          </div>
                        </td>
                        <td className="px-2 py-1 align-top text-text-secondary">
                          {row.approvedBy ?? row.requestedBy ?? "-"}
                        </td>
                        <td className="px-2 py-1 align-top text-text-secondary">
                          {row.approvedAt
                            ? new Date(row.approvedAt).toLocaleString()
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
            <h2 className="label-xs uppercase flex items-center gap-1">
              Evidence
              <InfoTooltip helpKey="evidence_freshness" />
            </h2>
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
        </div>
      </div>
    </div>
  );
}






