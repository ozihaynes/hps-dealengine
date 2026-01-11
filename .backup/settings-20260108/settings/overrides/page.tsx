"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GlassCard, Button } from "@/components/ui";
import {
  approvePolicyOverride,
  listPolicyOverridesForDealOrRun,
  type PolicyOverride,
} from "@/lib/policyOverrides";
import { getSupabase } from "@/lib/supabaseClient";
import { useDealSession } from "@/lib/dealSessionContext";
import { canEditGoverned } from "@/constants/governedTokens";

export default function OverridesPage() {
  const supabase = getSupabase();
  const { dbDeal, membershipRole } = useDealSession();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<PolicyOverride[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Resolve org/role from selected deal or first membership
  useEffect(() => {
    const loadOrg = async () => {
      setError(null);
      if (dbDeal?.org_id) {
        setOrgId(dbDeal.org_id);
      }
      const { data, error: memError } = await supabase
        .from("memberships")
        .select("org_id, role")
        .limit(1)
        .maybeSingle();
      if (memError) {
        setError(memError.message);
        return;
      }
      if (data?.org_id && !orgId) {
        setOrgId(data.org_id);
      }
    };
    void loadOrg();
  }, [dbDeal?.org_id, orgId, supabase]);

  useEffect(() => {
    const loadOverrides = async () => {
      if (!orgId) return;
      setStatus("loading");
      try {
        const rows = await listPolicyOverridesForDealOrRun({
          orgId,
        });
        setOverrides(rows.sort((a, b) => {
          const at = Date.parse(a.requestedAt ?? "");
          const bt = Date.parse(b.requestedAt ?? "");
          return bt - at;
        }));
        setStatus("idle");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load overrides");
        setStatus("error");
      }
    };
    void loadOverrides();
  }, [orgId]);

  const canApprove = useMemo(
    () => canEditGoverned(membershipRole),
    [membershipRole],
  );

  const handleDecision = async (
    id: string,
    decision: "approved" | "rejected",
  ) => {
    try {
      const updated = await approvePolicyOverride({ overrideId: id, decision });
      setOverrides((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update override");
    }
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      <div className="lg:col-span-4">
        <GlassCard className="p-4 md:p-5 space-y-2 lg:self-start">
        <h1 className="text-2xl font-semibold text-text-primary">Policy Overrides</h1>
        <p className="text-sm text-text-secondary">
          Pending and historical override requests for your org. Managers/VP/Owners can approve or reject.
        </p>
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        </GlassCard>
      </div>

      <div className="lg:col-span-8">
        <GlassCard className="p-3 md:p-4 lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="label-xs uppercase">Overrides</h2>
          <span className="text-[11px] text-text-secondary">
            {overrides.length} row{overrides.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-[11px]">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Token</th>
                <th className="px-2 py-1 text-left">Old → New</th>
                <th className="px-2 py-1 text-left">Posture</th>
                <th className="px-2 py-1 text-left">Requested By</th>
                <th className="px-2 py-1 text-left">Justification</th>
                <th className="px-2 py-1 text-left">Requested At</th>
                {canApprove && <th className="px-2 py-1 text-left">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {overrides.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/30 last:border-b-0"
                >
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
                  <td className="px-2 py-1 align-top font-mono">{row.tokenKey}</td>
                  <td className="px-2 py-1 align-top">
                    <div className="font-mono text-[10px] text-text-secondary">Old</div>
                    <div className="rounded bg-black/40 p-1 font-mono text-[11px]">
                      {JSON.stringify(row.oldValue)}
                    </div>
                    <div className="font-mono text-[10px] text-text-secondary mt-1">New</div>
                    <div className="rounded bg-black/40 p-1 font-mono text-[11px]">
                      {JSON.stringify(row.newValue)}
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top">{row.posture}</td>
                  <td className="px-2 py-1 align-top font-mono">
                    {row.requestedBy ?? "-"}
                  </td>
                  <td className="px-2 py-1 align-top text-text-secondary">
                    {row.justification ?? "-"}
                  </td>
                  <td className="px-2 py-1 align-top text-text-secondary">
                    {row.requestedAt
                      ? new Date(row.requestedAt).toLocaleString()
                      : "-"}
                  </td>
                  {canApprove && (
                    <td className="px-2 py-1 align-top">
                      {row.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => void handleDecision(row.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => void handleDecision(row.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-secondary">Completed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {overrides.length === 0 && (
                <tr>
                  <td
                    colSpan={canApprove ? 7 : 6}
                    className="px-2 py-3 text-center text-text-secondary"
                  >
                    {status === "loading" ? "Loading overrides..." : "No overrides yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </GlassCard>
      </div>
    </div>
  );
}
