"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, GlassCard, InputField, SelectField } from "@/components/ui";
import { resolveOrgId } from "@/lib/deals";
import { getActiveOrgMembershipRole, type OrgMembershipRole } from "@/lib/orgMembership";
import { getReleaseInfo } from "@/lib/o11y/releaseInfo";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  createSupportCase,
  listSupportCases,
  type SupportCaseSeverity,
  type SupportCaseStatus,
  type SupportCaseSummary,
} from "@/lib/supportCases";

const SEARCH_OPTIONS = [
  { label: "Deal ID", value: "deal_id" },
  { label: "Run ID", value: "run_id" },
  { label: "User ID", value: "user_id" },
  { label: "Request ID", value: "request_id" },
  { label: "Trace ID", value: "trace_id" },
] as const;

const SEVERITY_OPTIONS: { label: string; value: SupportCaseSeverity }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const STATUS_OPTIONS: { label: string; value: SupportCaseStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const severityColor: Record<SupportCaseSeverity, "green" | "blue" | "orange" | "red"> =
  {
    low: "green",
    medium: "blue",
    high: "orange",
    critical: "red",
  };

const statusColor: Record<SupportCaseStatus, "green" | "blue" | "orange" | "red"> = {
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

export default function SupportConsolePage() {
  const supabase = getSupabaseClient();
  const releaseInfo = getReleaseInfo();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgMembershipRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<SupportCaseSummary[]>([]);
  const [searchType, setSearchType] = useState<(typeof SEARCH_OPTIONS)[number]["value"]>(
    "deal_id",
  );
  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createSeverity, setCreateSeverity] = useState<SupportCaseSeverity>("low");
  const [createStatus, setCreateStatus] = useState<SupportCaseStatus>("open");
  const [createDealId, setCreateDealId] = useState("");
  const [createRunId, setCreateRunId] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createRequestId, setCreateRequestId] = useState("");
  const [createTraceId, setCreateTraceId] = useState("");
  const [createPolicyVersionId, setCreatePolicyVersionId] = useState("");
  const [createPolicyHash, setCreatePolicyHash] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => role === "owner" || role === "vp" || role === "manager",
    [role],
  );

  const loadOrg = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextOrgId = await resolveOrgId(supabase);
      setOrgId(nextOrgId);
      const nextRole = await getActiveOrgMembershipRole(supabase, nextOrgId);
      setRole(nextRole);
    } catch (err) {
      setError((err as Error).message ?? "Unable to resolve org.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadCases = useCallback(
    async (params?: { queryType?: typeof searchType; query?: string }) => {
      if (!orgId) return;
      setSearching(true);
      setError(null);
      try {
        const response = await listSupportCases({
          orgId,
          queryType: params?.queryType,
          query: params?.query,
        });
        setCases(response.items ?? []);
      } catch (err) {
        setError((err as Error).message ?? "Unable to load cases.");
      } finally {
        setSearching(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (orgId && isAdmin) {
      void loadCases();
    }
  }, [orgId, isAdmin, loadCases]);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      await loadCases();
      return;
    }
    await loadCases({ queryType: searchType, query: searchValue.trim() });
  };

  const handleCreate = async () => {
    if (!orgId) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createSupportCase({
        orgId,
        title: createTitle.trim(),
        severity: createSeverity,
        status: createStatus,
        dealId: createDealId.trim() || null,
        runId: createRunId.trim() || null,
        subjectUserId: createUserId.trim() || null,
        requestId: createRequestId.trim() || null,
        traceId: createTraceId.trim() || null,
        policyVersionId: createPolicyVersionId.trim() || null,
        policyHash: createPolicyHash.trim() || null,
        releaseSha: releaseInfo.releaseSha,
        environment: releaseInfo.environment,
        note: createNote.trim() || null,
      });
      setCreateTitle("");
      setCreateSeverity("low");
      setCreateStatus("open");
      setCreateDealId("");
      setCreateRunId("");
      setCreateUserId("");
      setCreateRequestId("");
      setCreateTraceId("");
      setCreatePolicyVersionId("");
      setCreatePolicyHash("");
      setCreateNote("");
      await loadCases();
    } catch (err) {
      setCreateError((err as Error).message ?? "Unable to create case.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">Support Console</h1>
        <GlassCard className="p-5 text-sm text-text-secondary">Loading…</GlassCard>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">Support Console</h1>
        <GlassCard className="p-5 text-sm text-text-secondary">
          Admin access required. Ask an org owner or VP to grant elevated access.
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Support Console</h1>
          <p className="text-sm text-text-secondary">
            Tenant-safe support cases. Avoid addresses or provider payloads in notes.
          </p>
        </div>
        <div className="text-xs text-text-secondary">
          Current release: {releaseInfo.releaseSha} · {releaseInfo.environment}
        </div>
      </div>

      {error ? (
        <GlassCard className="p-4 text-sm text-red-200/90 border border-red-500/30">
          {error}
        </GlassCard>
      ) : null}

      <GlassCard className="p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Search by"
            value={searchType}
            onChange={(event) =>
              setSearchType(event.target.value as (typeof SEARCH_OPTIONS)[number]["value"])
            }
            options={SEARCH_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
          />
          <InputField
            label="Value"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Paste the exact ID"
          />
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={searching} variant="secondary">
              {searching ? "Searching…" : "Search"}
            </Button>
            <Button
              onClick={() => {
                setSearchValue("");
                void loadCases();
              }}
              disabled={searching}
              variant="ghost"
            >
              Reset
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Create Case</h2>
            <p className="text-xs text-text-secondary">
              Capture IDs only. No addresses or raw provider payloads.
            </p>
          </div>
        </div>
        {createError ? (
          <div className="text-sm text-red-200/90">{createError}</div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <InputField
            label="Title"
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            placeholder="e.g. Buyer questioned policy results"
          />
          <SelectField
            label="Severity"
            value={createSeverity}
            onChange={(event) => setCreateSeverity(event.target.value as SupportCaseSeverity)}
            options={SEVERITY_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
          />
          <SelectField
            label="Status"
            value={createStatus}
            onChange={(event) => setCreateStatus(event.target.value as SupportCaseStatus)}
            options={STATUS_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
          />
          <InputField
            label="Deal ID (optional)"
            value={createDealId}
            onChange={(event) => setCreateDealId(event.target.value)}
          />
          <InputField
            label="Run ID (optional)"
            value={createRunId}
            onChange={(event) => setCreateRunId(event.target.value)}
          />
          <InputField
            label="Subject User ID (optional)"
            value={createUserId}
            onChange={(event) => setCreateUserId(event.target.value)}
          />
          <InputField
            label="Request ID (optional)"
            value={createRequestId}
            onChange={(event) => setCreateRequestId(event.target.value)}
          />
          <InputField
            label="Trace ID (optional)"
            value={createTraceId}
            onChange={(event) => setCreateTraceId(event.target.value)}
          />
          <InputField
            label="Policy Version ID (optional)"
            value={createPolicyVersionId}
            onChange={(event) => setCreatePolicyVersionId(event.target.value)}
          />
          <InputField
            label="Policy Hash (optional)"
            value={createPolicyHash}
            onChange={(event) => setCreatePolicyHash(event.target.value)}
          />
        </div>
        <InputField
          label="Initial Note (optional)"
          value={createNote}
          onChange={(event) => setCreateNote(event.target.value)}
          placeholder="Summary of the issue (no PII)."
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !createTitle.trim()}
          variant="primary"
        >
          {creating ? "Creating…" : "Create Case"}
        </Button>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent Cases</h2>
          <span className="text-xs text-text-secondary">{cases.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-text-secondary">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary/80">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Anchors</th>
              </tr>
            </thead>
            <tbody className="text-text-primary">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-text-secondary">
                    No support cases found for this org.
                  </td>
                </tr>
              ) : (
                cases.map((item) => (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/support/${item.id}`}
                        className="text-accent-blue hover:underline"
                      >
                        {item.title}
                      </Link>
                      <div className="text-xs text-text-secondary">{item.id}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge color={severityColor[item.severity]}>
                        {item.severity}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge color={statusColor[item.status]}>{item.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">{formatTimestamp(item.created_at)}</td>
                    <td className="py-3 pr-4 text-xs text-text-secondary">
                      <div>deal: {item.deal_id ?? "-"}</div>
                      <div>run: {item.run_id ?? "-"}</div>
                      <div>user: {item.subject_user_id ?? "-"}</div>
                      <div>request: {item.request_id ?? "-"}</div>
                      <div>trace: {item.trace_id ?? "-"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
