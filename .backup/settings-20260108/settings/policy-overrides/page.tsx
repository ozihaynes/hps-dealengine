"use client";

import { useEffect, useState } from "react";

import { Button, GlassCard } from "@/components/ui";
import { approvePolicyOverride, type PolicyOverride } from "@/lib/policyOverrides";
import { getSupabase } from "@/lib/supabaseClient";
import { useDealSession } from "@/lib/dealSessionContext";

export default function PolicyOverridesSettingsPage() {
  const supabase = getSupabase();
  const [overrides, setOverrides] = useState<PolicyOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { membershipRole } = useDealSession();

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch all pending overrides for the org by selecting by deal_id via RLS.
    supabase
      .from("policy_overrides")
      .select(
        "id, org_id, deal_id, run_id, posture, token_key, new_value, justification, status, requested_by, requested_at, approved_by, approved_at",
      )
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .then(({ data, error: dbError }: { data: any[] | null; error: any }) => {
        if (dbError) {
          setError(dbError.message);
          setOverrides([]);
          return;
        }

        setOverrides(
          (data ?? []).map(
            (row: any) =>
              ({
                id: row.id,
                orgId: row.org_id,
                dealId: row.deal_id ?? null,
                runId: row.run_id ?? null,
                posture: row.posture,
                tokenKey: row.token_key,
                newValue: row.new_value,
                justification: row.justification ?? null,
                status: row.status,
                requestedBy: row.requested_by ?? null,
                requestedAt: row.requested_at ?? null,
                approvedBy: row.approved_by ?? null,
                approvedAt: row.approved_at ?? null,
              }) as PolicyOverride,
          ),
        );
      })
      .catch((err: any) => {
        setError(err?.message ?? "Unable to load overrides");
        setOverrides([]);
      })
      .finally(() => setLoading(false));
  }, [supabase]);

  const handleDecision = async (
    id: string,
    decision: "approved" | "rejected",
  ) => {
    setError(null);
    try {
      const updated = await approvePolicyOverride({ overrideId: id, decision });
      setOverrides((prev) =>
        prev
          .map((o) => (o.id === id ? updated : o))
          .filter((o) => o.status === "pending"),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update override";
      setError(msg);
    }
  };

  const roleLower = (membershipRole ?? "").toLowerCase();
  const canApprove = ["manager", "vp", "owner"].includes(roleLower);

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      <div className="space-y-6 lg:col-span-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-text-primary">Policy Overrides</h1>
          <p className="text-sm text-text-secondary">
            Review and act on policy override requests for your org.
          </p>
        </header>

        {!canApprove && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            You do not have approval permissions. Visible for reference only.
          </p>
        )}
      </div>

      <div className="lg:col-span-8">
        <GlassCard className="p-4 border border-white/5 bg-surface-elevated/60 lg:self-start">
          {error && (
            <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-text-secondary">Loading overrides...</p>
          ) : overrides.length === 0 ? (
            <p className="text-sm text-text-secondary">No pending overrides.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="px-2 py-1 text-left">Token</th>
                    <th className="px-2 py-1 text-left">Posture</th>
                    <th className="px-2 py-1 text-left">Requested</th>
                    <th className="px-2 py-1 text-left">Justification</th>
                    <th className="px-2 py-1 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-border-subtle/40 last:border-b-0"
                    >
                      <td className="px-2 py-1 align-top font-mono">{o.tokenKey}</td>
                      <td className="px-2 py-1 align-top">{o.posture}</td>
                      <td className="px-2 py-1 align-top text-text-secondary">
                        {o.requestedAt ? new Date(o.requestedAt).toLocaleString() : "-"}
                        <div className="text-[11px] text-text-tertiary">
                          by {o.requestedBy ?? "unknown"}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-top text-text-secondary">
                        <div className="mb-1 text-text-primary">{o.justification ?? "-"}</div>
                        <div className="rounded bg-black/40 p-2 font-mono text-[11px]">
                          {JSON.stringify(o.newValue)}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-top">
                        {canApprove ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => void handleDecision(o.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void handleDecision(o.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-secondary">View only</span>
                        )}
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
  );
}
