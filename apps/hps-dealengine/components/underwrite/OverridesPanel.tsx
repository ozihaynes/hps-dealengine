"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui";
import { getSupabase } from "@/lib/supabaseClient";

type PolicyOverrideRow = {
  id: string;
  run_id: string | null;
  posture: string;
  token_key: string;
  justification: string | null;
  status: string;
  new_value: unknown;
  requested_at: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
};

interface OverridesPanelProps {
  orgId: string | null;
  dealId: string | null;
  posture: "conservative" | "base" | "aggressive";
  lastRunId: string | null;
  refreshKey?: number;
}

export function OverridesPanel({
  orgId,
  dealId,
  posture,
  lastRunId,
  refreshKey = 0,
}: OverridesPanelProps) {
  const supabase = getSupabase();
  const [overrides, setOverrides] = useState<PolicyOverrideRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    Record<string, boolean>
  >({});

  // Figure out if current user is manager/vp/owner for this org
  useEffect(() => {
    if (!orgId) {
      setIsManager(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
          setIsManager(false);
          return;
        }

        const { data, error: memError } = await supabase
          .from("memberships")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", userId)
          .limit(1);

        if (memError) {
          throw memError;
        }

        const role = data?.[0]?.role ?? "";
        const normalized = (role || "").toLowerCase();
        setIsManager(["manager", "vp", "owner"].includes(normalized));
      } catch {
        // On error, default to non-manager
        setIsManager(false);
      }
    };

    void fetchRole();
  }, [orgId, supabase]);

  // Fetch overrides for this deal/posture/run
  useEffect(() => {
    if (!orgId || !dealId) {
      return;
    }

    const fetchOverrides = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("policy_overrides")
          .select(
            "id, run_id, posture, token_key, justification, status, new_value, requested_at, approved_at, approved_by",
          )
          .eq("org_id", orgId)
          .eq("posture", posture)
          .order("requested_at", { ascending: false })
          .limit(10);

        if (lastRunId) {
          query = query.eq("run_id", lastRunId);
        } else {
          query = query.is("run_id", null);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) {
          throw fetchError;
        }

        setOverrides((data ?? []) as PolicyOverrideRow[]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : JSON.stringify(err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOverrides();
  }, [dealId, lastRunId, orgId, posture, supabase, refreshKey]);

  const handleDecision = async (
    overrideId: string,
    action: "approve" | "reject",
  ) => {
    setError(null);
    setActionLoading((prev) => ({ ...prev, [overrideId]: true }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Not authenticated.");
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("Supabase URL not configured.");
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/v1-policy-override-approve`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          overrideId,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Approve/reject failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as {
        ok?: boolean;
        overrideId?: string;
        status?: string;
        approvedAt?: string;
        approvedBy?: string;
        error?: string;
      };

      if (!json.ok) {
        throw new Error(json.error || "Approve/reject failed");
      }

      setOverrides((prev) =>
        prev.map((ovr) =>
          ovr.id === overrideId
            ? {
                ...ovr,
                status: json.status ?? ovr.status,
                approved_at: json.approvedAt ?? ovr.approved_at,
                approved_by: json.approvedBy ?? ovr.approved_by,
              }
            : ovr,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      setError(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [overrideId]: false }));
    }
  };

  if (!orgId || !dealId) {
    return null;
  }

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Overrides for this run
          </h3>
          <p className="text-xs text-text-secondary">
            {lastRunId
              ? "Overrides tied to this run."
              : "Recent overrides for this posture (no run selected)."}
          </p>
        </div>
        {isLoading && (
          <div className="text-[11px] text-text-secondary">
            Loading overrides...
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

      {!isLoading && !error && overrides.length === 0 && (
        <div className="text-xs text-text-secondary">
          No overrides found for this {lastRunId ? "run" : "posture"} yet.
        </div>
      )}

      <div className="space-y-2">
        {overrides.map((ovr) => {
          const isPending = ovr.status === "pending";
          const isRowLoading = !!actionLoading[ovr.id];

          return (
            <div
              key={ovr.id}
              className="rounded border border-border-subtle/70 bg-surface-elevated/60 px-3 py-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-text-primary">
                  {ovr.token_key}
                </div>
                <div className="flex items-center gap-2">
                  <span className={badgeClass(ovr.status)}>
                    {ovr.status}
                  </span>
                  {isPending && isManager && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-100"
                        disabled={isRowLoading}
                        onClick={() =>
                          void handleDecision(ovr.id, "approve")
                        }
                      >
                        {isRowLoading ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-100"
                        disabled={isRowLoading}
                        onClick={() =>
                          void handleDecision(ovr.id, "reject")
                        }
                      >
                        {isRowLoading ? "…" : "Reject"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-text-secondary">
                Requested: {formatRequestedAt(ovr.requested_at)}
              </div>
              <div className="text-text-secondary">
                Justification: {ovr.justification || "—"}
              </div>
              {ovr.approved_at && (
                <div className="text-[11px] text-text-tertiary">
                  {ovr.status === "approved" ? "Approved" : "Decision"} at:{" "}
                  {formatRequestedAt(ovr.approved_at)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function badgeClass(status: string): string {
  const base =
    "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide border";
  switch (status) {
    case "approved":
      return `${base} border-emerald-500/50 bg-emerald-500/10 text-emerald-200`;
    case "rejected":
      return `${base} border-red-500/50 bg-red-500/10 text-red-200`;
    default:
      return `${base} border-amber-500/50 bg-amber-500/10 text-amber-200`;
  }
}

function formatRequestedAt(ts: string | null): string {
  if (!ts) return "—";
  const date = new Date(ts);
  return date.toLocaleString();
}

export default OverridesPanel;
