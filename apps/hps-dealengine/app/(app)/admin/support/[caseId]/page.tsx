"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, GlassCard, SelectField } from "@/components/ui";
import { resolveOrgId } from "@/lib/deals";
import { getActiveOrgMembershipRole, type OrgMembershipRole } from "@/lib/orgMembership";
import { getReleaseInfo } from "@/lib/o11y/releaseInfo";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  addSupportCaseEvent,
  fetchSupportCaseDetail,
  type SupportCaseDetailResponse,
  type SupportCaseStatus,
} from "@/lib/supportCases";

const STATUS_OPTIONS: { label: string; value: SupportCaseStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const severityColor: Record<
  "low" | "medium" | "high" | "critical",
  "green" | "blue" | "orange" | "red"
> = {
  low: "green",
  medium: "blue",
  high: "orange",
  critical: "red",
};

const statusColor: Record<
  SupportCaseStatus,
  "green" | "blue" | "orange" | "red"
> = {
  open: "blue",
  in_progress: "orange",
  blocked: "red",
  resolved: "green",
  closed: "green",
};

function formatTimestamp(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function SupportCaseDetailPage() {
  const params = useParams();
  const caseId = typeof params.caseId === "string" ? params.caseId : params.caseId?.[0];
  const supabase = getSupabaseClient();
  const releaseInfo = getReleaseInfo();

  const [role, setRole] = useState<OrgMembershipRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportCaseDetailResponse | null>(null);

  const [noteText, setNoteText] = useState("");
  const [statusTo, setStatusTo] = useState<SupportCaseStatus>("open");
  const [statusNote, setStatusNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => role === "owner" || role === "vp" || role === "manager",
    [role],
  );

  const loadDetail = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSupportCaseDetail(caseId);
      setDetail(response);
      if (response.case?.status) {
        setStatusTo(response.case.status);
      }
    } catch (err) {
      setError((err as Error).message ?? "Unable to load support case.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    const resolveRole = async () => {
      setRoleLoading(true);
      try {
        const nextOrgId = await resolveOrgId(supabase);
        const nextRole = await getActiveOrgMembershipRole(supabase, nextOrgId);
        setRole(nextRole);
      } catch (err) {
        setError((err as Error).message ?? "Unable to resolve org.");
      } finally {
        setRoleLoading(false);
      }
    };
    void resolveRole();
  }, [supabase]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const isLoading = loading || roleLoading;

  const handleAddNote = async () => {
    if (!caseId) return;
    setSavingNote(true);
    setActionError(null);
    try {
      await addSupportCaseEvent({
        caseId,
        type: "note",
        note: noteText.trim(),
      });
      setNoteText("");
      await loadDetail();
    } catch (err) {
      setActionError((err as Error).message ?? "Unable to add note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!caseId || !detail?.case) return;
    setSavingStatus(true);
    setActionError(null);
    try {
      await addSupportCaseEvent({
        caseId,
        type: "status_changed",
        note: statusNote.trim(),
        statusTo,
      });
      setStatusNote("");
      await loadDetail();
    } catch (err) {
      setActionError((err as Error).message ?? "Unable to change status.");
    } finally {
      setSavingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">Support Case</h1>
        <GlassCard className="p-5 text-sm text-text-secondary">Loading…</GlassCard>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">Support Case</h1>
        <GlassCard className="p-5 text-sm text-text-secondary">
          Admin access required. Ask an org owner or VP to grant elevated access.
        </GlassCard>
      </div>
    );
  }

  if (error || !detail?.case) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">Support Case</h1>
        <GlassCard className="p-5 text-sm text-red-200/90 border border-red-500/30">
          {error ?? "Support case not found."}
        </GlassCard>
      </div>
    );
  }

  const caseRow = detail.case;
  const runRow = detail.run;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{caseRow.title}</h1>
          <div className="text-xs text-text-secondary">{caseRow.id}</div>
        </div>
        <div className="text-xs text-text-secondary">
          Current release: {releaseInfo.releaseSha} · {releaseInfo.environment}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge color={severityColor[caseRow.severity]}>{caseRow.severity}</Badge>
        <Badge color={statusColor[caseRow.status]}>{caseRow.status}</Badge>
      </div>

      {actionError ? (
        <GlassCard className="p-4 text-sm text-red-200/90 border border-red-500/30">
          {actionError}
        </GlassCard>
      ) : null}

      <GlassCard className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Case Details</h2>
        <div className="grid gap-3 md:grid-cols-2 text-sm text-text-secondary">
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Created</div>
            <div className="text-text-primary">{formatTimestamp(caseRow.created_at)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Updated</div>
            <div className="text-text-primary">{formatTimestamp(caseRow.updated_at)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Deal ID</div>
            <div className="text-text-primary">{caseRow.deal_id ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Run ID</div>
            <div className="text-text-primary">{caseRow.run_id ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Subject User</div>
            <div className="text-text-primary">{caseRow.subject_user_id ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Request ID</div>
            <div className="text-text-primary">{caseRow.request_id ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Trace ID</div>
            <div className="text-text-primary">{caseRow.trace_id ?? "-"}</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">What Changed</h2>
        <div className="grid gap-3 md:grid-cols-2 text-sm text-text-secondary">
          <div>
            <div className="text-xs uppercase text-text-secondary/70">
              Policy Version (case)
            </div>
            <div className="text-text-primary">{caseRow.policy_version_id ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">
              Policy Hash (case)
            </div>
            <div className="text-text-primary">{caseRow.policy_hash ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">
              Policy Version (run)
            </div>
            <div className="text-text-primary">
              {runRow?.policy_version_id ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">
              Policy Hash (run)
            </div>
            <div className="text-text-primary">{runRow?.policy_hash ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Run Created</div>
            <div className="text-text-primary">
              {formatTimestamp(runRow?.created_at)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Release (case)</div>
            <div className="text-text-primary">{caseRow.release_sha ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-text-secondary/70">Environment</div>
            <div className="text-text-primary">
              {caseRow.environment ?? releaseInfo.environment}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Add Note</h2>
        <textarea
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          className="input-base min-h-[96px]"
          placeholder="Add a support note (no PII)."
        />
        <Button
          onClick={handleAddNote}
          disabled={savingNote || !noteText.trim()}
          variant="secondary"
        >
          {savingNote ? "Saving…" : "Add Note"}
        </Button>
      </GlassCard>

      <GlassCard className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Change Status</h2>
        <SelectField
          label="New status"
          value={statusTo}
          onChange={(event) => setStatusTo(event.target.value as SupportCaseStatus)}
          options={STATUS_OPTIONS.map((opt) => ({
            label: opt.label,
            value: opt.value,
          }))}
        />
        <textarea
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
          className="input-base min-h-[96px]"
          placeholder="Required: explain the status change (no PII)."
        />
        <Button
          onClick={handleChangeStatus}
          disabled={savingStatus || !statusNote.trim()}
          variant="primary"
        >
          {savingStatus ? "Saving…" : "Update Status"}
        </Button>
      </GlassCard>

      <GlassCard className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Event Timeline</h2>
        <div className="space-y-3 text-sm text-text-secondary">
          {detail.events.length === 0 ? (
            <div>No events yet.</div>
          ) : (
            detail.events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase text-text-secondary/70">
                    {event.event_type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatTimestamp(event.created_at)}
                  </span>
                </div>
                {event.status_from || event.status_to ? (
                  <div className="mt-1 text-text-primary">
                    {event.status_from ?? "-"} → {event.status_to ?? "-"}
                  </div>
                ) : null}
                {event.note ? (
                  <div className="mt-2 text-text-primary">{event.note}</div>
                ) : null}
                {event.created_by ? (
                  <div className="mt-2 text-xs text-text-secondary">
                    User: {event.created_by}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}
